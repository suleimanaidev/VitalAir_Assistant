import json

from tools.maps_core import fetch_geojson_routes_sync, fetch_routes_sync

try:
    from crewai.tools import tool

    @tool("Get Routes")
    def get_routes(origin: str, destination: str) -> str:
        """Get driving routes between two locations in Lahore."""
        return json.dumps(fetch_routes_sync(origin, destination))

    @tool("Get GeoJSON Routes")
    def get_geojson_routes(origin: str, destination: str) -> str:
        """
        Get cleanest and fastest routes as GeoJSON LineStrings with AQI checkpoints.
        Use for Lahore route planning only.
        """
        return json.dumps(fetch_geojson_routes_sync(origin, destination))

except ImportError:
    get_routes = None  # type: ignore
    get_geojson_routes = None  # type: ignore
