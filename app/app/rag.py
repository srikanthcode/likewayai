import random
from typing import Dict, List, Any, Optional

class SimpleVectorStore:
    def __init__(self):
        self.docs: List[Dict[str, Any]] = []

    def add_document_sync(self, doc: Dict[str, Any]):
        """Adds a document to the index synchronously."""
        self.docs.append(doc)

    async def add_document(self, doc: Dict[str, Any]):
        self.docs.append(doc)

    async def similarity_search(self, query: str, project_id: str = "default", k: int = 5) -> List[Dict[str, Any]]:
        """Performs word-frequency similarity scoring and priority ranking over matching contexts."""
        query_lower = query.lower()
        words = [w for w in query_lower.split() if len(w) > 2]
        
        ranked = []
        for doc in self.docs:
            doc_project = doc.get("projectId", "default")
            if doc_project and doc_project != project_id and doc_project != "default":
                continue
                
            score = 0
            content = doc["content"].lower()
            title = doc["metadata"].get("title", "").lower()
            
            # 1. Exact phrase matches (High weight)
            if query_lower in content:
                score += 10
            if query_lower in title:
                score += 15
                
            # 2. Individual keyword density
            for word in words:
                if word in content:
                    count = content.count(word)
                    score += min(count, 5)
                if word in title:
                    score += 5
                    
            # 3. Priority weightings
            if doc["metadata"].get("priority") == "high":
                score *= 1.5
                
            if score > 2:
                ranked.append((doc, score))
                
        ranked.sort(key=lambda x: x[1], reverse=True)
        return [r[0] for r in ranked[:k]]

rag_store = SimpleVectorStore()

async def get_context(query: str, project_id: str = "default") -> str:
    """Returns formatted context string to be appended as Ground Truth to the orchestrator prompts."""
    docs = await rag_store.similarity_search(query, project_id)
    if not docs:
        return ""
    
    parts = []
    for d in docs:
        parts.append(f"Source: {d['metadata'].get('title')}\n{d['content']}\n---")
    joined = "\n".join(parts)
    return f"\n\n[PROJECT CONTEXT & ATTACHED DATA]\n{joined}\n\n"

async def ingest_document(content: str, metadata: Optional[Dict[str, Any]] = None, project_id: str = "default"):
    if metadata is None:
        metadata = {}
    doc_id = "".join(random.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=7))
    await rag_store.add_document({
        "id": doc_id,
        "content": content,
        "metadata": metadata,
        "projectId": project_id
    })

# Safely seed RAG store synchronously at module load time
rag_store.add_document_sync({
    "id": "seed_intro",
    "content": "Likeway AI is a state-of-the-art AI orchestrator designed for high-speed reasoning and multi-modal interaction. It uses a sophisticated pooling system to ensure high availability across multiple model providers including OpenRouter and Groq.",
    "metadata": {"title": "Introduction", "category": "General"},
    "projectId": "default"
})

rag_store.add_document_sync({
    "id": "seed_multimodal",
    "content": "To use multi-modal features, simply click the + icon in the message bar and attach an image. The orchestrator will automatically route the request to a vision-capable model like GPT-4o or Claude 3.5 Sonnet.",
    "metadata": {"title": "Multi-modal Guide", "category": "Usage"},
    "projectId": "default"
})
