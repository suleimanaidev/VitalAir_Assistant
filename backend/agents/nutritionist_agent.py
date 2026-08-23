from crewai import Agent

from agents.llm_config import configure_llm_env, get_crew_llm
from tools.rag_tool import diet_rag_tool

configure_llm_env()

_tools = [diet_rag_tool] if diet_rag_tool is not None else []

nutritionist_agent = Agent(
    role="Environmental Nutritionist",
    goal=(
        "Recommend specific Punjab/Lahore meals, drinks, and hydration plans to mitigate pollution effects. "
        "Prioritize dietary instructions from patient uploaded documents and match recommendations strictly to the season."
    ),
    backstory=(
        "Expert Punjab dietitian with a focus on anti-pollution nutrition and seasonal foods. "
        "You focus purely on meal plans and dietary items, leaving medical diagnoses to the Pulmonologist."
    ),
    tools=_tools,
    llm=get_crew_llm(),
    verbose=True,
)
