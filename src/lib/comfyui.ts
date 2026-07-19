/**
 * ComfyUI Client — connects to a self-hosted ComfyUI instance
 * Supports FLUX, SDXL, HiDream, and custom workflows
 */

const COMFYUI_URL = process.env.COMFYUI_URL || "http://localhost:8188";

export interface ComfyUIWorkflow {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  seed?: number;
  model?: string;
  sampler?: string;
  scheduler?: string;
}

export interface ComfyUIResult {
  success: boolean;
  imageBase64?: string;
  imageUrl?: string;
  error?: string;
  duration?: number;
}

// Model router — selects the best model based on prompt content
export function selectModel(prompt: string): {
  checkpoint: string;
  modelType: "flux" | "sdxl" | "hidream" | "pony";
} {
  const lower = prompt.toLowerCase();

  // Anime / cartoon detection
  if (/\b(anime|manga|cartoon|chibi|kawaii|waifu|otaku|pixar|ghibli)\b/i.test(lower)) {
    return { checkpoint: "ponyDiffusionV6XL.safetensors", modelType: "pony" };
  }

  // Illustration / art detection
  if (/\b(illustration|artwork|painting|watercolor|oil paint|sketch|drawing|concept art|fantasy art)\b/i.test(lower)) {
    return { checkpoint: "sd_xl_base_1.0.safetensors", modelType: "sdxl" };
  }

  // Photorealistic detection
  if (/\b(realistic|photo|photograph|portrait|real|hyperrealistic|8k|cinematic|professional photography)\b/i.test(lower)) {
    return { checkpoint: "hidream_i1_dev.safetensors", modelType: "hidream" };
  }

  // Default: FLUX Schnell (fastest, Apache 2.0 licensed)
  return { checkpoint: "flux1-schnell.safetensors", modelType: "flux" };
}

// Enhance prompt for better image quality
export function enhancePrompt(prompt: string): string {
  const lower = prompt.toLowerCase();

  // If prompt already has quality tags, return as-is
  if (/\b(8k|4k|highly detailed|sharp focus|professional)\b/i.test(lower)) {
    return prompt;
  }

  const isPhoto = /\b(photo|photograph|portrait|realistic|real|person|people|face)\b/i.test(lower);
  const isArt = /\b(illustration|artwork|painting|sketch|drawing|art|fantasy)\b/i.test(lower);
  const isAnime = /\b(anime|manga|cartoon|chibi|kawaii)\b/i.test(lower);

  if (isPhoto) {
    return `${prompt}, ultra realistic, soft cinematic lighting, 8K, professional photography, sharp focus, high detail, depth of field, RAW photo`;
  }

  if (isArt) {
    return `${prompt}, highly detailed, artstation, concept art, sharp focus, dramatic lighting, trending on artstation, 4K`;
  }

  if (isAnime) {
    return `${prompt}, anime style, vibrant colors, detailed, high quality, studio ghibli inspired`;
  }

  // Generic enhancement
  return `${prompt}, highly detailed, sharp focus, professional, 4K, high quality`;
}

