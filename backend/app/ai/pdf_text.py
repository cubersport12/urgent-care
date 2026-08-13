"""Extract plain text from article PDFs in S3 for embeddings."""
from __future__ import annotations

import io
import logging
import re

from pypdf import PdfReader

from app.utils.s3 import get_s3_client

log = logging.getLogger(__name__)

_WS = re.compile(r"\s+")


def extract_text_from_pdf_bytes(data: bytes, *, max_pages: int = 40) -> str:
    reader = PdfReader(io.BytesIO(data))
    parts: list[str] = []
    for page in reader.pages[:max_pages]:
        try:
            t = page.extract_text() or ""
        except Exception:  # noqa: BLE001 — some pages are broken images
            t = ""
        if t.strip():
            parts.append(t)
    return _WS.sub(" ", " ".join(parts)).strip()


async def load_article_pdf_text(article_id: str) -> str:
    """Fetch public/{article_id}.pdf from S3; empty string if missing/unreadable."""
    key = f"public/{article_id}.pdf"
    try:
        body, _ = await get_s3_client().get_object(key=key)
    except Exception as e:  # noqa: BLE001
        log.debug("pdf missing for %s: %s", article_id, e)
        return ""
    try:
        return extract_text_from_pdf_bytes(body)
    except Exception as e:  # noqa: BLE001
        log.warning("pdf extract failed id=%s: %s", article_id, e)
        return ""
