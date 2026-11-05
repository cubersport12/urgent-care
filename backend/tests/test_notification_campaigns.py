"""Validation of notification campaign templates."""
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.notification_campaigns import CampaignInput


def test_selected_audience_is_required_and_deduplicated():
    user_id = uuid4()
    with pytest.raises(ValidationError):
        CampaignInput(name="Напоминание", title="Здравствуйте", audience="selected")
    campaign = CampaignInput(
        name=" Напоминание ", title="Здравствуйте", audience="selected", user_ids=[user_id, user_id]
    )
    assert campaign.name == "Напоминание"
    assert campaign.user_ids == [user_id]


def test_cron_must_have_five_valid_fields():
    assert CampaignInput(name="n", title="t", audience="all", cron="0 9 * * *").cron == "0 9 * * *"
    for invalid in ("not cron", "0 9 * * * *", "61 * * * *"):
        with pytest.raises(ValidationError):
            CampaignInput(name="n", title="t", audience="all", cron=invalid)


def test_icon_path_is_limited_to_notification_images():
    path = f"public/notifications/{uuid4()}.png"
    assert CampaignInput(name="n", title="t", audience="all", icon_path=path).icon_path == path
    with pytest.raises(ValidationError):
        CampaignInput(name="n", title="t", audience="all", icon_path="public/avatars/user.png")
