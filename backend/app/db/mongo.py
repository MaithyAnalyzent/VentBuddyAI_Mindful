"""MongoDB connection lifecycle and indexes."""
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings


client = AsyncIOMotorClient(settings.mongodb_uri)
db = client[settings.db_name]


async def ensure_indexes() -> None:
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.users.create_index("telegram_chat_id", sparse=True)
    await db.messages.create_index([("user_id", 1), ("session_id", 1), ("created_at", 1)])
    await db.sessions.create_index([("user_id", 1), ("updated_at", -1)])
    await db.moods.create_index([("user_id", 1), ("created_at", -1)])
    await db.journals.create_index([("user_id", 1), ("created_at", -1)])
    await db.habits.create_index([("user_id", 1)])
    await db.habit_logs.create_index([("habit_id", 1), ("user_id", 1), ("log_date", 1)], unique=True)
    await db.checkins.create_index([("user_id", 1), ("log_date", 1)], unique=True)
