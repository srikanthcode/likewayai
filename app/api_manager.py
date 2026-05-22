import logging
from typing import Dict, List, Set, Optional
import httpx
from .config import API_KEYS

logger = logging.getLogger("api_manager")
logging.basicConfig(level=logging.INFO)

class KeyPool:
    def __init__(self):
        self.keys: Dict[str, List[str]] = {
            "openrouter": API_KEYS["openrouter"],
            "groq": API_KEYS["groq"]
        }
        self.indices: Dict[str, int] = {
            "openrouter": 0,
            "groq": 0
        }
        self.failed_keys: Set[str] = set()

    def get_next_key(self, provider: str) -> Optional[str]:
        """Rotates key indices dynamically, skipping any keys that have been marked failed."""
        provider_keys = self.keys.get(provider, [])
        if not provider_keys:
            return None

        attempts = 0
        while attempts < len(provider_keys):
            index = self.indices[provider]
            key = provider_keys[index]
            self.indices[provider] = (index + 1) % len(provider_keys)

            if key not in self.failed_keys:
                return key
            attempts += 1
        return None

    def mark_key_failed(self, key: str):
        """Marks key as failed to isolate it from subsequent pool loops."""
        self.failed_keys.add(key)
        logger.warning(f"[KeyPool] Key marked failed: {key[:8]}...")

    def reset_provider(self, provider: str):
        """Clears isolated lists to retry previous pool keys."""
        provider_keys = self.keys.get(provider, [])
        for k in provider_keys:
            self.failed_keys.discard(k)

key_pool = KeyPool()

PROVIDER_URLS = {
    "groq": "https://api.groq.com/openai/v1/chat/completions",
    "openrouter": "https://openrouter.ai/api/v1/chat/completions"
}

async def fetch_ai(provider: str, url: str, json_body: dict) -> httpx.Response:
    """Sends async HTTP requests to the target provider, implementing key rotation and silent fallbacks."""
    providers_to_try = ["groq", "openrouter"] if provider == "groq" else ["openrouter", "groq"]
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        for current_provider in providers_to_try:
            current_url = PROVIDER_URLS.get(current_provider, url)
            
            while True:
                key = key_pool.get_next_key(current_provider)
                if key is None:
                    break  # Provider pool exhausted; loop to try next provider fallback

                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {key}",
                    "HTTP-Referer": "https://likeway.ai",
                    "X-Title": "Likeway AI"
                }

                try:
                    is_streaming = json_body.get("stream", False)
                    
                    if is_streaming:
                        req = client.build_request("POST", current_url, headers=headers, json=json_body)
                        response = await client.send(req, stream=True)
                    else:
                        response = await client.post(current_url, headers=headers, json=json_body)

                    if not response.is_success:
                        err_text = ""
                        try:
                            if not is_streaming:
                                err_text = response.text
                        except Exception:
                            pass

                        is_rate_limit = (
                            response.status_code == 429 or 
                            response.status_code == 413 or
                            "rate_limit" in err_text or
                            "limit" in err_text.lower() or
                            "tpm" in err_text.lower()
                        )

                        if is_rate_limit or response.status_code == 401 or response.status_code >= 500:
                            logger.warning(f"[Key Rotator] Provider {current_provider} key failed ({response.status_code}). Rotating...")
                            key_pool.mark_key_failed(key)
                            if is_streaming:
                                await response.aclose()
                            continue

                    return response
                except Exception as e:
                    logger.error(f"[Key Rotator] Request exception: {str(e)}")
                    key_pool.mark_key_failed(key)
                    continue

        raise Exception("Critical: All AI providers and keys are currently unavailable. Please try again in a moment.")
