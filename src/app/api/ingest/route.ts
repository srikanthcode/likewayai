import { ingestDocument } from "@/lib/rag";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const { content, title, projectId } = await req.json();
        
        if (!content) return new Response("Content is required", { status: 400 });

        await ingestDocument(content, { title, source: "manual-upload" }, projectId);

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error: any) {
        return new Response(error.message, { status: 500 });
    }
}
