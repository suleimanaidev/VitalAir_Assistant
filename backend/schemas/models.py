from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

SensitivityLevel = Literal["low", "medium", "high"]
CommuteMode = Literal["walk", "bike", "car", "public_transport"]
OutdoorTime = Literal["under_30", "30_60", "1_2", "2_plus"]


class UserProfile(BaseModel):
    """Per-user health profile stored in MongoDB."""

    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(..., min_length=1, max_length=120)
    age: int = Field(..., ge=1, le=120)
    conditions: list[str] = Field(default_factory=list)
    city: str = Field(default="Lahore", min_length=1, max_length=80)  # Lahore-only app
    sensitivity: SensitivityLevel = "medium"
    commute_mode: CommuteMode = Field(default="car", alias="commuteMode")
    outdoor_time: OutdoorTime = Field(default="30_60", alias="outdoorTime")


class RouteQuery(BaseModel):
    source: str = Field(..., min_length=1)
    destination: str = Field(..., min_length=1)


class AnalyzeProfile(BaseModel):
    """Profile slice for /api/analyze — full or minimal body accepted."""

    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(default="Guest", max_length=120)
    age: int = Field(default=25, ge=1, le=120)
    conditions: list[str] = Field(default_factory=list)
    city: str = Field(default="Lahore", min_length=1, max_length=80)  # Lahore-only app
    sensitivity: SensitivityLevel = "medium"
    commute_mode: CommuteMode = Field(default="car", alias="commuteMode")
    outdoor_time: OutdoorTime = Field(default="30_60", alias="outdoorTime")


class AnalyzeRequest(BaseModel):
    profile: AnalyzeProfile
    query: RouteQuery
    user_id: str | None = None


class ForecastDay(BaseModel):
    day: str
    aqi: int


class AQIResponse(BaseModel):
    city: str
    aqi: int
    label: str
    pm25: float | None = None
    breakdown: dict[str, Any] = Field(default_factory=dict)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    station_reported_at: datetime | None = None
    station: str | None = None
    forecast: list[ForecastDay] = Field(default_factory=list)


class RouteOption(BaseModel):
    rank: int
    label: str
    distance: str
    duration: str | None = None
    avg_aqi: int
    exposure: str
    waypoints: list[str] = Field(default_factory=list)
    via_areas: list[str] = Field(default_factory=list)
    recommendation: str | None = None


class SafeRoute(BaseModel):
    summary: str
    distance: str | None = None
    duration: str | None = None
    exposure: str | None = None
    waypoints: list[str] = Field(default_factory=list)
    reasoning: str | None = None
    cleanest: dict | None = None
    fastest: dict | None = None
    recommendation: str | None = None
    aqi_checkpoints: list[dict] = Field(default_factory=list)
    route_options: list[RouteOption] = Field(default_factory=list)


class PesBreakdown(BaseModel):
    aqi_component: float
    distance_component: float
    commute_component: float
    health_component: float


class PersonalExposureScore(BaseModel):
    score: int = Field(..., ge=0, le=100)
    level: str
    level_label: str
    emoji: str
    aqi: int
    aqi_label: str
    commute_mode: str
    commute_label: str
    commute_factor: float
    health_flags: list[str] = Field(default_factory=list)
    health_factor: float
    distance_km: float
    distance_label: str
    recommendation: str
    breakdown: PesBreakdown


class ExplanationSource(BaseModel):
    index: int
    title: str
    confidence: int = Field(..., ge=0, le=100)


class ReasoningStep(BaseModel):
    step: int
    description: str


class HealthExplainability(BaseModel):
    recommendation: str
    agent_name: str
    agent_version: str
    agent_mode: str = "RAG + rules"
    sources: list[ExplanationSource] = Field(default_factory=list)
    reasoning_chain: list[ReasoningStep] = Field(default_factory=list)
    confidence_pct: int = Field(..., ge=0, le=100)
    reviewed_against: list[str] = Field(default_factory=list)


class SeasonIntelligence(BaseModel):
    id: str
    name: str
    months: str
    label_en: str
    label_ur: str
    primary_hazard: str
    pollutants: list[str] = Field(default_factory=list)
    health_agent_focus: str
    nutrition_agent_focus: str
    route_agent_focus: str
    avoid_areas: list[str] = Field(default_factory=list)
    preferred_travel_window: str


class AnalyzeResponse(BaseModel):
    status: str = "success"
    aqi_at_time: int
    health_advice: str
    diet_plan: list[str]
    safe_route: SafeRoute
    personal_exposure_score: PersonalExposureScore | None = None
    health_explainability: HealthExplainability | None = None
    season_intelligence: SeasonIntelligence | None = None
    raw: str | None = None
    query_id: str | None = None
    season: str | None = None
    season_label: str | None = None
    temperature_c: float | None = None
    humidity: int | None = None
    heatwave: bool = False
    context_summary: str | None = None


class ProfileResponse(BaseModel):
    status: str = "success"
    user_id: str
    profile: UserProfile
    profile_complete: bool = False


class SymptomCheckinBody(BaseModel):
    """Fast daily health check-in; all fields are intentionally optional."""

    cough: int = Field(default=0, ge=0, le=2)
    breathlessness: int = Field(default=0, ge=0, le=2)
    chest_tightness: int = Field(default=0, ge=0, le=2)
    headache: int = Field(default=0, ge=0, le=2)
    sleep_quality: int = Field(default=0, ge=0, le=2)
    took_medication: bool = False
    skipped: bool = False


class SymptomCheckinResponse(BaseModel):
    status: str = "success"
    user_id: str
    date: str
    symptoms: SymptomCheckinBody
    score: int = Field(..., ge=0, le=12)
    risk_level: Literal["none", "mild", "high"]
    summary: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AgentAreaBody(BaseModel):
    """Single-area request for health / nutrition agents."""

    model_config = ConfigDict(populate_by_name=True)

    area: str = Field(..., min_length=1)
    profile: AnalyzeProfile
    user_id: str | None = None
    aqi: int | None = None
    destination: str | None = None


class AgentRouteBody(BaseModel):
    profile: AnalyzeProfile
    query: RouteQuery
    user_id: str | None = None
    aqi: int | None = None


class AgentHealthResponse(BaseModel):
    status: str = "success"
    agent: str = "Digital Pulmonologist"
    area: str
    aqi: int
    aqi_label: str
    health_advice: str
    health_explainability: HealthExplainability | None = None
    rag_sources_used: int = 0
    has_patient_docs: bool = False
    agent_mode: str = "rag_rules"
    season: str | None = None
    season_label: str | None = None
    temperature_c: float | None = None


class AgentNutritionResponse(BaseModel):
    status: str = "success"
    agent: str = "Environmental Nutritionist"
    area: str
    aqi: int
    diet_plan: list[str]
    rag_sources_used: int = 0
    has_patient_docs: bool = False
    agent_mode: str = "rag_rules"
    season: str | None = None
    season_label: str | None = None


class AgentRouteResponse(BaseModel):
    status: str = "success"
    agent: str = "Smart Route Navigator"
    aqi: int
    aqi_label: str
    safe_route: SafeRoute
    personal_exposure_score: PersonalExposureScore | None = None
    season_intelligence: SeasonIntelligence | None = None
    context_summary: str | None = None
    route_source: str = "osrm"
