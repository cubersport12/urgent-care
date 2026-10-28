"""The folder setting survives API create, update, and subsequent reads."""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from types import SimpleNamespace

from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.api.deps import get_current_user, get_db
from app.api.v1 import folders
from app.main import create_app


def test_migration_defaults_existing_and_new_folders_to_false(monkeypatch):
    path = Path(__file__).parents[1] / "alembic" / "versions" / "027_folder_random_open.py"
    spec = spec_from_file_location("folder_random_open_migration", path)
    assert spec and spec.loader
    migration = module_from_spec(spec)
    spec.loader.exec_module(migration)

    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE folders (id TEXT PRIMARY KEY)"))
        connection.execute(text("INSERT INTO folders (id) VALUES ('old')"))
        monkeypatch.setattr(migration, "op", Operations(MigrationContext.configure(connection)))
        migration.upgrade()
        connection.execute(text("INSERT INTO folders (id) VALUES ('new')"))
        assert connection.execute(text("SELECT show_random_open FROM folders ORDER BY id")).scalars().all() == [0, 0]
        migration.downgrade()
        assert [row[1] for row in connection.execute(text("PRAGMA table_info(folders)"))] == ["id"]


def test_folder_random_open_round_trip(monkeypatch):
    items = {}

    class FakeFolderRepository:
        def __init__(self, _db):
            pass

        async def create(self, id, **fields):
            item = SimpleNamespace(id=id, **fields)
            items[id] = item
            return item

        async def update(self, item_id, **fields):
            item = items.get(item_id)
            if item:
                for key, value in fields.items():
                    setattr(item, key, value)
            return item

        async def get(self, item_id):
            return items.get(item_id)

        async def list_by_parent(self, parent_id):
            return [item for item in items.values() if item.parent_id == parent_id]

    async def no_default_tariff(_db, fields):
        return fields

    async def visible_list(_db, _user, values, **_kwargs):
        return [(item, None) for item in values]

    async def allow_access(*_args, **_kwargs):
        return None

    monkeypatch.setattr(folders, "FolderRepository", FakeFolderRepository)
    monkeypatch.setattr(folders, "with_default_tariff", no_default_tariff)
    monkeypatch.setattr(folders, "annotate_content_list", visible_list)
    monkeypatch.setattr(folders, "assert_content_visible", allow_access)
    app = create_app()
    app.dependency_overrides[get_db] = lambda: None
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(role="admin")
    client = TestClient(app)

    created = client.post("/api/v1/folders", json={"id": "f1", "name": "Folder"})
    assert created.status_code == 201
    assert created.json()["showRandomOpen"] is False
    enabled = client.post("/api/v1/folders", json={"id": "f2", "name": "Enabled", "showRandomOpen": True})
    assert enabled.status_code == 201
    assert enabled.json()["showRandomOpen"] is True
    assert client.patch("/api/v1/folders/f1", json={"showRandomOpen": True}).json()["showRandomOpen"] is True
    assert client.get("/api/v1/folders/f1").json()["showRandomOpen"] is True
    assert client.get("/api/v1/folders").json()[0]["showRandomOpen"] is True
    assert client.patch("/api/v1/folders/f1", json={"name": "Renamed"}).json()["showRandomOpen"] is True
    assert client.patch("/api/v1/folders/f1", json={"showRandomOpen": False}).json()["showRandomOpen"] is False
    assert client.patch("/api/v1/folders/f1", json={"showRandomOpen": None}).status_code == 422

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(role="user")
    assert client.patch("/api/v1/folders/f1", json={"showRandomOpen": True}).status_code == 403
