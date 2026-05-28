import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from .config import API_KEYS

# Initialize Async MongoDB Client utilizing the credentials loaded from config
client = AsyncIOMotorClient(API_KEYS["mongodb_uri"])

# Database namespaces for reverse compatibility
db_zynthex = client["zynthex_ai"]
db_gemma = client["gemma-ai"]

async def save_message(user_id: str, message: dict, project_id: str = "default"):
    """Appends a new message to the user's conversation thread."""
    full_message = {
        "role": message["role"],
        "content": message["content"],
        "timestamp": datetime.datetime.now(datetime.timezone.utc),
    }
    if "files" in message:
        full_message["files"] = message["files"]

    collection = db_zynthex["chatmemories"]
    await collection.update_one(
        {"userId": user_id, "projectId": project_id or "default"},
        {
            "$push": {"messages": full_message},
            "$set": {"updatedAt": datetime.datetime.now(datetime.timezone.utc)},
            "$setOnInsert": {"userId": user_id, "projectId": project_id or "default"}
        },
        upsert=True
    )

async def get_history(user_id: str, limit: int = 20, project_id: str = "default", conversation_id: str = None) -> list:
    """Loads previous messages for context feed, serializing datetimes to ISO strings."""
    collection = db_zynthex["chatmemories"]
    
    if conversation_id:
        try:
            query = {"_id": ObjectId(conversation_id)}
        except Exception:
            return []
    else:
        query = {"userId": user_id, "projectId": project_id or "default"}
        
    doc = await collection.find_one(query)
    if not doc or "messages" not in doc:
        return []
        
    messages = doc["messages"][-limit:]
    for m in messages:
        if isinstance(m.get("timestamp"), datetime.datetime):
            m["timestamp"] = m["timestamp"].isoformat()
    return messages

async def list_conversations(user_id: str, limit: int = 20) -> list:
    """Lists recent active chat sessions for the user's sidebar feed."""
    collection = db_zynthex["chatmemories"]
    cursor = collection.find({}).sort("updatedAt", -1).limit(limit)
    conversations = await cursor.to_list(length=limit)
    
    result = []
    for c in conversations:
        first_msg = c["messages"][0]["content"] if c.get("messages") else "Untitled Chat"
        title = first_msg[:40] if first_msg else "Untitled Chat"
        result.append({
            "_id": str(c["_id"]),
            "title": title,
            "updatedAt": c["updatedAt"].isoformat() if isinstance(c.get("updatedAt"), datetime.datetime) else None
        })
    return result

async def clear_history(user_id: str, project_id: str = "default"):
    """Deletes conversation document from collection."""
    collection = db_zynthex["chatmemories"]
    await collection.delete_one({"userId": user_id, "projectId": project_id or "default"})

async def check_usage_limit(user_id: str, daily_limit: int) -> dict:
    """Verifies user has not exceeded daily message caps."""
    collection = db_zynthex["usage"]
    today_str = datetime.datetime.now().strftime("%a %b %d %Y") # Sun May 17 2026 format
    usage = await collection.find_one({"userId": user_id, "date": today_str})
    if not usage:
        return {"allowed": True, "current": 0}
    count = usage.get("count", 0)
    return {"allowed": count < daily_limit, "current": count}

async def increment_usage(user_id: str):
    """Increments user usage limits counter for today."""
    collection = db_zynthex["usage"]
    today_str = datetime.datetime.now().strftime("%a %b %d %Y")
    await collection.update_one(
        {"userId": user_id, "date": today_str},
        {
            "$inc": {"count": 1},
            "$setOnInsert": {"userId": user_id, "date": today_str}
        },
        upsert=True
    )

async def check_rate_limit(user_id: str, limit_per_minute: int = 20) -> bool:
    """Ensures user request volume fits under limits using absolute time difference."""
    collection = db_zynthex["rate_limits"]
    now = datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000
    one_minute_ago = now - 60000
    
    count = await collection.count_documents({
        "userId": user_id,
        "timestamp": {"$gt": one_minute_ago}
    })
    
    if count >= limit_per_minute:
        return False
        
    await collection.insert_one({"userId": user_id, "timestamp": now})
    return True

async def get_user_plan(user_id: str) -> dict:
    """Loads active subscription details, defaulting to Pro status."""
    collection = db_zynthex["users"]
    user = await collection.find_one({"userId": user_id})
    if not user:
        return {
            "userId": user_id,
            "plan": "Pro",
            "status": "active",
            "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
    user["_id"] = str(user["_id"])
    if isinstance(user.get("updatedAt"), datetime.datetime):
        user["updatedAt"] = user["updatedAt"].isoformat()
    return user

async def update_user_subscription(user_id: str, plan: str, status: str, subscription_id: str = None):
    """Saves updated payment details from checkout events."""
    collection = db_zynthex["users"]
    update_fields = {
        "plan": plan,
        "status": status,
        "updatedAt": datetime.datetime.now(datetime.timezone.utc)
    }
    if subscription_id:
        update_fields["subscriptionId"] = subscription_id
        
    await collection.update_one(
        {"userId": user_id},
        {
            "$set": update_fields,
            "$setOnInsert": {"userId": user_id}
        },
        upsert=True
    )

async def create_project(user_id: str, name: str, emoji: str, description: str, system_prompt: str = "") -> dict:
    """Ingests a new workspace custom instructions project context."""
    collection = db_gemma["projects"]
    project = {
        "userId": user_id,
        "name": name,
        "emoji": emoji,
        "description": description,
        "systemPrompt": system_prompt,
        "createdAt": datetime.datetime.now(datetime.timezone.utc),
        "updatedAt": datetime.datetime.now(datetime.timezone.utc)
    }
    res = await collection.insert_one(project)
    project["_id"] = str(res.inserted_id)
    project["createdAt"] = project["createdAt"].isoformat()
    project["updatedAt"] = project["updatedAt"].isoformat()
    return project

async def get_projects(user_id: str) -> list:
    """Fetches list of all user workspace projects."""
    collection = db_gemma["projects"]
    cursor = collection.find({"userId": user_id})
    projects = await cursor.to_list(length=100)
    for p in projects:
        p["_id"] = str(p["_id"])
        if isinstance(p.get("createdAt"), datetime.datetime):
            p["createdAt"] = p["createdAt"].isoformat()
        if isinstance(p.get("updatedAt"), datetime.datetime):
            p["updatedAt"] = p["updatedAt"].isoformat()
    return projects

async def delete_project(project_id: str):
    """Removes a workspace project context."""
    collection = db_gemma["projects"]
    try:
        await collection.delete_one({"_id": ObjectId(project_id)})
    except Exception:
        pass
