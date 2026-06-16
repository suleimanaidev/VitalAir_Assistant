from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from schemas.models import AQIResponse, ForecastDay
from tools.iqair_core import fetch_aqi_for_api
from tools.waqi_core import fetch_aqi_for_area

router = APIRouter(tags=["aqi"])


@router.get("/aqi/lookup")
async def get_area_aqi(area: str = Query(..., min_length=1, description="Lahore area name")):
    """Location-specific live WAQI for a Lahore neighborhood."""
    try:
        return fetch_aqi_for_area(area)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"WAQI fetch failed: {exc}") from exc


@router.get("/aqi", response_model=AQIResponse)
async def get_aqi(city: str = Query(default="Lahore", min_length=1)) -> AQIResponse:
    try:
        data = fetch_aqi_for_api(city)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AQI fetch failed: {exc}") from exc

    updated = data.get("updated_at")
    station_reported = data.get("station_reported_at")
    forecast_raw = data.get("forecast") or []
    return AQIResponse(
        city=data["city"],
        aqi=int(data["aqi"]),
        label=data["label"],
        pm25=data.get("pm25"),
        breakdown=data.get("breakdown", {}),
        updated_at=updated if updated is not None else datetime.utcnow(),
        station_reported_at=station_reported,
        station=data.get("station"),
        forecast=[ForecastDay(**f) for f in forecast_raw],
    )
