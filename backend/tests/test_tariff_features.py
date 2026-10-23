"""Особенности тарифов: схемы, флаг included, featureIds при создании/обновлении (без БД).

Запуск: .venv/Scripts/python -m pytest tests/test_tariff_features.py -q
"""
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.models.billing import Tariff, TariffFeature
from app.schemas.billing import TariffFeatureStateOut, TariffUpdate
from app.services.billing import BillingService


def _tariff(**over) -> Tariff:
    t = MagicMock(spec=Tariff)
    t.id = uuid.uuid4()
    t.code = "pro"
    t.title = "Про"
    t.description = None
    t.price_rub = 499
    t.period_days = 30
    t.rank = 1
    t.is_default = False
    t.is_active = True
    t.sort_order = 0
    t.rustore_product_id = None
    for k, v in over.items():
        setattr(t, k, v)
    return t


def _feature(code: str = "rescue", *, is_active: bool = True) -> TariffFeature:
    f = MagicMock(spec=TariffFeature)
    f.id = uuid.uuid4()
    f.code = code
    f.description = f"Описание {code}"
    f.is_active = is_active
    f.sort_order = 0
    return f


def _service(*, tariffs=None, features=None, links=None) -> BillingService:
    svc = BillingService(AsyncMock())
    svc.repo.list_tariffs = AsyncMock(return_value=tariffs or [])
    svc.repo.list_features = AsyncMock(return_value=features or [])
    svc.repo.list_feature_links = AsyncMock(return_value=links or [])
    return svc


def test_feature_state_out_alias_roundtrip():
    fid = uuid.uuid4()
    out = TariffFeatureStateOut(
        id=fid, code="rescue", description="Режим спасения", isActive=True, sortOrder=2, included=True
    )
    assert out.is_active is True
    assert out.sort_order == 2
    dumped = out.model_dump(by_alias=True)
    assert dumped["isActive"] is True
    assert dumped["sortOrder"] == 2
    assert dumped["included"] is True


def test_tariff_update_feature_ids_alias_semantics():
    # алиас на union-типе: camelCase от клиента обязан попадать в feature_ids
    fid = uuid.uuid4()
    assert TariffUpdate(featureIds=[str(fid)]).feature_ids == [fid]
    assert TariffUpdate().feature_ids is None  # не указано = не трогать связи


@pytest.mark.asyncio
async def test_public_tariffs_hide_inactive_features_but_show_unlinked():
    t = _tariff()
    active_in = _feature("a")
    active_out = _feature("b")
    inactive = _feature("c", is_active=False)
    link = MagicMock()
    link.tariff_id = t.id
    link.feature_id = active_in.id
    svc = _service(tariffs=[t], features=[active_in, active_out, inactive], links=[link])

    (out,) = await svc.list_tariffs_public()
    assert [(f.id, f.included) for f in out.features] == [
        (active_in.id, True),
        (active_out.id, False),
    ]


@pytest.mark.asyncio
async def test_admin_tariffs_keep_inactive_linked_features():
    t = _tariff()
    active = _feature("a")
    inactive = _feature("c", is_active=False)
    link = MagicMock()
    link.tariff_id = t.id
    link.feature_id = inactive.id
    svc = _service(tariffs=[t], features=[active, inactive], links=[link])

    (out,) = await svc.list_tariffs_admin()
    assert [(f.id, f.included) for f in out.features] == [
        (active.id, False),
        (inactive.id, True),
    ]


@pytest.mark.asyncio
async def test_create_tariff_applies_feature_ids():
    t = _tariff()
    f1, f2 = _feature("a"), _feature("b")
    svc = _service(tariffs=[t], features=[f1, f2])
    svc.repo.get_tariff_by_code = AsyncMock(return_value=None)
    svc.repo.create_tariff = AsyncMock(return_value=t)
    svc.repo.get_feature = AsyncMock(side_effect=[f1, f2])
    svc.repo.replace_tariff_features = AsyncMock()

    from app.schemas.billing import TariffCreate

    await svc.create_tariff(
        TariffCreate(code="pro", title="Про", featureIds=[str(f1.id), str(f2.id)])
    )
    svc.repo.replace_tariff_features.assert_awaited_once_with(t.id, [f1.id, f2.id])


@pytest.mark.asyncio
async def test_create_tariff_unknown_feature_rejected():
    t = _tariff()
    svc = _service(tariffs=[t])
    svc.repo.get_tariff_by_code = AsyncMock(return_value=None)
    svc.repo.create_tariff = AsyncMock(return_value=t)
    svc.repo.get_feature = AsyncMock(return_value=None)

    from app.schemas.billing import TariffCreate

    with pytest.raises(HTTPException) as err:
        await svc.create_tariff(
            TariffCreate(code="pro", title="Про", featureIds=[str(uuid.uuid4())])
        )
    assert err.value.status_code == 400


@pytest.mark.asyncio
async def test_update_tariff_feature_ids_none_keeps_links():
    t = _tariff()
    svc = _service(tariffs=[t])
    svc.repo.get_tariff = AsyncMock(return_value=t)
    svc.repo.update_tariff = AsyncMock(return_value=t)
    svc.repo.replace_tariff_features = AsyncMock()

    await svc.update_tariff(t.id, TariffUpdate(title="Новое"))
    svc.repo.replace_tariff_features.assert_not_awaited()

    await svc.update_tariff(t.id, TariffUpdate(featureIds=[]))
    svc.repo.replace_tariff_features.assert_awaited_once_with(t.id, [])


@pytest.mark.asyncio
async def test_create_feature_validations():
    svc = _service(features=[_feature("a")])
    svc.repo.get_feature_by_code = AsyncMock(return_value=_feature("a"))
    svc.repo.create_feature = AsyncMock()

    from app.schemas.billing import TariffFeatureCreate

    with pytest.raises(HTTPException) as err:
        await svc.create_feature(TariffFeatureCreate(code=" a ", description="x"))
    assert err.value.status_code == 409
    with pytest.raises(HTTPException) as err:
        await svc.create_feature(TariffFeatureCreate(code="b", description="  "))
    assert err.value.status_code == 400

    svc.repo.get_feature_by_code = AsyncMock(return_value=None)
    svc.repo.create_feature = AsyncMock(return_value=_feature("b"))
    created = await svc.create_feature(
        TariffFeatureCreate(code=" b ", description="Вторая", sortOrder=3)
    )
    svc.repo.create_feature.assert_awaited_once_with(
        code="b", description="Вторая", is_active=True, sort_order=3
    )
    assert created.code == "b"


@pytest.mark.asyncio
async def test_update_feature_code_conflict():
    existing, other = _feature("a"), _feature("b")
    svc = _service()
    svc.repo.get_feature = AsyncMock(return_value=existing)
    svc.repo.get_feature_by_code = AsyncMock(return_value=other)

    from app.schemas.billing import TariffFeatureUpdate

    with pytest.raises(HTTPException) as err:
        await svc.update_feature(existing.id, TariffFeatureUpdate(code="b"))
    assert err.value.status_code == 409
