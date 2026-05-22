import os
from dotenv import load_dotenv

# Automatically locate and load the .env.local file from the project's root folder
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(base_dir, ".env.local")

if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

def get_keys(env_var: str) -> list[str]:
    """Helper to parse comma-separated lists of keys in the environment."""
    val = os.getenv(env_var, "")
    if not val:
        return []
    return [k.strip() for k in val.split(",") if k.strip()]

API_KEYS = {
    "openrouter": get_keys("OPENROUTER_KEYS"),
    "groq": get_keys("GROQ_KEYS"),
    "tavily": os.getenv("TAVILY_API_KEY", ""),
    "openai": os.getenv("OPENAI_API_KEY", ""),
    "image": get_keys("IMAGE_GENERATION_KEYS"),
    "searxng": os.getenv("SEARXNG_URL", "http://localhost:8080"),
    "brave": os.getenv("BRAVE_API_KEY", ""),
    "firecrawl": os.getenv("FIRECRAWL_API_KEY", ""),
    "mongodb_uri": os.getenv("MONGODB_URI", "mongodb://localhost:27101"),
}
