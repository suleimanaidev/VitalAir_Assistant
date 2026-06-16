import httpx

from config import get_settings


def search_road_news_sync(query: str) -> dict:
    settings = get_settings()
    if not settings.serper_api_key:
        return {
            "query": query,
            "headlines": [
                "Smog alert continues across Lahore",
                "Traffic slow on Canal Road due to construction",
            ],
            "source": "mock",
        }

    url = "https://google.serper.dev/search"
    headers = {"X-API-KEY": settings.serper_api_key, "Content-Type": "application/json"}
    body = {"q": f"{query} Lahore traffic smog road closure", "num": 5}
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()
        headlines = [
            o.get("title", "") for o in data.get("organic", [])[:5] if o.get("title")
        ]
        return {"query": query, "headlines": headlines, "source": "serper"}
    except Exception:
        return {
            "query": query,
            "headlines": ["No live news available — using cached urban alerts"],
            "source": "fallback",
        }