// Build a ComfyUI workflow JSON (simplified for common models)
function buildWorkflow(config: ComfyUIWorkflow, checkpoint: string): any {
  const seed = config.seed ?? Math.floor(Math.random() * 2147483647);
  const width = config.width ?? 1024;
  const height = config.height ?? 1024;
  const steps = config.steps ?? 20;
  const cfg = config.cfg ?? 7;
  const sampler = config.sampler ?? "euler";
  const scheduler = config.scheduler ?? "normal";
  const negative = config.negative_prompt ?? "ugly, blurry, low quality, deformed, disfigured";

  // FLUX uses different parameters
  const isFlux = checkpoint.toLowerCase().includes("flux");

  return {
    prompt: {
      // Checkpoint loader
      "1": {
        class_type: "CheckpointLoaderSimple",
        inputs: { ckpt_name: checkpoint },
      },
      // CLIP text encoder (positive)
      "2": {
        class_type: "CLIPTextEncode",
        inputs: {
          text: config.prompt,
          clip: ["6", 0],
        },
      },
      // CLIP text encoder (negative)
      "3": {
        class_type: "CLIPTextEncode",
        inputs: {
          text: isFlux ? "" : negative,
          clip: ["6", 0],
        },
      },
      // Empty latent image
      "4": {
        class_type: "EmptyLatentImage",
        inputs: { width, height, batch_size: 1 },
      },
      // KSampler
      "5": {
        class_type: "KSampler",
        inputs: {
          model: ["6", 0],
          positive: ["2", 0],
          negative: ["3", 0],
          latent_image: ["4", 0],
          seed,
          steps: isFlux ? 4 : steps,
          cfg: isFlux ? 1 : cfg,
          sampler_name: isFlux ? "euler" : sampler,
          scheduler: isFlux ? "simple" : scheduler,
          denoise: 1.0,
        },
      },
      // Checkpoint (model loader passthrough)
      "6": {
        class_type: "CheckpointLoaderSimple",
        inputs: { ckpt_name: checkpoint },
      },
      // VAE Decode
      "7": {
        class_type: "VAEDecode",
        inputs: {
          samples: ["5", 0],
          vae: ["6", 2],
        },
      },
      // Save image
      "8": {
        class_type: "SaveImage",
        inputs: {
          images: ["7", 0],
          filename_prefix: "likeway_gen",
        },
      },
    },
  };
}

// Queue a prompt in ComfyUI
async function queuePrompt(workflow: any): Promise<string | null> {
  try {
    const res = await fetch(`${COMFYUI_URL}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workflow),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.prompt_id || null;
  } catch {
    return null;
  }
}

// Poll for completion and get the image
async function waitForResult(promptId: string, timeoutMs = 120000): Promise<ComfyUIResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await fetch(`${COMFYUI_URL}/history/${promptId}`, {
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const history = await res.json();
        const entry = history[promptId];

        if (entry?.outputs) {
          // Find the SaveImage node output
          for (const nodeId of Object.keys(entry.outputs)) {
            const output = entry.outputs[nodeId];
            if (output.images?.length > 0) {
              const img = output.images[0];
              const imgUrl = `${COMFYUI_URL}/view?filename=${img.filename}&subfolder=${img.subfolder || ""}&type=${img.type || "output"}`;

              // Fetch as base64
              const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(10000) });
              if (imgRes.ok) {
                const buffer = await imgRes.arrayBuffer();
                const base64 = Buffer.from(buffer).toString("base64");
                const ext = img.filename.split(".").pop() || "png";
                return {
                  success: true,
                  imageBase64: `data:image/${ext};base64,${base64}`,
                  imageUrl: imgUrl,
                  duration: Date.now() - startTime,
                };
              }
            }
          }
        }
      }
    } catch {
      // continue polling
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  return { success: false, error: "ComfyUI generation timed out", duration: Date.now() - startTime };
}

// Main generation function
export async function generateWithComfyUI(
  workflowConfig: ComfyUIWorkflow
): Promise<ComfyUIResult> {
  const startTime = Date.now();

  // Select model based on prompt
  const { checkpoint } = selectModel(workflowConfig.prompt);

  // Enhance prompt
  const enhancedPrompt = enhancePrompt(workflowConfig.prompt);

  // Build workflow
  const workflow = buildWorkflow(
    { ...workflowConfig, prompt: enhancedPrompt },
    checkpoint
  );

  // Queue prompt
  const promptId = await queuePrompt(workflow);
  if (!promptId) {
    return {
      success: false,
      error: "Failed to connect to ComfyUI. Is it running?",
      duration: Date.now() - startTime,
    };
  }

  // Wait for result
  return waitForResult(promptId);
}

// Health check
export async function checkComfyUIHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${COMFYUI_URL}/system_stats`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
