import { ingestDocument } from "@/lib/rag";
import { NextRequest } from "next/server";
import { requireIdentity, unauthorizedResponse } from "@/lib/request-auth";

const MAX_INGEST_CHARS = 500_000;

export async function POST(req: NextRequest) {
    try {
        // Ingested documents become part of a project's knowledge base, so the
        // owner must be identified and the document scoped to that owner.
        const identity = requireIdentity(req);
        if (!identity) return unauthorizedResponse();

        const { content, title, projectId } = await req.json();

        if (!content || typeof content !== "string") {
            return new Response("Content is required", { status: 400 });
        }
        if (content.length > MAX_INGEST_CHARS) {
            return new Response("Document is too large", { status: 413 });
        }

        await ingestDocument(content, { title, source: "manual-upload" }, projectId, identity.userId!);

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error: any) {
        return new Response(error.message, { status: 500 });
    }
}
