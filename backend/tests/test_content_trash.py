from types import SimpleNamespace
from unittest.mock import AsyncMock

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.api.deps import get_current_admin, get_db
from app.api.v1 import content_trash


def test_folder_reasons_resolve_roots_missing_ancestors_and_cycles():
    reasons = content_trash.folder_reasons({
        "root": None, "child": "root", "orphan": "deleted",
        "nested": "orphan", "cycle_a": "cycle_b", "cycle_b": "cycle_a",
        "cycle_child": "cycle_a", "self": "self",
    })
    assert reasons == {
        "root": None, "child": None, "orphan": "missing_parent",
        "nested": "missing_parent", "cycle_a": "cycle", "cycle_b": "cycle",
        "cycle_child": "cycle", "self": "cycle",
    }


async def test_snapshot_includes_only_inaccessible_content():
    folders = [SimpleNamespace(id="root", name="Root", parent_id=None),
               SimpleNamespace(id="lost", name="Lost", parent_id="deleted"),
               SimpleNamespace(id="nested", name="Nested", parent_id="lost")]
    article = SimpleNamespace(id="a", name="Article", parent_id="nested")
    root_test = SimpleNamespace(id="t", name="Test", parent_id=None)
    rescue = SimpleNamespace(id="r", name="Rescue", parent_id="missing")
    results = [folders, [article], [root_test], [rescue]]
    db = SimpleNamespace(execute=AsyncMock(side_effect=[SimpleNamespace(scalars=lambda rows=rows: rows) for rows in results]))
    _, reasons, items = await content_trash.snapshot(db)
    assert reasons["root"] is None
    assert set(items) == {("article", "a"), ("rescue", "r")}


def test_trash_routes_recheck_before_delete_and_restore(monkeypatch):
    app = FastAPI()
    app.include_router(content_trash.router)
    db = SimpleNamespace(delete=AsyncMock(), flush=AsyncMock())
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_admin] = lambda: object()
    item = SimpleNamespace(id="item", name="Тест", parent_id="deleted")
    snapshot = AsyncMock(return_value=([], {"ok": None, "bad": "cycle"}, {("test", "item"): (item, "missing_parent")}))
    monkeypatch.setattr(content_trash, "snapshot", snapshot)
    client = TestClient(app)

    result = client.post('/content-trash/delete', json={"items": [{"kind": "test", "id": "other"}]})
    assert result.status_code == 409
    db.delete.assert_not_awaited()
    result = client.post('/content-trash/restore', json={"kind": "test", "id": "item", "targetParentId": "bad"})
    assert result.status_code == 409
    assert item.parent_id == "deleted"
    result = client.post('/content-trash/restore', json={"kind": "test", "id": "item", "targetParentId": "ok"})
    assert result.status_code == 200
    assert item.parent_id == "ok"
    result = client.post('/content-trash/delete', json={"items": [{"kind": "test", "id": "item"}]})
    assert result.status_code == 200
    db.delete.assert_awaited_once_with(item)
    assert all(call.kwargs["lock"] for call in snapshot.await_args_list)


def test_trash_requires_admin():
    app = FastAPI()
    app.include_router(content_trash.router)
    app.dependency_overrides[get_db] = lambda: object()
    def reject():
        raise HTTPException(403, "Admin role required")
    app.dependency_overrides[get_current_admin] = reject
    client = TestClient(app)
    assert client.get('/content-trash').status_code == 403
    assert client.post('/content-trash/delete', json={"items": [{"kind": "test", "id": "x"}]}).status_code == 403
