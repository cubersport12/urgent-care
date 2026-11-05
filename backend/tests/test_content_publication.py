from types import SimpleNamespace

from sqlalchemy import Column, MetaData, String, Table, create_engine, insert
from sqlalchemy.orm import Session, registry

from app.api.v1._content_access import content_out
from app.db.repositories.content import published_content_statement
from app.models.folder import Folder
from app.schemas.content import TestOut as PublishedTestOut


def test_mobile_query_hides_drafts_in_folder_ancestry():
    engine = create_engine("sqlite://")
    Folder.__table__.create(engine)
    content = Table(
        "content",
        MetaData(),
        Column("id", String, primary_key=True),
        Column("name", String),
        Column("parent_id", String),
        Column("status", String, nullable=False),
    )
    class ContentItem:
        pass

    registry().map_imperatively(ContentItem, content)
    content.create(engine)

    with Session(engine) as session:
        session.execute(
            insert(Folder),
            [
                {"id": "draft", "name": "Draft", "status": "draft"},
                {"id": "child", "name": "Child", "parent_id": "draft", "status": "published"},
                {"id": "grandchild", "name": "Grandchild", "parent_id": "child", "status": "published"},
                {"id": "public", "name": "Public", "status": "published"},
            ],
        )
        session.execute(
            insert(content),
            [
                {"id": "hidden", "name": "Hidden", "parent_id": "grandchild", "status": "published"},
                {"id": "draft-test", "name": "Draft test", "parent_id": "public", "status": "draft"},
                {"id": "visible", "name": "Visible", "parent_id": "public", "status": "published"},
            ],
        )

        visible = session.scalars(published_content_statement(ContentItem)).all()
        draft_by_id = session.scalars(
            published_content_statement(ContentItem).where(ContentItem.id == "draft-test")
        ).one_or_none()

    assert [item.id for item in visible] == ["visible"]
    assert draft_by_id is None


def test_locked_content_stub_keeps_published_status():
    item = SimpleNamespace(
        id="visible",
        name="Published test",
        status="published",
        order=0,
        parent_id=None,
        required_tariff_id=None,
        required_reward_id=None,
    )

    output = content_out(item, PublishedTestOut, "tariff")

    assert output.status == "published"
    assert output.is_locked is True
