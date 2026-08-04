from collections.abc import AsyncIterator

from beanie import init_beanie
from pymongo import AsyncMongoClient

from app.core.config import get_settings

client: AsyncMongoClient | None = None
ready = False


async def connect_database() -> None:
    global client, ready
    from app.models.documents import DOCUMENT_MODELS

    settings = get_settings()
    client = AsyncMongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
    await client.admin.command("ping")
    if settings.environment == "production":
        hello = await client.admin.command("hello")
        if not (hello.get("setName") or hello.get("msg") == "isdbgrid"):
            await client.close()
            client = None
            raise RuntimeError("Production MongoDB must be a replica set or sharded cluster with transaction support")
    await init_beanie(database=client[settings.mongodb_database], document_models=DOCUMENT_MODELS)
    ready = True


async def close_database() -> None:
    global client, ready
    ready = False
    if client:
        await client.close()
        client = None


async def mongo_session() -> AsyncIterator:
    if not client:
        raise RuntimeError("Database is not connected")
    async with client.start_session() as session:
        yield session
