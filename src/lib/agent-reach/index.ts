import { ReachChannel, ReachResult } from "./types";
import { readWebpage } from "./channels/web";
import { readYouTube } from "./channels/youtube";
import { readGitHub } from "./channels/github";
import { readReddit } from "./channels/reddit";
import { readTwitter } from "./channels/twitter";
import { readRssFeed } from "./channels/rss";
import { runDoctor } from "./doctor";

export * from "./types";
export { runDoctor };
export { readWebpage, readYouTube, readGitHub, readReddit, readTwitter, readRssFeed };

/**
 * Extract URLs from a user prompt or text block
 */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s<>'"]+)/gi;
  const matches = text.match(urlRegex) || [];
  return Array.from(new Set(matches.map(u => u.replace(/[.,!?;:]+$/, ""))));
}

/**
 * Auto-detects the channel from a URL
 */
export function detectChannel(url: string): ReachChannel {
  const lower = url.toLowerCase();
  if (lower.includes("youtube.com/") || lower.includes("youtu.be/")) {
    return "youtube";
  }
  if (lower.includes("github.com/")) {
    return "github";
  }
  if (lower.includes("reddit.com/r/") || lower.includes("redd.it/")) {
    return "reddit";
  }
  if (lower.includes("twitter.com/") || lower.includes("x.com/")) {
    return "twitter";
  }
  if (
    lower.endsWith(".rss") ||
    lower.endsWith(".xml") ||
    lower.includes("/feed") ||
    lower.includes("/rss") ||
    lower.includes("/atom")
  ) {
    return "rss";
  }
  return "web";
}

/**
 * Primary Agent Reach orchestrator:
 * Automatically selects the best zero-config, multi-backend channel to extract
 * full content from the provided URL.
 */
export async function reach(url: string): Promise<ReachResult> {
  const channel = detectChannel(url);

  switch (channel) {
    case "youtube":
      return readYouTube(url);
    case "github":
      return readGitHub(url);
    case "reddit":
      return readReddit(url);
    case "twitter":
      return readTwitter(url);
    case "rss":
      return readRssFeed(url);
    case "web":
    default:
      return readWebpage(url);
  }
}

/**
 * Fetches multiple URLs concurrently with safe concurrency limits
 */
export async function reachAll(urls: string[]): Promise<ReachResult[]> {
  const uniqueUrls = Array.from(new Set(urls)).slice(0, 5); // Safe cap for AI context
  const promises = uniqueUrls.map(u => reach(u));
  return Promise.all(promises);
}
