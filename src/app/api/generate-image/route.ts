import { NextRequest, NextResponse } from "next/server";
import { generateWithComfyUI, checkComfyUIHealth, enhancePrompt, selectModel } from "@/lib/comfyui";
import { generateImage } from "@/lib/tools";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, width = 1024, height = 1024, model } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (prompt.length > 2000) {
      return NextResponse.json({ error: "Prompt too long (max 2000 chars)" }, { status: 400 });
    }

    // Check if ComfyUI is available
    const comfyAvailable = await checkComfyUIHealth();

    if (comfyAvailable) {
      // Use self-hosted ComfyUI
      const enhancedPrompt = enhancePrompt(prompt);
      const { checkpoint, modelType } = selectModel(prompt);

      const result = await generateWithComfyUI({
        prompt: enhancedPrompt,
        width,
        height,
        model: model || checkpoint,
      });

      if (result.success && result.imageBase64) {
        return NextResponse.json({
          success: true,
          imageUrl: result.imageBase64,
          model: `ComfyUI / ${modelType.toUpperCase()}`,
          prompt: prompt,
          enhancedPrompt: enhancedPrompt,
          duration: result.duration,
          source: "comfyui",
        });
      }

      // ComfyUI failed, fall through to cloud fallback
      console.warn("[Image Gen] ComfyUI failed, falling back to cloud:", result.error);
    }

    // Cloud fallback: Pollinations / OpenRouter / HuggingFace / Stability
    const cloudResult = await generateImage(prompt);
    return NextResponse.json({
      success: true,
      imageUrl: cloudResult,
      model: "Cloud Fallback (Pollinations)",
      prompt: prompt,
      source: "cloud",
    });
  } catch (error: any) {
    console.error("[Image Gen] Error:", error);
    return NextResponse.json(
      { error: error.message || "Image generation failed" },
      { status: 500 }
    );
  }
}

// GET — health check and model info
export async function GET(req: NextRequest) {
  const comfyAvailable = await checkComfyUIHealth();

  return NextResponse.json({
    comfyui: comfyAvailable ? "connected" : "disconnected",
    comfyuiUrl: process.env.COMFYUI_URL || "http://localhost:8188",
    models: {
      flux: "FLUX Schnell (fast, Apache 2.0)",
      sdxl: "SDXL (quality, open)",
      hidream: "HiDream (photorealistic)",
      pony: "Pony XL (anime/illustration)",
    },
    cloudFallback: "Pollinations / OpenRouter / HuggingFace / Stability AI",
  });
}
