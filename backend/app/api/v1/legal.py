"""Normative documents (offer, PDn policy, consent, cookies).

Публичные эндпоинты без авторизации: юридические документы должны быть
доступны пользователю до регистрации (ссылка из чекбокса согласия).
Файлы лежат в S3 под фиксированными ключами `public/legal/{doc_id}.pdf`
и загружаются через конструктор.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict

from app.utils.s3 import get_s3_client

LEGAL_DOCUMENTS: list[tuple[str, str]] = [
    ("offer", "Пользовательское соглашение (оферта)"),
    ("pdn", "Политика обработки персональных данных"),
    ("consent", "Согласие на обработку персональных данных"),
    ("cookies", "Правила использования cookie"),
]

_DOCUMENT_IDS = {doc_id for doc_id, _title in LEGAL_DOCUMENTS}


class LegalDocumentOut(BaseModel):
    model_config = ConfigDict(ser_json_by_alias=True)

    id: str
    title: str
    available: bool = False


def _document_key(doc_id: str) -> str:
    return f"public/legal/{doc_id}.pdf"


router = APIRouter(prefix="/legal", tags=["legal"])


@router.get("/documents", response_model=list[LegalDocumentOut])
async def list_legal_documents() -> list[LegalDocumentOut]:
    s3 = get_s3_client()
    out: list[LegalDocumentOut] = []
    for doc_id, title in LEGAL_DOCUMENTS:
        available = await s3.object_exists(key=_document_key(doc_id))
        out.append(LegalDocumentOut(id=doc_id, title=title, available=available))
    return out


@router.get("/documents/{doc_id}/file")
async def get_legal_document_file(doc_id: str) -> Response:
    if doc_id not in _DOCUMENT_IDS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    s3 = get_s3_client()
    try:
        body, content_type = await s3.get_object(key=_document_key(doc_id))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not uploaded"
        )
    return Response(
        content=body,
        media_type=content_type or "application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{doc_id}.pdf"',
            "Cache-Control": "public, max-age=300",
        },
    )
