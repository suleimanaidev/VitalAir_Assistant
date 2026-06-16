import json

from tools.iqair_core import fetch_aqi_for_api
from tools.waqi_core import fetch_aqi_for_area

try:
    from crewai.tools import tool

    @tool("Get AQI Data")
    def get_aqi_data(city: str = "Lahore") -> str:
        """Fetch real-time city-level AQI for Lahore, Pakistan from WAQI."""
        return json.dumps(fetch_aqi_for_api(city))

    @tool("Get Area AQI")
    def get_area_aqi(area: str) -> str:
        """
        Fetch real-time, location-specific AQI for a Lahore neighborhood.
        Resolves area name to coordinates via area_mapping, then geocoding fallback.
        Returns AQI value, health category, bilingual advice, and timestamp.
        """
        return json.dumps(fetch_aqi_for_area(area))

except ImportError:
    get_aqi_data = None  # type: ignore
    get_area_aqi = None  # type: ignore
