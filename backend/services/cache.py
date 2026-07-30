"""In-memory TTL cache for AQI lookups and route calculations."""

from __future__ import annotations

import time
import threading
from typing import Any

_cache: dict[str, tuple[float, Any]] = {}
_lock = threading.Lock()


def get_cached(key: str, ttl_seconds: float = 300.0) -> Any | None:
    """Retrieve value from cache if not expired."""
    now = time.monotonic()
    with _lock:
        item = _cache.get(key)
        if item is None:
            return None
        created_at, val = item
        if now - created_at > ttl_seconds:
            del _cache[key]
            return None
        return val


def set_cached(key: str, value: Any) -> None:
    """Store value in cache with current timestamp."""
    now = time.monotonic()
    with _lock:
        _cache[key] = (now, value)


def clear_cache() -> None:
    """Clear all cached items."""
    with _lock:
        _cache.clear()
