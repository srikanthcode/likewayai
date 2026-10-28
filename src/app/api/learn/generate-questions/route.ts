import { NextRequest, NextResponse } from "next/server";
import { fetchAI } from "@/lib/api-manager";
import { requireIdentity, unauthorizedResponse } from "@/lib/request-auth";
import { consumeEntitlement, entitlementDenied, resolveEffectivePlan } from "@/lib/entitlements";

// POST /api/learn/generate-questions
export async function POST(req: NextRequest) {
  try {
    // Paid LLM call — never an open proxy.
    const identity = requireIdentity(req);
    if (!identity) return unauthorizedResponse();

    const plan = await resolveEffectivePlan(identity.userId!, identity.plan, identity.role);
    const entitlement = await consumeEntitlement(
      identity.userId!,
      plan,
      "chat_messages",
      identity.role
    );
    if (!entitlement.allowed) {
      return NextResponse.json(entitlementDenied(entitlement), { status: 402 });
    }

    const { courseId, moduleTitle, difficulty, count = 5 } = await req.json();

    const systemPrompt = `You are an expert educational content creator. Generate ${count} high-quality practice questions for the course "${courseId}" (Module: ${moduleTitle}) at ${difficulty} level.

Return a JSON array of objects with this structure:
{
  "id": "gen_unique_id",
  "type": "mcq" | "output" | "fill_blank",
  "question": "The question text",
  "options": ["A", "B", "C", "D"], // only for mcq/output
  "answer": "The correct option or text",
  "explanation": "Brief pedagogical explanation",
  "difficulty": "${difficulty}",
  "xp": 10-25
}

Rules:
- Questions must be technically accurate.
- Explanations should be helpful and clear.
- For "output" type, provide a code snippet in the question and ask for output.
- Return ONLY the JSON array.`;

    const response = await fetchAI("openrouter", "https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001", // Fast and cheap for generation
        messages: [{ role: "user", content: systemPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!response.ok) throw new Error("AI generation failed");

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    // Parse the JSON array from the response
    let questions = [];
    try {
      const parsed = JSON.parse(content);
      questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
    } catch {
      // Fallback: simple extraction if AI didn't follow JSON format perfectly
      const match = content.match(/\[[\s\S]*\]/);
      if (match) questions = JSON.parse(match[0]);
    }

    return NextResponse.json({ questions });
  } catch (error: any) {
    console.error("[Question Gen] Error:", error);
    return NextResponse.json({ error: "Failed to generate questions", questions: [] }, { status: 500 });
  }
}
