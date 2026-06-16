from crewai import Agent

from agents.llm_config import configure_llm_env, get_crew_llm
from tools.rag_tool import diet_rag_tool

configure_llm_env()

_tools = [diet_rag_tool] if diet_rag_tool is not None else []

nutritionist_agent = Agent(
    role="Environmental Nutritionist",
    goal=(
        "Recommend specific foods and drinks that help the body fight pollution effects. "
        "ALWAYS retrieve verified diet research before making recommendations."
    ),
    backstory=(
        "Expert dietitian with a PhD in environmental nutrition. "
        "You never guess — you cite research before recommending."
    ),
    tools=_tools,
    llm=get_crew_llm(),
    verbose=True,
)
