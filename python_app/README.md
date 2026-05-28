# Likeway AI: Production-Ready Python FastAPI Backend

This is the fully converted, high-performance **Python FastAPI** backend for Likeway AI. It completely mirrors all features of the TypeScript Next.js API layer and incorporates asynchronous database drivers, key rotation pool logic, temporal query context syntheses, and vector similarity RAG lookups.

---

## ⚡ Key Architecture & Features

1. **Async Web Engine (FastAPI):** Standard async server supporting high-throughput non-blocking operations and high-velocity completions streaming.
2. **Motor Driver:** Asynchronous interface to MongoDB Atlas database `zynthex_ai` (for chats, limits, and users) and `gemma-ai` (for projects) ensuring 100% reverse compatibility.
3. **Key Rotation Pool (`httpx`):** Dynamically loops through OpenRouter and Groq keys, auto-isolates failed API credentials, and silently fallbacks between providers during network spikes.
4. **SSE Streaming Router:** Streams completions compliant with standard OpenAI Server-Sent Events structure and logs responses inside database in background upon completion.

---

## 🚀 Startup Guide

### 1. Install Dependencies
Initialize a virtual environment and install the required modules:
```bash
cd python_backend
pip install -r requirements.txt
```

### 2. Startup Server
Launch the ASGI production development server:
```bash
uvicorn app.main:app --port 8000 --reload
```

---

## 📖 Auto-Generated API Documentation
Once running, FastAPI compiles and hosts rich, interactive OpenAPI Swagger documentations. Visit the local URL:
* **Interactive Swagger UI:** `http://localhost:8000/docs`
* **Alternative Redocly UI:** `http://localhost:8000/redoc`

---

## 📁 File Structure Map
* `app/main.py`: Entrypoint routes and SSE streaming generator.
* `app/db.py`: Async Motor client and conversation database logs.
* `app/api_manager.py`: Key rotator class and httpx routing.
* `app/orchestrator.py`: temporal prompts inject and tool-probe checks.
* `app/plans.py` & `app/models.py`: Plans token levels and 15 models registry.
* `app/rag.py`: Similarity search vector index seeding.
