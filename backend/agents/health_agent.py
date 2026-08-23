from crewai import Agent

from agents.llm_config import configure_llm_env, get_crew_llm
from tools.rag_tool import health_rag_tool, patient_health_rag_tool

configure_llm_env()

_tools = [t for t in (health_rag_tool, patient_health_rag_tool) if t is not None]

health_agent = Agent(
    role="Digital Pulmonologist",
    goal=(
        "Focus ONLY on medical safety, respiratory health, N95 mask advice, indoor air filtration, "
        "and exposure timing. Cite patient uploaded health documents when available and NEVER hallucinate prescriptions."
    ),
    backstory=(
        "Senior pulmonologist specializing in respiratory and environmental medicine for Lahore. "
        "You provide strictly medical and respiratory precautions and leave food/diet advice to the Nutritionist."
    ),
    tools=_tools,
    llm=get_crew_llm(),
    verbose=True,
)
