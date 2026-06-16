"""Validated CrewAI output models (plan §2.7)."""

from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel, Field, field_validator


class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: dict[str, Any]
    properties: dict[str, Any] = Field(default_factory=dict)


class RouteOutput(BaseModel):
    cleanest: GeoJSONFeature
    fastest: GeoJSONFeature
    recommendation: str
    aqi_checkpoints: list[dict[str, Any]] = Field(default_factory=list)


class VitalAirResult(BaseModel):
    aqi: int = Field(..., ge=0, le=2000)
    health_advice: str = Field(..., min_length=10)
    diet_plan: list[str] = Field(..., min_length=1)
    safe_route: RouteOutput

    @field_validator("diet_plan")
    @classmethod
    def validate_diet_items(cls, v: list[str]) -> list[str]:
        if len(v) < 3:
            raise ValueError("Diet plan must have at least 3 items")
        return v


def _empty_route(recommendation: str) -> RouteOutput:
    empty = GeoJSONFeature(geometry={"type": "LineString", "coordinates": []})
    return RouteOutput(
        cleanest=empty,
        fastest=empty,
        recommendation=recommendation,
    )


def parse_crew_output(raw_output: Any) -> VitalAirResult:
    """
    Safely parse CrewAI output into validated Pydantic model.
    Handles malformed or partial outputs gracefully.
    """
    try:
        if isinstance(raw_output, str):
            data = json.loads(raw_output)
        elif hasattr(raw_output, "model_dump"):
            data = raw_output.model_dump()
        elif hasattr(raw_output, "__dict__"):
            data = raw_output.__dict__
        else:
            data = raw_output

        return VitalAirResult(**data)
    except Exception:
        return VitalAirResult(
            aqi=0,
            health_advice=(
                "Unable to generate personalized advice. "
                "Please consult a doctor."
            ),
            diet_plan=[
                "Stay indoors",
                "Drink warm water",
                "Avoid outdoor exposure",
            ],
            safe_route=_empty_route("Route data unavailable. Please retry."),
        )
