/**
 * LikeWay Agent Reach — Internet Capability & Multi-Platform Extraction Layer
 * Provides zero-configuration, multi-backend routing to read and extract from:
 * Webpages, YouTube, GitHub, Reddit, Twitter/X, Bilibili, and RSS feeds.
 */

export type ReachChannel =
  | "web"
  | "youtube"
  | "github"
  | "reddit"
  | "twitter"
  | "bilibili"
  | "rss"
  | "search";

export interface ReachResult {
  success: boolean;
  channel: ReachChannel;
  url?: string;
  title?: string;
  content: string;
  backendUsed: string;
  metadata?: Record<string, any>;
  durationMs: number;
  error?: string;
}

export interface ChannelHealth {
  status: "online" | "degraded" | "offline";
  latencyMs: number;
  primaryBackend: string;
  fallbackBackend?: string;
  message?: string;
}

export interface DoctorReport {
  timestamp: string;
  healthyCount: number;
  totalChannels: number;
  channels: Record<ReachChannel, ChannelHealth>;
}
