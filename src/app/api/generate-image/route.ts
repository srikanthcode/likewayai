import { NextRequest, NextResponse } from "next/server";
import { generateWithComfyUI, checkComfyUIHealth, enhancePrompt, selectModel } from "@/lib/comfyui";
import { generateImage } from "@/lib/tools";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";
import { consumeEntitlement, entitlementDenied } from "@/lib/entitlements";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    // ── Auth + entitlement (this route previously had NO gating at all) ──
    const tokens = getTokenFromCookies(req);
    const payload = tokens.access ? verifyAccessToken(tokens.access) : null;
    if (!payload) {
      return NextResponse.json({ error: "Sign in to generate images." }, { status: 401 });
    }

    const entitlement = await consumeEntitlement(
      payload.sub,
      payload.plan,
      "image_generation",
      payload.role
    );
    if (!entitlement.allowed) {
      return NextResponse.json(entitlementDenied(entitlement), { status: 402 });
    }

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

    // Cloud generation: Authenticated Gen API (100% watermark-free, exact dimensions)
    const { buildPollinationsImageUrl, resolveImageModel, getImageModelDisplayName, IMAGE_MODELS_CATALOG, DEFAULT_IMAGE_MODEL } = await import("@/lib/image-models");
    const resolvedModel = resolveImageModel(model);
    const imageUrl = buildPollinationsImageUrl({
      prompt,
      model: resolvedModel,
      width,
      height,
    });
    const displayName = getImageModelDisplayName(resolvedModel);

    return NextResponse.json({
      success: true,
      imageUrl,
      model: displayName,
      modelId: resolvedModel,
      prompt,
      width,
      height,
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

// GET — health check and 17 image models catalog info
export async function GET(req: NextRequest) {
  const comfyAvailable = await checkComfyUIHealth();
  const { IMAGE_MODELS_CATALOG, DEFAULT_IMAGE_MODEL } = await import("@/lib/image-models");

  return NextResponse.json({
    comfyui: comfyAvailable ? "connected" : "disconnected",
    comfyuiUrl: process.env.COMFYUI_URL || "http://localhost:8188",
    models: IMAGE_MODELS_CATALOG,
    defaultModel: DEFAULT_IMAGE_MODEL,
    totalModels: IMAGE_MODELS_CATALOG.length,
    endpoint: "https://gen.pollinations.ai/image/{prompt}",
  });
}
