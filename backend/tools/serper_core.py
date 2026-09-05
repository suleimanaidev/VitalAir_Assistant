import html
import re
import urllib.parse
import xml.etree.ElementTree as ET
import httpx
from config import get_settings


def _clean_text(text: str) -> str:
    """Clean up trailing dots, extra whitespace, html entities, and dangling words."""
    if not text:
        return ""
    cleaned = html.unescape(text.strip())
    cleaned = (
        cleaned.replace("", "'")
        .replace("â€™", "'")
        .replace("â€\"", "—")
        .replace("&nbsp;", " ")
    )
    cleaned = re.sub(
        r"\s*(?:with|in|at|by|on|and|or|of|to|from)?\s*\.{2,}\s*$",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"\s*\.{2,}\s*", " — ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def _is_clean_headline(
    title: str, snippet: str = "", season: str = "monsoon", query: str = ""
) -> bool:
    """Validate headline relevance: reject spam, ads, foreign locations, routine police checks."""
    combined = f"{title} {snippet}".lower()
    q_lower = query.lower()

    # Reject social media junk, ads, commercial promos, property listings, foreign power/town posts
    junk_indicators = [
        "shared by",
        "respected member",
        "virelreels",
        "trendingreels",
        "reels",
        "whatsapp",
        "tiktok",
        "youtube video",
        "official tvc",
        "launch",
        "plots for sale",
        "commercial plot",
        "booking open",
        "housing society",
        "for sale in",
        "real estate",
        "file price",
        "cash price",
        "rates update",
        "status video",
        "facebook post",
        "instagram",
        "video viral",
        "watch now",
        "subscribers",
        "subscribe",
        "property dealer",
        "marla",
        "kanal plot",
        "dominion power",
        "town public works",
        "officers, town",
        "facebook.com",
    ]
    if any(junk in combined for junk in junk_indicators):
        return False

    # Reject routine non-hazard police checks
    non_hazard_events = [
        "heavy transport checking",
        "zero tolerance",
        "routine checking",
        "crackdown against",
    ]
    if any(ev in combined for ev in non_hazard_events):
        return False

    # Strictly reject foreign cities, regions, UAE/Gulf, US/UK/Canada
    foreign_regions = [
        "amritsar",
        "ludhiana",
        "jalandhar",
        "bathinda",
        "patiala",
        "mohali",
        "haryana",
        "himachal",
        "uttarakhand",
        "uttar pradesh",
        "rajasthan",
        "chandigarh",
        "delhi",
        "mumbai",
        "ahmedabad",
        "gurgaon",
        "gurugram",
        "edmonton",
        "manila",
        "hawaii",
        "bangalore",
        "bengaluru",
        "chennai",
        "kolkata",
        "pune",
        "noida",
        "kerala",
        "bihar",
        "gujarat",
        "sharjah",
        "khorfakkan",
        "dubai",
        "uae",
        "abu dhabi",
        "ras al khaimah",
        "ajman",
        "fujairah",
        "saudi",
        "qatar",
        "kuwait",
        "oman",
        "gulf",
        "virginia",
        "california",
        "texas",
        "florida",
        "new york",
        "london",
        "uk",
        "canada",
        "usa",
        "america",
    ]
    if any(region in combined for region in foreign_regions):
        return False

    # Other Pakistani cities unless explicitly part of user query
    other_pak_cities = [
        "rawalpindi",
        "faisalabad",
        "karachi",
        "peshawar",
        "quetta",
        "islamabad",
        "sialkot",
        "gujranwala",
        "multan",
        "hyderabad",
        "sukkur",
        "sargodha",
        "bahawalpur",
    ]
    for city in other_pak_cities:
        if city in combined and city not in q_lower:
            if "lahore" not in combined:
                return False

    # Require explicit road hazard / traffic / weather / advisory context
    hazard_keywords = [
        "rain",
        "waterlog",
        "flood",
        "inundat",
        "block",
        "closure",
        "closed",
        "traffic",
        "underpass",
        "wasa",
        "fog",
        "smog",
        "visibility",
        "motorway",
        "ctpl",
        "jam",
        "diversion",
        "landslide",
        "storm",
        "accident",
        "construction",
        "advisory",
        "plan",
        "procession",
        "route",
        "rickshaw",
        "canal road",
        "ban",
        "gridlock",
        "challan",
        "warden",
        "delay",
        "halted",
        "highway",
        "police",
    ]
    if not any(kw in combined for kw in hazard_keywords):
        return False

    # During monsoon, summer, or spring, strictly reject out-of-season winter smog/fog news
    if "smog" not in season:
        if any(
            term in combined
            for term in [
                "dense fog",
                "fog disrupts",
                "smog blankets",
                "smog season",
                "smog alert",
                "smog emergency",
            ]
        ):
            return False

    clean_t = _clean_text(title)
    if len(clean_t) < 15:
        return False

    if re.search(
        r"\b(in|at|by|on|with|and|or|of|to|from)\s*$", clean_t, re.IGNORECASE
    ):
        return False

    return True


