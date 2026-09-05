import asyncio
import time

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import PyMongoError

from config import get_settings

_client: AsyncIOMotorClient | None = None
_client_failed_at: float | None = None
_client_lock = asyncio.Lock()
_CLIENT_RETRY_COOLDOWN_SEC = 15.0
_CLIENT_INIT_TIMEOUT_SEC = 6.0


class MongoUnavailableError(RuntimeError):
    """Raised when MongoDB client cannot be created (cached after recent failure)."""


def _build_client() -> AsyncIOMotorClient:
    return AsyncIOMotorClient(
        get_settings().mongodb_uri,
        serverSelectionTimeoutMS=2000,
        connectTimeoutMS=2000,
        socketTimeoutMS=2500,
        maxPoolSize=20,
        minPoolSize=1,
        waitQueueTimeoutMS=2000,
    )


def _check_recent_failure() -> None:
    if _client_failed_at is None:
        return
    if (time.monotonic() - _client_failed_at) < _CLIENT_RETRY_COOLDOWN_SEC:
        raise MongoUnavailableError(
            "MongoDB is temporarily unavailable after a recent connection failure."
        )


async def get_client_async() -> AsyncIOMotorClient:
    """Create/reuse Motor client without blocking the event loop (SRV DNS runs in a thread)."""
    global _client, _client_failed_at

    if _client is not None:
        return _client

    async with _client_lock:
        if _client is not None:
            return _client
        _check_recent_failure()
        try:
            client = await asyncio.wait_for(
                asyncio.to_thread(_build_client),
                timeout=_CLIENT_INIT_TIMEOUT_SEC,
            )
            _client = client
            return _client
        except Exception:
            _client_failed_at = time.monotonic()
            raise


async def get_db_async() -> AsyncIOMotorDatabase:
    client = await get_client_async()
    return client.get_default_database()


def get_client() -> AsyncIOMotorClient:
    """Sync accessor — prefer get_client_async() from async routes."""
    global _client, _client_failed_at
    if _client is not None:
        return _client
    _check_recent_failure()
    try:
        _client = _build_client()
        return _client
    except PyMongoError:
        _client_failed_at = time.monotonic()
        raise


def get_db() -> AsyncIOMotorDatabase:
    return get_client().get_default_database()


async def close_db() -> None:
    global _client, _client_failed_at
    if _client is not None:
        _client.close()
        _client = None
    _client_failed_at = None


async def ping_db() -> bool:
    global _client, _client_failed_at
    try:
        client = await get_client_async()
        await asyncio.wait_for(client.admin.command("ping"), timeout=2.0)
        _client_failed_at = None
        return True
    except Exception:
        if _client is not None:
            try:
                _client.close()
            except Exception:
                pass
            _client = None
        _client_failed_at = time.monotonic()
        return False
