"""MongoDB users collection schema (plan §2.4)."""

from datetime import datetime

from pydantic import BaseModel, Field


class UserDocument(BaseModel):
    """users collection — auth + health profile."""

    name: str
    email: str | None = None
    hashed_password: str | None = None
    age: int | None = None
    conditions: list[str] = Field(default_factory=list)
    city: str = "Lahore"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"extra": "ignore"}