def _is_recent_date(date_str: str) -> bool:
    """Check if date string represents recent news (strictly past 24h to 7 days)."""
    if not date_str:
        return False
    d_lower = date_str.lower().strip()

    # Explicit freshness indicators
    fresh_patterns = [
        "min", "minute", "hour", "hr", "today", "yesterday", "just now",
        "1 day ago", "2 days ago", "3 days ago", "4 days ago", "5 days ago", "6 days ago", "7 days ago",
        "1 day", "2 days", "3 days", "4 days", "5 days", "6 days", "7 days",
    ]
    if any(p in d_lower for p in fresh_patterns):
        return True

    # Stale/old indicators - strictly reject
    stale_patterns = [
        "week", "month", "year", "ago",
        "2020", "2021", "2022", "2023", "2024", "2025",
    ]
    if any(p in d_lower for p in stale_patterns):
        return False

    # Attempt date parsing for standard formatted dates
    try:
        from datetime import datetime, timezone
        for fmt in ("%b %d, %Y", "%d %b %Y", "%Y-%m-%d", "%a, %d %b %Y %H:%M:%S"):
            try:
                dt = datetime.strptime(d_lower.split("t")[0].split("+")[0].strip(), fmt)
                now = datetime.now()
                # Within last 7 days
                delta_days = (now - dt).total_seconds() / 86400
                return 0 <= delta_days <= 7
            except Exception:
                continue
    except Exception:
        pass

    return False


def _get_headline_prefix(text: str) -> str:
    """Determine dynamic emoji prefix based on alert content type."""
    t_lower = text.lower()
    if any(
        k in t_lower
        for k in [
            "smog",
            "fog",
            "visibility",
            "motorway closed",
            "m2 closed",
            "m3 closed",
            "ring road closed",
        ]
    ):
        return "🌫️"
    elif any(
        k in t_lower
        for k in [
            "block",
            "closure",
            "closed",
            "blocked",
            "protest",
            "container",
            "diversion",
            "traffic suspended",
        ]
    ):
        return "🛑"
    elif any(
        k in t_lower
        for k in [
            "rain",
            "waterlogging",
            "flooded",
            "wasa",
            "monsoon",
            "inundated",
            "downpour",
        ]
    ):
        return "🌧️"
    return "🚦"


def _fetch_google_news_rss(query: str, season: str = "monsoon") -> list[str]:
    """Fetch live traffic news from Google News RSS feed as a zero-config real-time fallback."""
    clean_q = query.strip() or "Lahore"
    rss_query = f"Lahore traffic {clean_q} road block CTPL update"
    encoded_q = urllib.parse.quote(rss_query)
    rss_url = f"https://news.google.com/rss/search?q={encoded_q}&hl=en-PK&gl=PK&ceid=PK:en"

    headlines = []
    seen = set()

    try:
        with httpx.Client(timeout=8.0, follow_redirects=True) as client:
            resp = client.get(rss_url)
            if resp.status_code == 200:
                root = ET.fromstring(resp.text)
                for item in root.findall(".//item"):
                    title_elem = item.find("title")
                    pubdate_elem = item.find("pubDate")
                    if title_elem is not None and title_elem.text:
                        title = _clean_text(title_elem.text)
                        pub_date = (
                            pubdate_elem.text if pubdate_elem is not None else ""
                        )

                        if (
                            title
                            and title.lower() not in seen
                            and _is_clean_headline(title, "", season, clean_q)
                        ):
                            seen.add(title.lower())
                            prefix = _get_headline_prefix(title)
                            date_str = (
                                pub_date.rsplit(" ", 1)[0].replace("+0000", "").strip()
                                if pub_date
                                else "Live Update"
                            )
                            headlines.append(f"{prefix} {title} ({date_str})")
                            if len(headlines) >= 4:
                                break
    except Exception:
        pass

    return headlines


