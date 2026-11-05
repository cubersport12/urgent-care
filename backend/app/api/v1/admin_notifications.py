"""Administrative notification campaigns."""
from datetime import UTC, datetime
from io import BytesIO
from typing import Annotated
from uuid import UUID, uuid4

from croniter import croniter
from fastapi import (
    APIRouter,
    Depends,
    File,
    Header,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from PIL import Image, UnidentifiedImageError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_db
from app.models.notification_campaign import (
    NotificationDispatch,
    NotificationSchedule,
    NotificationTemplate,
)
from app.models.user import User
from app.schemas.notification_campaigns import (
    CampaignInput,
    DispatchInput,
    DispatchOut,
    ScheduleOut,
    TemplateOut,
)
from app.services.notification_campaigns import create_dispatch
from app.utils.s3 import get_s3_client

router = APIRouter(prefix="/admin/notifications", tags=["admin-notifications"])
Admin = Annotated[User, Depends(get_current_admin)]
Db = Annotated[AsyncSession, Depends(get_db)]


@router.post("/icons", status_code=status.HTTP_201_CREATED)
async def upload_icon(_admin: Admin, file: Annotated[UploadFile, File()]) -> dict[str, str]:
    data = await file.read(2 * 1024 * 1024 + 1)
    if len(data) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Размер изображения не должен превышать 2 МиБ")
    try:
        with Image.open(BytesIO(data)) as image:
            if image.format not in ("PNG", "JPEG", "WEBP") or image.width > 1024 or image.height > 1024:
                raise ValueError("Unsupported image")
            image.seek(0)
            output = BytesIO()
            image.convert("RGBA").save(output, format="PNG")
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Нужно изображение PNG, JPEG или WebP размером до 1024 × 1024") from exc
    key = f"public/notifications/{uuid4()}.png"
    try:
        await get_s3_client().upload_bytes(data=output.getvalue(), key=key, content_type="image/png")
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Хранилище файлов недоступно") from exc
    return {"path": key}


@router.get("/templates", response_model=list[TemplateOut])
async def list_templates(db: Db, _admin: Admin) -> list[NotificationTemplate]:
    return list((await db.scalars(select(NotificationTemplate).order_by(NotificationTemplate.created_at.desc()))).all())


@router.post("/templates", response_model=TemplateOut, status_code=status.HTTP_201_CREATED)
async def create_template(payload: CampaignInput, db: Db, _admin: Admin) -> NotificationTemplate:
    if payload.icon_path and not await get_s3_client().object_exists(key=payload.icon_path):
        raise HTTPException(status_code=400, detail="Иконка не найдена")
    row = NotificationTemplate(**payload.model_dump(mode="json"))
    db.add(row)
    await db.flush()
    await db.refresh(row)
    return row


@router.put("/templates/{template_id}", response_model=TemplateOut)
async def update_template(template_id: UUID, payload: CampaignInput, db: Db, _admin: Admin) -> NotificationTemplate:
    row = await db.get(NotificationTemplate, template_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Шаблон не найден")
    if payload.icon_path and not await get_s3_client().object_exists(key=payload.icon_path):
        raise HTTPException(status_code=400, detail="Иконка не найдена")
    for key, value in payload.model_dump(mode="json").items():
        setattr(row, key, value)
    await db.flush()
    await db.refresh(row)
    return row


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(template_id: UUID, db: Db, _admin: Admin) -> Response:
    row = await db.get(NotificationTemplate, template_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Шаблон не найден")
    await db.delete(row)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/send", response_model=DispatchOut, status_code=status.HTTP_201_CREATED)
async def send_campaign(payload: DispatchInput, db: Db, admin: Admin, idempotency_key: Annotated[UUID, Header(alias="Idempotency-Key")]) -> NotificationDispatch:
    key = f"{admin.id}:{idempotency_key}"
    # Serialize requests with the same key before looking up the previous result.
    await db.execute(select(func.pg_advisory_xact_lock(func.hashtextextended(key, 0))))
    existing = await db.scalar(select(NotificationDispatch).where(NotificationDispatch.idempotency_key == key))
    if existing:
        return existing
    if payload.icon_path and not await get_s3_client().object_exists(key=payload.icon_path):
        raise HTTPException(status_code=400, detail="Иконка не найдена")
    if payload.template_id and not await db.get(NotificationTemplate, payload.template_id):
        raise HTTPException(status_code=404, detail="Шаблон не найден")
    row = await create_dispatch(db, title=payload.title, body=payload.body, icon_path=payload.icon_path,
                                audience=payload.audience, user_ids=payload.user_ids, source="manual",
                                template_id=payload.template_id, idempotency_key=key)
    await db.refresh(row)
    return row


@router.post("/schedules", response_model=ScheduleOut, status_code=status.HTTP_201_CREATED)
async def create_schedule(payload: DispatchInput, db: Db, _admin: Admin) -> NotificationSchedule:
    if not payload.cron:
        raise HTTPException(status_code=400, detail="Укажите расписание cron")
    if payload.icon_path and not await get_s3_client().object_exists(key=payload.icon_path):
        raise HTTPException(status_code=400, detail="Иконка не найдена")
    if payload.template_id and not await db.get(NotificationTemplate, payload.template_id):
        raise HTTPException(status_code=404, detail="Шаблон не найден")
    row = NotificationSchedule(template_id=payload.template_id, snapshot=payload.model_dump(mode="json"),
                               cron=payload.cron, next_run_at=croniter(payload.cron, datetime.now(UTC)).get_next(datetime))
    db.add(row)
    await db.flush()
    await db.refresh(row)
    return row


@router.get("/schedules", response_model=list[ScheduleOut])
async def list_schedules(db: Db, _admin: Admin) -> list[NotificationSchedule]:
    return list((await db.scalars(select(NotificationSchedule).where(NotificationSchedule.active.is_(True)).order_by(NotificationSchedule.next_run_at))).all())


@router.post("/schedules/{schedule_id}/stop", response_model=ScheduleOut)
async def stop_schedule(schedule_id: UUID, db: Db, _admin: Admin) -> NotificationSchedule:
    row = await db.scalar(select(NotificationSchedule).where(NotificationSchedule.id == schedule_id).with_for_update())
    if row is None:
        raise HTTPException(status_code=404, detail="Расписание не найдено")
    row.active = False
    await db.flush()
    return row


@router.get("/history", response_model=list[DispatchOut])
async def history(db: Db, _admin: Admin, offset: int = Query(0, ge=0), limit: int = Query(30, ge=1, le=100)) -> list[NotificationDispatch]:
    return list((await db.scalars(select(NotificationDispatch).order_by(NotificationDispatch.created_at.desc(), NotificationDispatch.id.desc()).offset(offset).limit(limit))).all())


@router.post("/history/{dispatch_id}/repeat", response_model=DispatchOut, status_code=status.HTTP_201_CREATED)
async def repeat(dispatch_id: UUID, db: Db, admin: Admin, idempotency_key: Annotated[UUID, Header(alias="Idempotency-Key")]) -> NotificationDispatch:
    key = f"{admin.id}:{idempotency_key}"
    await db.execute(select(func.pg_advisory_xact_lock(func.hashtextextended(key, 0))))
    existing = await db.scalar(select(NotificationDispatch).where(NotificationDispatch.idempotency_key == key))
    if existing:
        return existing
    original = await db.get(NotificationDispatch, dispatch_id)
    if not original:
        raise HTTPException(status_code=404, detail="Рассылка не найдена")
    row = await create_dispatch(db, title=original.title, body=original.body, icon_path=original.icon_path,
                                audience=original.audience, user_ids=[], source="repeat", original_id=original.id,
                                idempotency_key=key)
    await db.refresh(row)
    return row
