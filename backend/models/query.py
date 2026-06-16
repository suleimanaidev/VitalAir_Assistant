"""MongoDB queries collection schema (plan §2.4)."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from models.agent_output import RouteOutput

QueryStatus = Literal["pending", "running", "complete", "error"]


class QueryDocument(BaseModel):
    """queries collection — route analysis history."""

    user_id: str | None = None
    task_id: str | None = None
    source: str
    destination: str
    aqi_at_time: int | None = None
    health_advice: str | None = None
    diet_plan: list[str] = Field(default_factory=list)
    safe_route: RouteOutput | dict[str, Any] | None = None
    status: QueryStatus = "complete"
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"extra": "ignore"}
