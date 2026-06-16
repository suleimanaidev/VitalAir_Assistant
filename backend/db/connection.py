import asyncio

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from config import get_settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            get_settings().mongodb_uri,
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000,
        )
    return _client


def get_db() -> AsyncIOMotorDatabase:
    client = get_client()
    return client.get_default_database()


async def close_db() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None


async def ping_db() -> bool:
    try:
        await asyncio.wait_for(get_client().admin.command("ping"), timeout=8.0)
        return True
    except Exception:
        return False
