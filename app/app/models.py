from typing import Dict, List, TypedDict

class ModelConfig(TypedDict):
    provider: str
    id: str
    name: str
    description: str
    vision: bool
    tier: str

MODELS: List[ModelConfig] = [
    # --- CORE TIER (Free) - 5 Models ---
    {
        "provider": "groq",
        "id": "llama-3.1-8b-instant",
        "name": "Likeway Fast",
        "description": "Ultra-responsive and efficient for everyday streamlined tasks.",
        "vision": False,
        "tier": "Core",
    },
    {
        "provider": "groq",
        "id": "gemma2-9b-it",
        "name": "Likeway Scholar",
        "description": "Focused and precise knowledge retrieval for basic research.",
        "vision": False,
        "tier": "Core",
    },
    {
        "provider": "groq",
        "id": "llama-3.1-70b-versatile",
        "name": "Likeway Matrix",
        "description": "Versatile router model that excels at varied free-tier tasks.",
        "vision": False,
        "tier": "Core",
    },
    {
        "provider": "openrouter",
        "id": "google/gemini-2.5-flash",
        "name": "Likeway Insight",
        "description": "High-speed multimodal engine with basic image understanding.",
        "vision": True,
        "tier": "Core",
    },
    {
        "provider": "openrouter",
        "id": "meta-llama/llama-3.2-3b-instruct:free",
        "name": "Likeway Micro",
        "description": "Extremely lightweight logic processor for simple queries.",
        "vision": False,
        "tier": "Core",
    },

    # --- PLUS TIER (Mid Premium) - 5 Models ---
    {
        "provider": "groq",
        "id": "llama-3.3-70b-versatile",
        "name": "Likeway Versatile",
        "description": "Our flagship high-performance model for complex reasoning and analysis.",
        "vision": False,
        "tier": "Plus",
    },
    {
        "provider": "openrouter",
        "id": "openai/gpt-4o-mini",
        "name": "Likeway Velocity",
        "description": "Incredibly fast mid-tier intelligence with advanced vision.",
        "vision": True,
        "tier": "Plus",
    },
    {
        "provider": "openrouter",
        "id": "anthropic/claude-3-haiku",
        "name": "Likeway QuickThought",
        "description": "Lightning-fast and highly secure analysis engine.",
        "vision": True,
        "tier": "Plus",
    },
    {
        "provider": "openrouter",
        "id": "google/gemini-2.5-pro",
        "name": "Likeway Omni Vision",
        "description": "Advanced semantic understanding and deep image analysis.",
        "vision": True,
        "tier": "Plus",
    },
    {
        "provider": "openrouter",
        "id": "anthropic/claude-3.5-sonnet",
        "name": "Likeway Codex Elite",
        "description": "World-class coding capabilities and logical flow.",
        "vision": True,
        "tier": "Plus",
    },

    # --- PRO TIER (Elite/Frontier) - 5 Models ---
    {
        "provider": "openrouter",
        "id": "openai/gpt-4o",
        "name": "Likeway Sovereign",
        "description": "Comprehensive multimodal powerhouse with elite visual precision.",
        "vision": True,
        "tier": "Pro",
    },
    {
        "provider": "openrouter",
        "id": "openai/o1",
        "name": "Likeway Absolute",
        "description": "Ultra-high reasoning capacity for mathematical and scientific breakthroughs.",
        "vision": False,
        "tier": "Pro",
    },
    {
        "provider": "openrouter",
        "id": "openai/o3-mini",
        "name": "Likeway Architect",
        "description": "Next-gen deep thought routines optimized for immense logic validation.",
        "vision": False,
        "tier": "Pro",
    },
    {
        "provider": "openrouter",
        "id": "anthropic/claude-sonnet-4-5",
        "name": "Likeway Pinnacle",
        "description": "The absolute pinnacle of creative generation and structural mastery.",
        "vision": True,
        "tier": "Pro",
    },
    {
        "provider": "openrouter",
        "id": "x-ai/grok-2-vision-1212",
        "name": "Likeway Unbounded",
        "description": "Uncensored, real-time advanced multimodal engine.",
        "vision": True,
        "tier": "Pro",
    },
]
