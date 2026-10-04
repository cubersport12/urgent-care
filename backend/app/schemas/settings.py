"""System settings DTOs."""
from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        ser_json_by_alias=True,
    )


MaintenanceMode = Annotated[bool, Field(alias="maintenanceMode")]


class SystemSettingsOut(CamelModel):
    maintenance_mode: MaintenanceMode = False


class SystemSettingsUpdate(CamelModel):
    maintenance_mode: Annotated[bool | None, Field(alias="maintenanceMode")] = None
