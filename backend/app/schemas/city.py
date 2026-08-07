"""City DTOs."""
from uuid import UUID

from pydantic import BaseModel, ConfigDict, computed_field


class CityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    region: str
    region_type: str = ""
    area: str = ""
    area_type: str = ""
    address: str = ""

    @computed_field  # type: ignore[prop-decorator]
    @property
    def label(self) -> str:
        if self.address:
            return self.address
        parts = [self.name]
        if self.area:
            parts.append(f"{self.area_type} {self.area}".strip())
        if self.region:
            parts.append(f"{self.region_type} {self.region}".strip())
        return ", ".join(p for p in parts if p)
