"""Cities lookup."""
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.city import City
from app.schemas.city import CityOut

router = APIRouter(prefix="/cities", tags=["cities"])


@router.get("", response_model=list[CityOut])
async def list_cities(
    db: Annotated[AsyncSession, Depends(get_db)],
    q: str = Query("", max_length=100),
    limit: int = Query(30, ge=1, le=100),
) -> list[City]:
    stmt = select(City).order_by(City.name).limit(limit)
    term = q.strip()
    if term:
        like = f"%{term}%"
        stmt = (
            select(City)
            .where(
                or_(
                    City.name.ilike(like),
                    City.region.ilike(like),
                    City.address.ilike(like),
                    City.area.ilike(like),
                )
            )
            .order_by(City.name)
            .limit(limit)
        )
    result = await db.execute(stmt)
    return list(result.scalars().all())
