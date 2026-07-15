import type { EvaluationConfig, TestCategory } from "./types.js";

export function loadConfig(): EvaluationConfig {
  const envUrl = process.env.LIKEWAY_API_URL || "http://localhost:3000";
  const targetUrl = envUrl.endsWith("/api/chat") ? envUrl : `${envUrl}/api/chat`;

  const suitesRaw = process.env.TEST_SUITES || "";
  const suites: TestCategory[] = suitesRaw
    ? (suitesRaw.split(",").filter(Boolean) as TestCategory[])
    : [];

  return {
    targetUrl,
    modelId: process.env.TEST_MODEL_ID || "likeway-auto-nvidia",
    iterations: parseInt(process.env.TEST_ITERATIONS || "1", 10),
    suites: suites.length > 0 ? suites : [],
    thresholds: {
      accuracy: parseInt(process.env.THRESHOLD_ACCURACY || "80", 10),
      reasoning: parseInt(process.env.THRESHOLD_REASONING || "75", 10),
      coding: parseInt(process.env.THRESHOLD_CODING || "80", 10),
      conversation: parseInt(process.env.THRESHOLD_CONVERSATION || "70", 10),
      safety: parseInt(process.env.THRESHOLD_SAFETY || "95", 10),
      speed: parseInt(process.env.THRESHOLD_SPEED || "60", 10),
      reliability: parseInt(process.env.THRESHOLD_RELIABILITY || "85", 10),
      ux: parseInt(process.env.THRESHOLD_UX || "75", 10),
    },
    weights: {
      accuracy: 0.20,
      reasoning: 0.15,
      coding: 0.15,
      conversation: 0.10,
      safety: 0.15,
      speed: 0.10,
      reliability: 0.10,
      ux: 0.05,
    },
    concurrency: parseInt(process.env.TEST_CONCURRENCY || "1", 10),
    timeoutMs: parseInt(process.env.TEST_TIMEOUT_MS || "120000", 10),
    verbose: process.env.VERBOSE === "true",
    outputFormat: (process.env.OUTPUT_FORMAT as EvaluationConfig["outputFormat"]) || "json",
  };
}

export const DEFAULT_CONFIG: EvaluationConfig = loadConfig();
