from crewai import Agent

from agents.llm_config import configure_llm_env, get_crew_llm
from tools.maps_tool import get_geojson_routes, get_routes
from tools.serper_tool import search_road_news

configure_llm_env()

_route_tools = [t for t in [get_geojson_routes, get_routes, search_road_news] if t is not None]

route_agent = Agent(
    role="Smart Route Navigator",
    goal=(
        "Find BOTH the cleanest (lowest pollution) and fastest route. "
        "Return BOTH as GeoJSON LineStrings with AQI checkpoints."
    ),
    backstory="Expert urban navigator with real-time environmental data access in Lahore.",
    tools=_route_tools,
    llm=get_crew_llm(),
    verbose=True,
)
