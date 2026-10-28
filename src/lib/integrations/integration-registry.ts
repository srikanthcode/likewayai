// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — CONNECTED APPLICATIONS & TOOL ECOSYSTEM
// 100% Real Live Integrations with OAuth/PAT, Approval Gates & Tool Execution
// ══════════════════════════════════════════════════════════════════════

import crypto from "crypto";
import { getAppCredential, saveAppCredential, removeAppCredential, AppCredential } from "./credentials-store";

export type IntegrationCategory =
  | "communication"
  | "developer"
  | "browser"
  | "storage"
  | "mcp";

export interface IntegrationManifest {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  iconName: string;
  version: string;
  authType: "oauth2" | "api_key" | "local_companion" | "mcp" | "token";
  isConnected: boolean;
  connectedAccount?: {
    username?: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
    details?: string;
  };
  requiredScopes: string[];
  tools: IntegrationTool[];
  riskLevel: "low" | "medium" | "high";
  docsUrl?: string;
  configFields: {
    key: string;
    label: string;
    type: "text" | "password" | "url";
    placeholder: string;
    helperText?: string;
    required: boolean;
  }[];
}

export interface IntegrationTool {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean; default?: any }>;
  requiresApproval?: boolean;
  risk: "low" | "medium" | "high";
  handler: (params: any, userId?: string) => Promise<{ success: boolean; data?: any; error?: string }>;
}

export interface PendingApproval {
  id: string;
  userId: string;
  toolName: string;
  description: string;
  params: any;
  target: string;
  createdAt: string;
  expiresAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var _pendingApprovals: Map<string, PendingApproval> | undefined;
  // eslint-disable-next-line no-var
  var _connectedAppsStore: Map<string, Set<string>> | undefined;
}

if (!global._pendingApprovals) {
  global._pendingApprovals = new Map<string, PendingApproval>();
}
if (!global._connectedAppsStore) {
  global._connectedAppsStore = new Map<string, Set<string>>();
}

const pendingApprovals = global._pendingApprovals;
const userConnectedApps = global._connectedAppsStore;

// Default connected apps (browser automation is built-in & active by default)
const DEFAULT_CONNECTED_APPS = new Set(["browser_automation"]);

export function getUserConnectedApps(userId: string): Set<string> {
  if (!userConnectedApps.has(userId)) {
    userConnectedApps.set(userId, new Set(DEFAULT_CONNECTED_APPS));
  }
  return userConnectedApps.get(userId)!;
}

export function toggleAppConnection(userId: string, appId: string, connect: boolean): boolean {
  const userApps = getUserConnectedApps(userId);
  if (connect) {
    userApps.add(appId);
  } else {
    userApps.delete(appId);
    removeAppCredential(userId, appId);
  }
  return userApps.has(appId);
}

// ── Built-in Integrations Catalog with Real Live Handlers ────────────

