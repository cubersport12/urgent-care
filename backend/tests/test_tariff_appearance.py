from pydantic import ValidationError
import pytest

from app.schemas.billing import TariffCreate, TariffUpdate


def test_tariff_appearance_validation():
    tariff = TariffCreate(code="pro", title="Pro", effectColor="#12aBcF", glowEffect="orbit")
    assert tariff.effect_color == "#12aBcF"
    assert tariff.glow_effect == "orbit"
    assert TariffUpdate(effectColor=None, glowEffect="none").model_dump(exclude_unset=True) == {
        "effect_color": None, "glow_effect": "none"
    }
    with pytest.raises(ValidationError):
        TariffCreate(code="pro", title="Pro", effectColor="red", glowEffect="orbit")
    with pytest.raises(ValidationError):
        TariffCreate(code="pro", title="Pro", glowEffect="unknown")
