import { NextRequest, NextResponse } from "next/server";
import { fetchAI } from "@/lib/api-manager";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { code, error, stack, language, title } = await req.json();

    if (!code || !error) {
      return NextResponse.json({ error: "Code and error are required" }, { status: 400 });
    }

    const systemPrompt = `You are a Principal Software Engineer and master debugger at LikeWay AI.
Your job is to fix compilation and runtime errors in web applications (React, TSX, HTML, JavaScript).
You must return a clean, fully-working drop-in replacement of the code.

Follow these strict rules:
1. Fix the exact bug described in the error message.
2. Preserve all existing functionality, styles, and logic.
3. Return ONLY valid JSON in this exact structure:
{
  "explanation": "Brief 1-2 sentence description of what was broken and how it was fixed.",
  "repairedCode": "The complete, working corrected source code with no markdown wrapping"
}
Do NOT include markdown backticks or commentary outside the JSON.`;

    const userPrompt = `Here is the broken code (${language || "react"}):
\`\`\`
${code}
\`\`\`

Here is the error encountered in the Live Preview sandbox:
Error: ${error}
${stack ? `Stack Trace:\n${stack}` : ""}

Please fix this bug and return the complete corrected code.`;

    const aiResponse = await fetchAI("openrouter", "https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-6-astra",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
    });

    const data = await aiResponse.json();
    const content = data.choices?.[0]?.message?.content || data.content || "";

    // Parse JSON from response
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        success: false,
        error: "AI failed to produce structured repair output",
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      explanation: parsed.explanation || "Fixed preview runtime error.",
      repairedCode: parsed.repairedCode || code,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to repair code with AI" },
      { status: 500 }
    );
  }
}