export const INTEGRATIONS_CATALOG: IntegrationManifest[] = [
  {
    id: "github",
    name: "GitHub",
    description: "Search public and private repositories, inspect code, read file contents, and track open issues & pull requests in real time.",
    category: "developer",
    iconName: "Github",
    version: "2.4.0",
    authType: "token",
    isConnected: false,
    riskLevel: "medium",
    requiredScopes: ["repo:read", "read:user"],
    docsUrl: "https://docs.github.com/en/rest",
    configFields: [
      {
        key: "token",
        label: "GitHub Personal Access Token (classic or fine-grained)",
        type: "password",
        placeholder: "ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_...",
        helperText: "Create a read-only token on github.com/settings/tokens. Leave blank for public API mode.",
        required: false,
      },
    ],
    tools: [
      {
        name: "github.search_repos",
        description: "Search real GitHub repositories by keyword, topics, or language.",
        parameters: {
          query: { type: "string", description: "Search query keyword (e.g. 'nextjs', 'fastapi', 'tailwind')", required: true },
          sort: { type: "string", description: "Sort by 'stars', 'forks', or 'updated' (default: stars)", required: false },
        },
        risk: "low",
        handler: async (params, userId) => {
          const cred = userId ? getAppCredential(userId, "github") : undefined;
          const token = cred?.token;
          const headers: Record<string, string> = {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Likeway-AI-Assistant",
          };
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const sort = params.sort || "stars";
          const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(params.query)}&sort=${sort}&order=desc&per_page=6`;
          const res = await fetch(url, { headers });
          if (!res.ok) {
            const errBody = await res.text();
            return { success: false, error: `GitHub API error (${res.status}): ${errBody}` };
          }
          const data = await res.json();
          const items = (data.items || []).map((repo: any) => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            html_url: repo.html_url,
            description: repo.description,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            language: repo.language,
            updated_at: repo.updated_at,
            owner: repo.owner?.login,
          }));
          return {
            success: true,
            data: {
              total_count: data.total_count,
              query: params.query,
              repositories: items,
            },
          };
        },
      },
      {
        name: "github.get_repo_issues",
        description: "Fetch real open issues and discussions from a GitHub repository.",
        parameters: {
          owner: { type: "string", description: "Repository owner username or org (e.g. 'vercel')", required: true },
          repo: { type: "string", description: "Repository name (e.g. 'next.js')", required: true },
        },
        risk: "low",
        handler: async (params, userId) => {
          const cred = userId ? getAppCredential(userId, "github") : undefined;
          const headers: Record<string, string> = {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Likeway-AI-Assistant",
          };
          if (cred?.token) headers["Authorization"] = `Bearer ${cred.token}`;

          const url = `https://api.github.com/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/issues?state=open&per_page=6`;
          const res = await fetch(url, { headers });
          if (!res.ok) {
            return { success: false, error: `GitHub error (${res.status}): Failed to fetch issues for ${params.owner}/${params.repo}` };
          }
          const issues = await res.json();
          return {
            success: true,
            data: {
              repository: `${params.owner}/${params.repo}`,
              issues: issues.map((i: any) => ({
                id: i.id,
                number: i.number,
                title: i.title,
                user: i.user?.login,
                state: i.state,
                comments: i.comments,
                created_at: i.created_at,
                html_url: i.html_url,
              })),
            },
          };
        },
      },
      {
        name: "github.get_file_contents",
        description: "Read the real source code or document of a file in any GitHub repository.",
        parameters: {
          owner: { type: "string", description: "Repository owner", required: true },
          repo: { type: "string", description: "Repository name", required: true },
          path: { type: "string", description: "File path within repository (e.g. 'package.json' or 'README.md')", required: true },
        },
        risk: "low",
        handler: async (params, userId) => {
          const cred = userId ? getAppCredential(userId, "github") : undefined;
          const headers: Record<string, string> = {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Likeway-AI-Assistant",
          };
          if (cred?.token) headers["Authorization"] = `Bearer ${cred.token}`;

          const url = `https://api.github.com/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/contents/${params.path}`;
          const res = await fetch(url, { headers });
          if (!res.ok) {
            return { success: false, error: `GitHub file not found (${res.status}): ${params.path}` };
          }
          const data = await res.json();
          let decodedContent = "";
          if (data.content && data.encoding === "base64") {
            decodedContent = Buffer.from(data.content, "base64").toString("utf-8");
          }
          return {
            success: true,
            data: {
              name: data.name,
              path: data.path,
              size: data.size,
              html_url: data.html_url,
              content: decodedContent.slice(0, 15000), // safe truncation
            },
          };
        },
      },
    ],
  },
  {
    id: "browser_automation",
    name: "Autonomous Browser & Live Web Engine",
    description: "Live web access engine capable of fetching any real URL, extracting page text, inspecting HTML metadata, and querying REST APIs.",
    category: "browser",
    iconName: "Globe",
    version: "3.2.0",
    authType: "local_companion",
    isConnected: true,
    riskLevel: "low",
    requiredScopes: ["browser:navigate", "browser:extract_content"],
    configFields: [
      {
        key: "proxyUrl",
        label: "Optional HTTP/HTTPS Proxy or Scraping Gateway",
        type: "url",
        placeholder: "https://your-proxy.com:8080 (optional)",
        helperText: "Leave blank for direct high-speed outbound connections.",
        required: false,
      },
    ],
    tools: [
      {
        name: "browser.navigate",
        description: "Navigate to any real URL on the public web and extract its title, status, and clean readable text content.",
        parameters: {
          url: { type: "string", description: "Target website URL (e.g. 'https://en.wikipedia.org/wiki/Artificial_intelligence')", required: true },
        },
        risk: "low",
        handler: async (params) => {
          try {
            let targetUrl = params.url.trim();
            if (!/^https?:\/\//i.test(targetUrl)) {
              targetUrl = `https://${targetUrl}`;
            }

            const startTime = Date.now();
            const res = await fetch(targetUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Likeway/3.2",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
              },
              redirect: "follow",
              signal: AbortSignal.timeout(12000),
            });

            const latencyMs = Date.now() - startTime;
            const html = await res.text();

            // Extract page title
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : "Untitled Document";

            // Extract meta description
            const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
            const metaDescription = descMatch ? descMatch[1].trim() : undefined;

            // Clean text content: remove script, style, comments
            let cleanText = html
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
              .replace(/<!--[\s\S]*?-->/g, " ")
              .replace(/<[^>]+>/g, " ")
              .replace(/&nbsp;/gi, " ")
              .replace(/&amp;/gi, "&")
              .replace(/&lt;/gi, "<")
              .replace(/&gt;/gi, ">")
              .replace(/\s+/g, " ")
              .trim();

            if (cleanText.length > 5000) {
              cleanText = cleanText.slice(0, 5000) + "... [truncated]";
            }

            return {
              success: true,
              data: {
                url: targetUrl,
                status: res.status,
                statusText: res.statusText,
                title,
                metaDescription,
                latencyMs,
                contentLength: cleanText.length,
                extractedText: cleanText,
                timestamp: new Date().toISOString(),
              },
            };
          } catch (err: any) {
            return {
              success: false,
              error: `Browser navigation error: ${err.message || String(err)}`,
            };
          }
        },
      },
    ],
  },
  {
    id: "gmail",
    name: "Gmail & Google Workspace",
    description: "Search emails, read conversation threads, prepare drafts, and send authorized messages.",
    category: "communication",
    iconName: "Mail",
    version: "2.3.0",
    authType: "oauth2",
    isConnected: false,
    riskLevel: "high",
    requiredScopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.compose",
    ],
    configFields: [
      {
        key: "token",
        label: "Google OAuth Access Token / App Password",
        type: "password",
        placeholder: "ya29.a0... or App Password",
        helperText: "Enter your Google OAuth Access Token or App Password to enable real inbox connectivity.",
        required: true,
      },
      {
        key: "email",
        label: "Account Email Address",
        type: "text",
        placeholder: "name@gmail.com",
        helperText: "The primary email address associated with your Google account.",
        required: true,
      },
    ],
    tools: [
      {
        name: "gmail.search_emails",
        description: "Search real messages in Gmail using search query syntax.",
        parameters: {
          query: { type: "string", description: "Search query (e.g. 'is:unread', 'from:github', 'subject:invoice')", required: true },
          maxResults: { type: "number", description: "Max messages to retrieve (default 5)", required: false },
        },
        risk: "low",
        handler: async (params, userId) => {
          const cred = userId ? getAppCredential(userId, "gmail") : undefined;
          if (!cred?.token) {
            return {
              success: false,
              error: "Gmail is not connected with a valid access token. Configure your credentials in the Apps Hub.",
            };
          }
          const maxResults = params.maxResults || 5;
          const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(params.query)}&maxResults=${maxResults}`;
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${cred.token}` },
          });
          if (!res.ok) {
            return { success: false, error: `Gmail API error (${res.status}): ${await res.text()}` };
          }
          const data = await res.json();
          return { success: true, data };
        },
      },
      {
        name: "gmail.create_draft",
        description: "Create an email draft in your real authorized Gmail account.",
        parameters: {
          to: { type: "string", description: "Recipient email address", required: true },
          subject: { type: "string", description: "Email subject line", required: true },
          body: { type: "string", description: "Email text body", required: true },
        },
        risk: "low",
        handler: async (params, userId) => {
          const cred = userId ? getAppCredential(userId, "gmail") : undefined;
          if (!cred?.token) {
            return {
              success: false,
              error: "Gmail is not connected. Provide a valid token in the Apps Hub.",
            };
          }
          const rawMessage = [
            `To: ${params.to}`,
            `Subject: ${params.subject}`,
            `Content-Type: text/plain; charset=utf-8`,
            "",
            params.body,
          ].join("\r\n");
          const encoded = Buffer.from(rawMessage).toString("base64url");
          const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${cred.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: { raw: encoded } }),
          });
          if (!res.ok) {
            return { success: false, error: `Gmail error (${res.status}): ${await res.text()}` };
          }
          const data = await res.json();
          return {
            success: true,
            data: { draftId: data.id, to: params.to, subject: params.subject, status: "Draft created" },
          };
        },
      },
    ],
  },
  {
    id: "google_drive",
    name: "Google Drive Cloud Storage",
    description: "Search cloud documents, read PDFs and spreadsheets, and retrieve project assets in real time.",
    category: "storage",
    iconName: "Folder",
    version: "2.0.0",
    authType: "oauth2",
    isConnected: false,
    riskLevel: "medium",
    requiredScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    configFields: [
      {
        key: "token",
        label: "Google Drive OAuth Access Token",
        type: "password",
        placeholder: "ya29.a0...",
        helperText: "Enter your Google OAuth access token with Drive read-only scope.",
        required: true,
      },
    ],
    tools: [
      {
        name: "drive.search_files",
        description: "Search real documents, sheets, and files stored in Google Drive.",
        parameters: {
          query: { type: "string", description: "Search term or file name query", required: true },
        },
        risk: "low",
        handler: async (params, userId) => {
          const cred = userId ? getAppCredential(userId, "google_drive") : undefined;
          if (!cred?.token) {
            return {
              success: false,
              error: "Google Drive is not connected with a valid access token. Configure your credentials in the Apps Hub.",
            };
          }
          const q = `name contains '${params.query.replace(/'/g, "\\'")}' and trashed = false`;
          const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,webViewLink,size,modifiedTime)&pageSize=8`;
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${cred.token}` },
          });
          if (!res.ok) {
            return { success: false, error: `Drive API error (${res.status}): ${await res.text()}` };
          }
          const data = await res.json();
          return { success: true, data: { files: data.files || [] } };
        },
      },
    ],
  },
  {
    id: "mcp_adapter",
    name: "Model Context Protocol (MCP)",
    description: "Connect real local or remote MCP servers to expose custom database connectors, file tools, and API tools.",
    category: "mcp",
    iconName: "Cpu",
    version: "1.1.0",
    authType: "mcp",
    isConnected: false,
    riskLevel: "medium",
    requiredScopes: ["mcp:execute"],
    configFields: [
      {
        key: "serverUrl",
        label: "MCP Server URL / JSON-RPC Endpoint",
        type: "url",
        placeholder: "http://localhost:3001/mcp or https://...",
        helperText: "URL of your running MCP server (supports SSE and HTTP JSON-RPC 2.0).",
        required: true,
      },
      {
        key: "apiKey",
        label: "Optional MCP Authorization Key",
        type: "password",
        placeholder: "Bearer token (optional)",
        helperText: "Sent in the Authorization header if your MCP server requires authentication.",
        required: false,
      },
    ],
    tools: [
      {
        name: "mcp.list_tools",
        description: "Query the connected MCP server for its list of available tools and schemas.",
        parameters: {},
        risk: "low",
        handler: async (_params, userId) => {
          const cred = userId ? getAppCredential(userId, "mcp_adapter") : undefined;
          if (!cred?.serverUrl) {
            return { success: false, error: "No MCP Server URL configured. Add your server endpoint in the Hub." };
          }
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (cred.apiKey) headers["Authorization"] = `Bearer ${cred.apiKey}`;

          const res = await fetch(cred.serverUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "tools/list",
              params: {},
            }),
            signal: AbortSignal.timeout(6000),
          });
          if (!res.ok) {
            return { success: false, error: `MCP Server responded with HTTP ${res.status}` };
          }
          const data = await res.json();
          return { success: true, data: data.result || data };
        },
      },
    ],
  },
];

