import json

from tools.serper_core import search_road_news_sync

try:
    from crewai.tools import tool

    @tool("Search Road News")
    def search_road_news(query: str) -> str:
        """Search recent road, traffic, and smog news for route planning."""
        return json.dumps(search_road_news_sync(query))

except ImportError:
    search_road_news = None  # type: ignore
