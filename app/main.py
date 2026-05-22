import json
import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import httpx
from .db import (
    save_message,
    get_history,
    list_conversations,
    clear_history,
    check_usage_limit,
    increment_usage,
    check_rate_limit,
    get_user_plan,
    create_project,
    get_projects,
    delete_project
)
from .plans import PLANS
from .orchestrator import generate_response

logger = logging.getLogger("main")
app = FastAPI(title="Likeway AI Python Backend", version="1.0.0")

# Register CORS Middleware for high-velocity frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    prompt: str
    userId: str = "default_user"
    modelId: str = "openai/gpt-4o"
    history: List[dict] = []
    files: List[str] = []
    mode: str = "General"
    plan: str = "Pro"
    projectId: str = "default"
    experimental: bool = False
    extendedThinking: bool = False
    isVoiceInteraction: bool = False

class ProjectCreateRequest(BaseModel):
    userId: str
    name: str
    emoji: str
    description: str
    systemPrompt: str = ""

@app.get("/api/user/plan")
async def get_plan(userId: str):
    """Loads active subscription details, defaulting to Pro status."""
    plan_info = await get_user_plan(userId)
    return plan_info

@app.get("/api/chat/history/list")
async def list_chats(userId: str):
    """Lists recent conversation session summaries for the sidebar feed."""
    chats = await list_conversations(userId)
    return chats

@app.get("/api/projects")
async def fetch_projects(userId: str):
    """Retrieves all workspace projects for the current user."""
    projects = await get_projects(userId)
    return projects

@app.post("/api/projects")
async def create_new_project(req: ProjectCreateRequest):
    """Creates a new workspace custom instructions project context."""
    project = await create_project(
        req.userId,
        req.name,
        req.emoji,
        req.description,
        req.systemPrompt
    )
    return project

@app.delete("/api/projects/{project_id}")
async def remove_project(project_id: str):
    """Removes a workspace project context."""
    await delete_project(project_id)
    return {"status": "success", "message": "Project successfully deleted"}

@app.post("/api/chat")
async def chat(req: ChatRequest):
    """Streams server-sent events completions, validating rate-limiting and usage allowances."""
    # 1. Rate Limit Checks
    allowed_rate = await check_rate_limit(req.userId)
    if not allowed_rate:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again in a moment.")

    # 2. Daily Limits Validation
    user_plan = await get_user_plan(req.userId)
    plan_name = user_plan.get("plan", "Core")
    plan_details = PLANS.get(plan_name, PLANS["Core"])
    daily_limit = plan_details["limits"]["messagesDay"]

    usage_check = await check_usage_limit(req.userId, daily_limit)
    if not usage_check["allowed"]:
        raise HTTPException(
            status_code=403, 
            detail=f"Daily limit of {daily_limit} messages reached for plan {plan_name}."
        )

    # 3. Generate Stream SSE
    async def sse_generator():
        # First save the user's message
        await save_message(req.userId, {"role": "user", "content": req.prompt}, req.projectId)
        await increment_usage(req.userId)

        try:
            # Trigger orchestrator
            response = await generate_response(
                prompt=prompt_clean(req.prompt),
                model_id=req.modelId,
                history=req.history,
                files=req.files,
                mode=req.mode,
                project_id=req.projectId,
                custom_instructions="",
                plan=plan_name,
                experimental=req.experimental,
                extended_thinking=req.extendedThinking,
                is_voice_interaction=req.isVoiceInteraction
            )

            assistant_content = ""
            
            # Streaming Response from HTTPX
            async for chunk in response.aiter_text():
                # Yield exactly what we read from the stream to match OpenAI/Groq chunk outputs
                assistant_content += parse_content_from_chunk(chunk)
                yield chunk

            # Once the stream finishes, save the assistant's complete response to database
            if assistant_content:
                await save_message(
                    req.userId, 
                    {"role": "assistant", "content": assistant_content}, 
                    req.projectId
                )

        except Exception as e:
            logger.error(f"[SSE Generator] Critical error: {str(e)}")
            err_data = json.dumps({"choices": [{"delta": {"content": f"\nError: {str(e)}"}}]})
            yield f"data: {err_data}\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")

def prompt_clean(text: str) -> str:
    return text.strip() if text else ""

def parse_content_from_chunk(chunk: str) -> str:
    """Accumulates text content from streamed chunks to persist to database."""
    content = ""
    lines = chunk.split("\n")
    for line in lines:
        if line.startswith("data:") and "[DONE]" not in line:
            try:
                data_json = json.loads(line[5:].strip())
                text = data_json.get("choices", [{}])[0].get("delta", {}).get("content", "")
                content += text
            except Exception:
                pass
    return content
