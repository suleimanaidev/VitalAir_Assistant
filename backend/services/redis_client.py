"""Shared Redis client for Celery SSE pub/sub (optional if redis not installed)."""

from __future__ import annotations

from config import get_settings

_client = None
_redis_available = False

try:
    import redis

    _redis_available = True
except ImportError:
    redis = None  # type: ignore


def redis_is_installed() -> bool:
    return _redis_available


def get_redis_client():
    global _client
    if not _redis_available or redis is None:
        raise RuntimeError("redis package not installed — pip install redis")
    if _client is None:
        _client = redis.Redis.from_url(
            get_settings().redis_url,
            decode_responses=False,
        )
    return _client


def redis_ping() -> bool:
    if not _redis_available:
        return False
    try:
        return bool(get_redis_client().ping())
    except Exception:
        return False


def publish_task_event(task_id: str, payload: dict) -> None:
    import json

    get_redis_client().publish(f"task:{task_id}", json.dumps(payload))
