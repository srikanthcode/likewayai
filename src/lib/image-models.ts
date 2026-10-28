/**
 * Image Generation Models & Pollinations Gen API Gateway
 *
 * Endpoint: https://gen.pollinations.ai/image/{prompt}
 * Authenticated via a Pollen key supplied through POLLINATIONS_API_KEY.
 * Features:
 *  - 100% watermark-free (nologo=true)
 *  - Unlisted / private prompts (private=true)
 *  - Exact pixel dimensions (1024x1024, 1344x768, etc.) without legacy downscaling
 *  - 17 production models with per-model RPMs
 */

// Never fall back to a literal key committed to source — that is a public
// credential. An unset key simply means image generation is unconfigured.
export const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY || "";
export const POLLINATIONS_GEN_ENDPOINT = "https://gen.pollinations.ai/image";

export interface ImageModelCatalogItem {
  id: string;
  name: string;
  cost: number | string;
  rpm: number | string;
  health: string;
  description?: string;
}

export const IMAGE_MODELS_CATALOG: ImageModelCatalogItem[] = [
  { id: "black-forest-labs/flux.2-klein-4b", name: "FLUX.2 Klein 4B", cost: 0.005, rpm: 60, health: "99.8%" },
  { id: "black-forest-labs/flux.1-schnell", name: "FLUX.1 Schnell", cost: 0.002, rpm: 60, health: "99.9%" },
  { id: "black-forest-labs/flux.1.1-pro", name: "FLUX 1.1 Pro", cost: 0.03, rpm: "—", health: "91.5% degraded" },
  { id: "black-forest-labs/flux.1-kontext-pro", name: "FLUX.1 Kontext Pro", cost: 0.03, rpm: "—", health: "100%" },
  { id: "tongyi-mai/z-image-turbo", name: "Z-Image Turbo", cost: 0.004, rpm: 60, health: "99.9%" },
  { id: "lykon/dreamshaper-8-lcm", name: "DreamShaper 8 LCM", cost: 0.0001, rpm: 300, health: "93.5% degraded" },
  { id: "community/MarcosFRG/sdxl-lightning", name: "SDXL Lightning", cost: 0.0012, rpm: 6, health: "98%" },
  { id: "openai/gpt-image-2", name: "GPT Image 2", cost: 0.0000225, rpm: "—", health: "100%" },
  { id: "openai/gpt-image-1.5", name: "GPT Image 1.5", cost: 0.000024, rpm: "—", health: "99.1%" },
  { id: "openai/gpt-image-1-mini", name: "GPT Image 1 Mini", cost: 0.000006, rpm: "—", health: "100%" },
  { id: "microsoft/mai-image-2.6", name: "MAI Image 2.6", cost: 0.0000285, rpm: 12, health: "100%" },
  { id: "microsoft/mai-image-2.6-flash", name: "MAI Image 2.6 Flash", cost: 0.00001425, rpm: 12, health: "97.8%" },
  { id: "community/sharktide/inferenceport-ai-lightning-image-plus", name: "Lightning Image Plus", cost: 0.25, rpm: "—", health: "97.6%" },
  { id: "community/sharktide/inferenceport-ai-lightning-image-turbo", name: "Lightning Image Turbo", cost: 0.02, rpm: "—", health: "100%" },
  { id: "community/tomdacatto/gpt-image-2.5-flare", name: "GPT Image 2.5 Flare", cost: 0.25, rpm: "—", health: "84.8%" },
  { id: "community/tomdacatto/gpt-image-2.5-sunburst", name: "GPT Image 2.5 Sunburst", cost: 0.0000225, rpm: "—", health: "88.9%" },
  { id: "community/vendouple/lucid-origin", name: "Lucid Origin", cost: 0.085, rpm: "—", health: "98%" },
];

export const DEFAULT_IMAGE_MODEL = "black-forest-labs/flux.1-schnell";

/**
 * Validates and normalizes model ID against supported catalog.
 * Falls back to DEFAULT_IMAGE_MODEL ("black-forest-labs/flux.1-schnell").
 */
export function resolveImageModel(model?: string): string {
  if (!model) return DEFAULT_IMAGE_MODEL;
  const match = IMAGE_MODELS_CATALOG.find(
    (m) => m.id.toLowerCase() === model.toLowerCase() || m.name.toLowerCase() === model.toLowerCase()
  );
  if (match) return match.id;

  // Handle common shorthand aliases
  if (model.includes("schnell")) return "black-forest-labs/flux.1-schnell";
  if (model.includes("klein")) return "black-forest-labs/flux.2-klein-4b";
  if (model.includes("sdxl")) return "community/MarcosFRG/sdxl-lightning";
  if (model.includes("gpt-image")) return "openai/gpt-image-2";
  if (model.includes("z-image")) return "tongyi-mai/z-image-turbo";

  return DEFAULT_IMAGE_MODEL;
}

export function getImageModelDisplayName(modelId: string): string {
  const item = IMAGE_MODELS_CATALOG.find((m) => m.id === modelId);
  return item ? item.name : "FLUX.1 Schnell";
}

export interface BuildImageUrlOptions {
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  seed?: number;
}

/**
 * Generates an authenticated, watermark-free, private image URL.
 */
export function buildPollinationsImageUrl(options: BuildImageUrlOptions): string {
  const encodedPrompt = encodeURIComponent(options.prompt.trim());
  const resolvedModel = resolveImageModel(options.model);
  const width = options.width || 1024;
  const height = options.height || 1024;
  const seed = options.seed !== undefined ? options.seed : Math.floor(Math.random() * 1000000);

  const queryParams = new URLSearchParams({
    width: width.toString(),
    height: height.toString(),
    nologo: "true",
    private: "true",
    model: resolvedModel,
    seed: seed.toString(),
    key: POLLINATIONS_API_KEY,
  });

  return `${POLLINATIONS_GEN_ENDPOINT}/${encodedPrompt}?${queryParams.toString()}`;
}
