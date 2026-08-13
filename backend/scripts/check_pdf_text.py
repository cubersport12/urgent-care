"""Self-check: PDF bytes → extractable text for embeddings."""
import io
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pypdf import PdfWriter

from app.ai.embeddings import build_article_embedding_text, truncate_for_embedding
from app.ai.pdf_text import extract_text_from_pdf_bytes

writer = PdfWriter()
writer.add_blank_page(width=200, height=200)
buf = io.BytesIO()
writer.write(buf)
text = extract_text_from_pdf_bytes(buf.getvalue())
assert isinstance(text, str)

article = SimpleNamespace(name="Инфаркт миокарда", parent_id=None)
out = build_article_embedding_text(article, "Кардиология", "Клиника и диагностика ОКС")
assert "Инфаркт миокарда" in out
assert "Кардиология" in out
assert "ОКС" in out
assert len(truncate_for_embedding("x" * 5000)) == 2000

print("ok: pdf text helpers")