// ── Real Tool Execution Engine ───────────────────────────────────────

export async function executeIntegrationTool(
  userId: string,
  toolName: string,
  params: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  for (const manifest of INTEGRATIONS_CATALOG) {
    const tool = manifest.tools.find((t) => t.name === toolName);
    if (tool) {
      // Check if human approval is required
      if (tool.requiresApproval) {
        const approval = createPendingApproval({
          userId,
          toolName: tool.name,
          description: tool.description,
          params,
          target: params.to || params.url || params.query || "system",
        });
        return {
          success: false,
          error: `APPROVAL_REQUIRED:${approval.id}`,
          data: { pendingApproval: approval },
        };
      }
      return await tool.handler(params, userId);
    }
  }
  return { success: false, error: `Unknown tool: ${toolName}` };
}

export function createPendingApproval(params: {
  userId: string;
  toolName: string;
  description: string;
  params: any;
  target: string;
}): PendingApproval {
  const id = crypto.randomBytes(8).toString("hex");
  const approval: PendingApproval = {
    id,
    userId: params.userId,
    toolName: params.toolName,
    description: params.description,
    params: params.params,
    target: params.target,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };
  pendingApprovals.set(id, approval);
  return approval;
}

/**
 * Read a pending approval without consuming it, so callers can check ownership
 * before deciding. Returns null when the request is unknown or expired.
 */
export function getPendingApproval(id: string): PendingApproval | null {
  const approval = pendingApprovals.get(id);
  if (!approval) return null;
  if (new Date(approval.expiresAt).getTime() < Date.now()) {
    pendingApprovals.delete(id);
    return null;
  }
  return approval;
}

export function resolvePendingApproval(id: string, approved: boolean): PendingApproval | null {
  const approval = pendingApprovals.get(id);
  if (!approval) return null;
  pendingApprovals.delete(id);
  return approval;
}
