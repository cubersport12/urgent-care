"""Генерация сертификатов из шаблона backend/data/cert_origin.png.

Координаты сняты с макета 1491x1055 и хранятся долями размера — при замене
шаблона на другой размер отрисовка масштабируется. Результат — PNG в S3
(public/certificates/{number:06d}.png), запись в таблице certificates.
"""
from __future__ import annotations

import io
from datetime import datetime, timezone
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.certificate import Certificate
from app.models.user import User
from app.utils.s3 import get_s3_client

_DATA_DIR = Path(__file__).resolve().parents[2] / "data"
_TEMPLATE_PATH = _DATA_DIR / "cert_origin.png"
# Размер макета, в котором сняты координаты
_DESIGN_SIZE = (1491.0, 1055.0)
_NAVY = (26, 42, 110)

_FONT_REGULAR_CANDIDATES = (
    _DATA_DIR / "fonts" / "DejaVuSans.ttf",
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    Path("C:/Windows/Fonts/arial.ttf"),
)
_FONT_BOLD_CANDIDATES = (
    _DATA_DIR / "fonts" / "DejaVuSans-Bold.ttf",
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    Path("C:/Windows/Fonts/arialbd.ttf"),
)


def _font(candidates: tuple[Path, ...], size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size)


def _px(design_value: float, actual: float) -> int:
    return round(design_value / _DESIGN_SIZE[0 if actual == _DESIGN_SIZE[0] else 1] * actual)


def _centered(draw: ImageDraw.ImageDraw, center: tuple[float, float], label: str, font) -> None:
    draw.text(center, label, font=font, fill=_NAVY, anchor="mm")


def _render(full_name: str, number: int, issued: datetime, verify_url: str) -> bytes:
    img = Image.open(_TEMPLATE_PATH).convert("RGB")
    w, h = img.size
    draw = ImageDraw.Draw(img)

    # ФИО над линией под «ВЫДАН:»; длинное имя — уменьшаем кегль
    size = round(52 / _DESIGN_SIZE[0] * w)
    name_font = _font(_FONT_BOLD_CANDIDATES, size)
    max_width = 0.74 * w
    while size > 24 and draw.textlength(full_name, font=name_font) > max_width:
        size -= 2
        name_font = _font(_FONT_BOLD_CANDIDATES, size)
    _centered(draw, (0.5 * w, 0.552 * h), full_name, name_font)

    value_font = _font(_FONT_REGULAR_CANDIDATES, round(30 / _DESIGN_SIZE[0] * w))
    _centered(draw, (0.289 * w, 0.828 * h), issued.strftime("%d.%m.%Y"), value_font)
    _centered(draw, (0.477 * w, 0.828 * h), f"TD-{issued.year}-{number:06d}", value_font)

    # QR в готовую рамку слева
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0)
    qr.add_data(verify_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    box_w, box_h = round(0.072 * w), round(0.097 * h)
    qr_img = qr_img.resize((box_w, box_h), Image.Resampling.NEAREST)
    img.paste(qr_img, (round(0.0745 * w), round(0.706 * h)))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


async def _emit_issued(cert: Certificate) -> None:
    from app.realtime.notifications_hub import notification_hub

    year = cert.issued_at.year if cert.issued_at else datetime.now(timezone.utc).year
    await notification_hub.send_user(
        cert.user_id,
        {
            "type": "certificate_issued",
            "data": {
                "number": cert.number,
                "numberLabel": f"TD-{year}-{cert.number:06d}",
                "fullName": cert.full_name,
                "filePath": cert.file_path,
            },
        },
    )


async def issue_certificate(
    db: AsyncSession,
    user: User,
    display_name: str | None = None,
) -> tuple[Certificate, bool]:
    """Один сертификат на пользователя: повторная выдача возвращает существующий,
    а при изменившемся имени перерисовывает картинку под тем же номером.
    Второе значение — был ли сертификат создан/перегенерирован прямо сейчас."""
    printed_name = (display_name or user.full_name or user.email or "").strip() or "—"
    existing = (
        await db.execute(
            select(Certificate)
            .where(Certificate.user_id == user.id)
            .order_by(Certificate.number.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if existing and existing.full_name == printed_name:
        return existing, False

    issued = datetime.now(timezone.utc)
    from app.core.config import settings

    if existing:
        # Имя изменилось — перерисовываем под прежним номером
        verify_url = f"{settings.api_public_base_url.rstrip('/')}/api/v1/certificates/{existing.number}"
        png = _render(printed_name, existing.number, issued, verify_url)
        s3 = get_s3_client()
        await s3.ensure_bucket()
        await s3.upload_bytes(data=png, key=existing.file_path, content_type="image/png")
        existing.full_name = printed_name[:200]
        await db.flush()
        await db.refresh(existing)
        await _emit_issued(existing)
        return existing, True

    number = (
        await db.execute(text("SELECT nextval('certificates_number_seq')"))
    ).scalar_one()
    key = f"public/certificates/{number:06d}.png"
    verify_url = f"{settings.api_public_base_url.rstrip('/')}/api/v1/certificates/{number}"
    png = _render(printed_name, number, issued, verify_url)

    s3 = get_s3_client()
    await s3.ensure_bucket()
    await s3.upload_bytes(data=png, key=key, content_type="image/png")

    row = Certificate(
        number=number,
        user_id=user.id,
        full_name=printed_name[:200],
        file_path=key,
        issued_at=issued,
    )
    db.add(row)
    await db.flush()
    await db.refresh(row)
    await _emit_issued(row)
    return row, True
    return row
