"""Folder images survive API serialization, clearing, and access stubs."""
from types import SimpleNamespace

from app.api.v1._content_access import content_out
from app.api.v1._content_helpers import dump_create, dump_update
from app.schemas.content import FolderCreate, FolderOut, FolderUpdate


def test_folder_image_fields():
    create = FolderCreate.model_validate({"name": "Folder", "iconPath": "public/folders/icon.png", "backgroundPath": "public/folders/bg.png"})
    fields = dump_create(create)
    assert fields["icon_path"] == "public/folders/icon.png"
    assert fields["background_path"] == "public/folders/bg.png"
    item = SimpleNamespace(id="f1", **fields)
    for lock in (None, "tariff", "reward"):
        data = content_out(item, FolderOut, lock).model_dump(by_alias=True)
        assert data["iconPath"] == fields["icon_path"]
        assert data["backgroundPath"] == fields["background_path"]
        assert data["isLocked"] == (lock is not None)
    assert dump_update(FolderUpdate.model_validate({"name": "renamed"})) == {"name": "renamed"}
    assert dump_update(FolderUpdate.model_validate({"iconPath": None, "backgroundPath": None})) == {"icon_path": None, "background_path": None}
    assert FolderOut.model_validate(SimpleNamespace(id="old", name="Old", parent_id=None, order=None, required_tariff_id=None, required_reward_id=None)).icon_path is None
