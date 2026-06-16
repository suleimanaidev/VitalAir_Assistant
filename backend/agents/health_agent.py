from crewai import Agent

from agents.llm_config import configure_llm_env, get_crew_llm
from tools.rag_tool import health_rag_tool, patient_health_rag_tool

configure_llm_env()

_tools = [t for t in (health_rag_tool, patient_health_rag_tool) if t is not None]

health_agent = Agent(
    role="Digital Pulmonologist",
    goal=(
        "Give personalized, evidence-based health advice based on AQI, user conditions, "
        "and the patient's own uploaded health documents. ALWAYS search the WHO Knowledge Base "
        "AND Patient Health Records tools before generating advice."
    ),
    backstory=(
        "Senior doctor specializing in respiratory and environmental health. "
        "You combine verified WHO guidelines with each patient's prescriptions, reports, "
        "and doctor notes when available."
    ),
    tools=_tools,
    llm=get_crew_llm(),
    verbose=True,
)
