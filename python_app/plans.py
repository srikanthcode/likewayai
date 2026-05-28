from typing import Dict, TypedDict, List

class PlanLimits(TypedDict):
    messagesDay: int
    researchTasks: int
    projects: int
    contextTokens: int

class PlanDetails(TypedDict):
    id: str
    name: str
    price: str
    features: List[str]
    color: str
    limits: PlanLimits

PLANS: Dict[str, PlanDetails] = {
    "Core": {
        "id": "Core",
        "name": "Core",
        "price": "Free",
        "features": ["Core model", "Limited messages and uploads", "Limited image creation", "Limited memory"],
        "color": "#94a3b8",
        "limits": {
            "messagesDay": 15,
            "researchTasks": 0,
            "projects": 0,
            "contextTokens": 2000,
        }
    },
    "Go": {
        "id": "Go",
        "name": "Go",
        "price": "₹399",
        "features": ["Core model", "More messages and uploads", "More image creation", "Longer memory", "Expanded voice mode"],
        "color": "#10b981",
        "limits": {
            "messagesDay": 100,
            "researchTasks": 5,
            "projects": 3,
            "contextTokens": 16384,
        }
    },
    "Plus": {
        "id": "Plus",
        "name": "Plus",
        "price": "₹1999",
        "features": [
            "Advanced logical models", 
            "Generate code and visualize data",
            "Connect Slack and Google Workspace",
            "Extended thinking for complex work",
            "Built-in web search & analysis",
            "Likeway Code directly in your codebase",
            "Power through tasks with Cowork",
            "Projects and custom GPTs",
            "Deep research capabilities"
        ],
        "color": "#06b6d4",
        "limits": {
            "messagesDay": 500,
            "researchTasks": 50,
            "projects": 20,
            "contextTokens": 128000,
        }
    },
    "Pro": {
        "id": "Pro",
        "name": "Pro",
        "price": "₹10,699",
        "features": [
            "Everything in Plus, plus:",
            "Frontier Pro models (v1/o1)",
            "Up to 20x more usage than Plus*",
            "Higher output limits for all tasks",
            "Priority access at high traffic times",
            "Likeway in PowerPoint",
            "Chat on web, iOS, Android, and desktop",
            "Early access to advanced AI features"
        ],
        "color": "#8b5cf6",
        "limits": {
            "messagesDay": 10000,
            "researchTasks": 1000,
            "projects": 1000,
            "contextTokens": 2000000,
        }
    }
}

PLAN_HIERARCHY: Dict[str, int] = {
    "Core": 0,
    "Go": 1,
    "Plus": 2,
    "Pro": 3
}

def is_feature_unlocked(current_plan: str, required_tier: str) -> bool:
    """Check if the user's plan is high enough to access a given feature tier."""
    return PLAN_HIERARCHY.get(current_plan, 0) >= PLAN_HIERARCHY.get(required_tier, 0)
