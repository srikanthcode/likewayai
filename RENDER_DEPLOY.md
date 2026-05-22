# Render deployment (backend)

## Required settings

| Setting | Value |
| --- | --- |
| **Root Directory** | `backend` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `bash start.sh` |

Do **not** use `uvicorn app.app.main:app`. That path loads a nested package and breaks imports (`ModuleNotFoundError: No module named 'app.db'`).

## Environment variables

Set MongoDB and API keys in the Render dashboard (or link a `.env` group). The app reads standard env vars via `app/config.py`.

## Local check (from repo root)

```bash
cd backend
pip install -r requirements.txt
bash start.sh
```
