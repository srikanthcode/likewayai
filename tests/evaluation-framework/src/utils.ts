import { execSync } from "child_process";
import { cpus, totalmem, freemem } from "os";
import type { SystemInfo, CategoryMetrics } from "./types.js";

export function getSystemInfo(): SystemInfo {
  return {
    nodeVersion: process.version,
    platform: `${process.platform} ${process.arch}`,
    cpus: cpus().length,
    memoryGb: Math.round(totalmem() / (1024 * 1024 * 1024) * 10) / 10,
  };
}

export function weightedScore(metrics: CategoryMetrics, weights: CategoryMetrics): number {
  const total = Object.entries(weights).reduce((sum, [key, weight]) => {
    return sum + (metrics[key as keyof CategoryMetrics] || 0) * weight;
  }, 0);
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  return totalWeight > 0 ? Math.round(total / totalWeight) : 0;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const min = Math.floor(ms / 60000);
  const sec = Math.round((ms % 60000) / 1000);
  return `${min}m ${sec}s`;
}

export function extractCodeBlocks(text: string): string[] {
  const regex = /```(?:\w+)?\s*\n([\s\S]*?)```/g;
  const blocks: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

export function extractJson(text: string): Record<string, any> | null {
  const jsonRegex = /```(?:json)?\s*\n?({[\s\S]*?})\n?\s*```/;
  const match = text.match(jsonRegex);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
  // Try finding JSON without code block
  const directMatch = text.match(/\{[\s\S]*\}/);
  if (directMatch) {
    try {
      return JSON.parse(directMatch[0]);
    } catch {
      return null;
    }
  }
  return null;
}

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}
