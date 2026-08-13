"""Self-check: query text hash is stable (cache key)."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.article_embeddings import query_text_hash

a = query_text_hash("Кардиология / ОКС | Что делать при боли?")
b = query_text_hash("Кардиология / ОКС | Что делать при боли?")
c = query_text_hash("other")
assert a == b
assert a != c
assert len(a) == 64

print("ok: embedding cache key")