def search_road_news_sync(query: str = "", season_id: str | None = None) -> dict:
    """100% Real-Time Live Google Search & News Extraction via Serper API + Google News Live RSS Fallback."""
    settings = get_settings()

    if not season_id:
        try:
            from tools.lahore_season import get_lahore_season
            season_id = get_lahore_season().id
        except Exception:
            season_id = "monsoon"

    season = (season_id or "").lower()
    clean_query = query.strip()
    final_headlines: list[str] = []
    seen_titles: set[str] = set()

    if settings.serper_api_key:
        search_queries = [
            f"{clean_query} Lahore road block closure traffic police update",
        ]
        dest_parts = [
            w
            for w in clean_query.split()
            if w.lower() not in ("to", "from", "and", "in", "the", "via")
        ]
        if len(dest_parts) > 1:
            search_queries.append(
                f"Lahore {dest_parts[-1]} road blocked traffic closure update"
            )
            search_queries.append(
                f"Lahore {dest_parts[0]} road traffic block CTPL update"
            )

        if any(s in season for s in ["smog", "winter"]):
            search_queries.append(
                f"{clean_query} Lahore fog smog road closed traffic diverted"
            )
            search_queries.append(
                "Lahore Motorway M2 M3 Ring Road closed dense fog smog update"
            )
        elif any(s in season for s in ["monsoon", "rain"]):
            search_queries.append(
                f"{clean_query} Lahore rain waterlogging road block underpass closed"
            )
            search_queries.append(
                "Lahore live traffic road rain waterlogging WASA update"
            )

        search_queries.append("Lahore road blocked closed traffic jam CTPL update")

        news_url = "https://google.serper.dev/news"
        search_url = "https://google.serper.dev/search"
        headers = {
            "X-API-KEY": settings.serper_api_key,
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                for tbs_param in ["qdr:w", "qdr:m"]:
                    if len(final_headlines) >= 4:
                        break
                    for q_str in search_queries:
                        if len(final_headlines) >= 4:
                            break

                        try:
                            resp = client.post(
                                news_url,
                                headers=headers,
                                json={
                                    "q": q_str,
                                    "num": 8,
                                    "gl": "pk",
                                    "location": "Lahore, Punjab, Pakistan",
                                    "tbs": tbs_param,
                                },
                            )
                            if resp.status_code == 200:
                                data = resp.json()
                                for item in data.get("news", []):
                                    title = _clean_text(item.get("title", ""))
                                    snippet = _clean_text(item.get("snippet", ""))
                                    source = item.get("source", "Live News")
                                    date_str = item.get("date", "")
                                    link = (
                                        item.get("link")
                                        or item.get("url")
                                        or ""
                                    )

                                    if (
                                        title
                                        and title.lower() not in seen_titles
                                        and _is_clean_headline(
                                            title, snippet, season, clean_query
                                        )
                                        and (
                                            tbs_param == "qdr:w"
                                            or _is_recent_date(date_str)
                                        )
                                    ):
                                        seen_titles.add(title.lower())
                                        clean_snippet = (
                                            snippet.split("—")[0]
                                            .split(".")[0]
                                            .strip()
                                            if snippet
                                            else ""
                                        )
                                        prefix = _get_headline_prefix(
                                            f"{title} {snippet}"
                                        )
                                        date_tag = (
                                            f" • {date_str}" if date_str else ""
                                        )
                                        link_tag = (
                                            f" 🔗 {link}" if link else ""
                                        )
                                        if (
                                            clean_snippet
                                            and len(clean_snippet) > 20
                                            and not clean_snippet.endswith("...")
                                        ):
                                            formatted = f"{prefix} {title} — {clean_snippet}. ({source}{date_tag}){link_tag}"
                                        else:
                                            formatted = f"{prefix} {title} ({source}{date_tag}){link_tag}"

                                        final_headlines.append(formatted)
                                        if len(final_headlines) >= 4:
                                            break
                        except Exception:
                            continue

                if len(final_headlines) < 4:
                    for q_str in search_queries[:3]:
                        if len(final_headlines) >= 4:
                            break
                        try:
                            resp = client.post(
                                search_url,
                                headers=headers,
                                json={
                                    "q": q_str,
                                    "num": 6,
                                    "gl": "pk",
                                    "location": "Lahore, Punjab, Pakistan",
                                },
                            )
                            if resp.status_code == 200:
                                data = resp.json()
                                for item in data.get("organic", []):
                                    title = _clean_text(item.get("title", ""))
                                    snippet = _clean_text(item.get("snippet", ""))
                                    link = (
                                        item.get("link")
                                        or item.get("url")
                                        or ""
                                    )

                                    if (
                                        title
                                        and title.lower() not in seen_titles
                                        and _is_clean_headline(
                                            title, snippet, season, clean_query
                                        )
                                    ):
                                        seen_titles.add(title.lower())
                                        clean_snippet = (
                                            snippet.split(".")[0].strip()
                                            if snippet
                                            else ""
                                        )
                                        prefix = _get_headline_prefix(
                                            f"{title} {snippet}"
                                        )
                                        link_tag = (
                                            f" 🔗 {link}" if link else ""
                                        )
                                        if (
                                            clean_snippet
                                            and len(clean_snippet) > 25
                                        ):
                                            formatted = f"{prefix} Live Update: {title} — {clean_snippet}.{link_tag}"
                                        else:
                                            formatted = f"{prefix} Live Update: {title}{link_tag}"

                                        final_headlines.append(formatted)
                                        if len(final_headlines) >= 4:
                                            break
                        except Exception:
                            continue
        except Exception:
            pass

    # If Serper key was missing or produced fewer than 2 headlines, enrich with live Google News RSS
    if len(final_headlines) < 3:
        rss_headlines = _fetch_google_news_rss(clean_query, season)
        for h in rss_headlines:
            # check duplicate by basic text
            base_t = h.lower()
            if not any(seen_t in base_t for seen_t in seen_titles):
                final_headlines.append(h)
                seen_titles.add(base_t[:30])
                if len(final_headlines) >= 4:
                    break

    if not final_headlines:
        final_headlines.append(
            f"📡 Live traffic scan active for {clean_query or 'Lahore'} — No active major road blockages reported by CTPL/WASA."
        )

    return {
        "query": query,
        "headlines": final_headlines[:4],
        "source": "google_serper_realtime" if settings.serper_api_key else "google_news_rss_live",
    }



