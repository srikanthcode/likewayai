import { DoctorReport, ChannelHealth, ReachChannel } from "./types";
import { readWebpage } from "./channels/web";
import { readYouTube } from "./channels/youtube";
import { readGitHub } from "./channels/github";
import { readReddit } from "./channels/reddit";
import { readTwitter } from "./channels/twitter";
import { readRssFeed } from "./channels/rss";

export async function runDoctor(): Promise<DoctorReport> {
  const timestamp = new Date().toISOString();
  const channels: Partial<Record<ReachChannel, ChannelHealth>> = {};

  // Run probes concurrently
  const [webResult, ytResult, ghResult, redditResult, twitterResult, rssResult] = await Promise.allSettled([
    readWebpage("https://example.com"),
    readYouTube("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    readGitHub("https://github.com/octocat/Hello-World"),
    readReddit("https://www.reddit.com/r/technology"),
    readTwitter("https://x.com/OpenAI/status/1780000000000000000"),
    readRssFeed("https://news.ycombinator.com/rss"),
  ]);

  // Evaluate Web
  if (webResult.status === "fulfilled" && webResult.value.success) {
    channels.web = {
      status: "online",
      latencyMs: webResult.value.durationMs,
      primaryBackend: webResult.value.backendUsed,
      fallbackBackend: "Direct Fetch",
    };
  } else {
    channels.web = {
      status: "degraded",
      latencyMs: webResult.status === "fulfilled" ? webResult.value.durationMs : 0,
      primaryBackend: "Jina Reader",
      message: webResult.status === "fulfilled" ? webResult.value.error : "Probe failed",
    };
  }

  // Evaluate YouTube
  if (ytResult.status === "fulfilled" && ytResult.value.success) {
    channels.youtube = {
      status: "online",
      latencyMs: ytResult.value.durationMs,
      primaryBackend: ytResult.value.backendUsed,
      fallbackBackend: "Jina Reader",
    };
  } else {
    channels.youtube = {
      status: "degraded",
      latencyMs: ytResult.status === "fulfilled" ? ytResult.value.durationMs : 0,
      primaryBackend: "TimedText + oEmbed",
      message: ytResult.status === "fulfilled" ? ytResult.value.error : "Probe failed",
    };
  }

  // Evaluate GitHub
  if (ghResult.status === "fulfilled" && ghResult.value.success) {
    channels.github = {
      status: "online",
      latencyMs: ghResult.value.durationMs,
      primaryBackend: ghResult.value.backendUsed,
      fallbackBackend: "Raw Blob / Jina",
    };
  } else {
    channels.github = {
      status: "degraded",
      latencyMs: ghResult.status === "fulfilled" ? ghResult.value.durationMs : 0,
      primaryBackend: "GitHub REST API",
      message: ghResult.status === "fulfilled" ? ghResult.value.error : "Probe failed",
    };
  }

  // Evaluate Reddit
  if (redditResult.status === "fulfilled" && redditResult.value.success) {
    channels.reddit = {
      status: "online",
      latencyMs: redditResult.value.durationMs,
      primaryBackend: redditResult.value.backendUsed,
      fallbackBackend: "Jina Reader",
    };
  } else {
    channels.reddit = {
      status: "degraded",
      latencyMs: redditResult.status === "fulfilled" ? redditResult.value.durationMs : 0,
      primaryBackend: "Reddit JSON API",
      message: redditResult.status === "fulfilled" ? redditResult.value.error : "Probe failed",
    };
  }

  // Evaluate Twitter
  if (twitterResult.status === "fulfilled" && twitterResult.value.success) {
    channels.twitter = {
      status: "online",
      latencyMs: twitterResult.value.durationMs,
      primaryBackend: twitterResult.value.backendUsed,
      fallbackBackend: "Jina Reader (FxTwitter Proxy)",
    };
  } else {
    channels.twitter = {
      status: "degraded",
      latencyMs: twitterResult.status === "fulfilled" ? twitterResult.value.durationMs : 0,
      primaryBackend: "FxTwitter API",
      message: twitterResult.status === "fulfilled" ? twitterResult.value.error : "Probe failed",
    };
  }

  // Evaluate RSS
  if (rssResult.status === "fulfilled" && rssResult.value.success) {
    channels.rss = {
      status: "online",
      latencyMs: rssResult.value.durationMs,
      primaryBackend: rssResult.value.backendUsed,
      fallbackBackend: "Jina Reader",
    };
  } else {
    channels.rss = {
      status: "degraded",
      latencyMs: rssResult.status === "fulfilled" ? rssResult.value.durationMs : 0,
      primaryBackend: "Direct XML Stream Parser",
      message: rssResult.status === "fulfilled" ? rssResult.value.error : "Probe failed",
    };
  }

  const typedChannels = channels as Record<ReachChannel, ChannelHealth>;
  const healthyCount = Object.values(typedChannels).filter(c => c.status === "online").length;

  return {
    timestamp,
    healthyCount,
    totalChannels: Object.keys(typedChannels).length,
    channels: typedChannels,
  };
}
