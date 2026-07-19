/**
 * LikeWay Browser — Task Planner
 *
 * Converts natural language tasks into structured browser automation plans.
 */

export interface AutomationStep {
  action: "navigate" | "click" | "type" | "screenshot" | "wait" | "evaluate" | "scroll" | "select" | "hover" | "extract";
  selector?: string;
  value?: string;
  url?: string;
  script?: string;
  description: string;
}

export interface AutomationPlan {
  task: string;
  steps: AutomationStep[];
  estimatedTime: number;
}

export async function planAutomation(
  task: string,
  fetchAI: (provider: any, url: string, options: any) => Promise<Response>,
  modelId: string,
  provider: string
): Promise<AutomationPlan> {
  const systemPrompt = `You are LikeWay Browser's task planner. Convert natural language into browser automation steps.

Return ONLY a valid JSON array. Each step:
- action: "navigate" | "click" | "type" | "screenshot" | "wait" | "scroll" | "select" | "hover" | "extract"
- url: required for "navigate"
- selector: CSS selector for click/type/select/hover/extract
- value: text to type, option value, wait ms, or scroll direction ("down"/"up")
- description: short human-readable step description

Example — "Go to Google, search for cats, take screenshot":
[
  {"action":"navigate","url":"https://www.google.com","description":"Open Google"},
  {"action":"type","selector":"textarea[name='q']","value":"cats","description":"Type search query"},
  {"action":"click","selector":"input[name='btnK']","description":"Click search button"},
  {"action":"wait","value":"2000","description":"Wait for results"},
  {"action":"screenshot","description":"Capture search results"}
]

Rules:
- Use real CSS selectors (#id, .class, tag, attribute)
- Always add wait steps after navigation (2000ms) and clicks (1000ms)
- End with screenshot or extract based on task
- Max 15 steps — be efficient
- Return ONLY the JSON array`;

  const url =
    provider === "groq"
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";

  const response = await fetchAI(provider, url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: task },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) throw new Error("AI planning failed");

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "[]";

  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No valid plan generated");

  const steps: AutomationStep[] = JSON.parse(jsonMatch[0]);

  return {
    task,
    steps,
    estimatedTime: steps.length * 2000,
  };
}
