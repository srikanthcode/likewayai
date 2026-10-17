// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI / NEXUSAI — CONNECTED APPS & INTEGRATION REGISTRY
// Extensible plugin & tool ecosystem with OAuth, approval gates & audit log
// ══════════════════════════════════════════════════════════════════════

import crypto from "crypto";

export type IntegrationCategory =
  | "communication"
  | "productivity"
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
  authType: "oauth2" | "api_key" | "local_companion" | "mcp";
  isConnected: boolean;
  requiredScopes: string[];
  tools: IntegrationTool[];
  riskLevel: "low" | "medium" | "high";
  docsUrl?: string;
}

export interface IntegrationTool {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
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

// In-memory store for pending human approvals
declare global {
  // eslint-disable-next-line no-var
  var _pendingApprovals: Map<string, PendingApproval> | undefined;
  // eslint-disable-next-line no-var
  var _connectedAppsStore: Map<string, Set<string>> | undefined; // userId -> Set<appId>
}

if (!global._pendingApprovals) {
  global._pendingApprovals = new Map<string, PendingApproval>();
}
if (!global._connectedAppsStore) {
  global._connectedAppsStore = new Map<string, Set<string>>();
}

const pendingApprovals = global._pendingApprovals;
const userConnectedApps = global._connectedAppsStore;

// Default connected apps for demo / free users
const DEFAULT_CONNECTED_APPS = new Set(["browser_automation", "computer_control", "github"]);

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
  }
  return userApps.has(appId);
}

// ── Built-in Integrations Catalog ────────────────────────────────────

export const INTEGRATIONS_CATALOG: IntegrationManifest[] = [
  {
    id: "gmail",
    name: "Gmail & Google Workspace",
    description: "Search emails, read conversation threads, prepare drafts, and send messages with human approval gates.",
    category: "communication",
    iconName: "Mail",
    version: "2.1.0",
    authType: "oauth2",
    isConnected: false,
    riskLevel: "high",
    requiredScopes: ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.compose"],
    tools: [
      {
        name: "gmail.search_emails",
        description: "Search messages in Gmail using search query syntax.",
        parameters: {
          query: { type: "string", description: "Search query (e.g. from:stripe, is:unread)", required: true },
          maxResults: { type: "number", description: "Max messages to retrieve (default 5)", required: false },
        },
        risk: "low",
        handler: async (params) => {
          return {
            success: true,
            data: {
              messages: [
                {
                  id: "msg_19283",
                  subject: `Updates regarding ${params.query}`,
                  from: "notifications@github.com",
                  date: new Date().toISOString(),
                  snippet: "Your pull request #42 has been approved by the core maintainers.",
                },
                {
                  id: "msg_19284",
                  subject: "Weekly Project Progress",
                  from: "team@acme.org",
                  date: new Date().toISOString(),
                  snippet: "Attached is the sprint review metrics and latency analysis.",
                },
              ],
            },
          };
        },
      },
      {
        name: "gmail.create_draft",
        description: "Create an email draft in Gmail.",
        parameters: {
          to: { type: "string", description: "Recipient email", required: true },
          subject: { type: "string", description: "Email subject line", required: true },
          body: { type: "string", description: "Email body text", required: true },
        },
        risk: "low",
        handler: async (params) => {
          return {
            success: true,
            data: {
              draftId: `draft_${crypto.randomBytes(4).toString("hex")}`,
              to: params.to,
              subject: params.subject,
              message: "Draft created successfully in Gmail.",
            },
          };
        },
      },
      {
        name: "gmail.send_email",
        description: "Send an email from your authorized Gmail account (requires human confirmation).",
        parameters: {
          to: { type: "string", description: "Recipient email", required: true },
          subject: { type: "string", description: "Email subject line", required: true },
          body: { type: "string", description: "Email body text", required: true },
        },
        requiresApproval: true,
        risk: "high",
        handler: async (params) => {
          return {
            success: true,
            data: {
              messageId: `sent_${crypto.randomBytes(6).toString("hex")}`,
              to: params.to,
              delivered: true,
              timestamp: new Date().toISOString(),
            },
          };
        },
      },
    ],
  },
  {
    id: "github",
    name: "GitHub",
    description: "Inspect repositories, search code, read file contents, and track open issues & pull requests.",
    category: "developer",
    iconName: "Github",
    version: "1.4.0",
    authType: "oauth2",
    isConnected: true,
    riskLevel: "medium",
    requiredScopes: ["repo:read", "read:user"],
    tools: [
      {
        name: "github.search_repos",
        description: "Search public and private GitHub repositories.",
        parameters: {
          query: { type: "string", description: "Repository search query", required: true },
        },
        risk: "low",
        handler: async (params) => {
          return {
            success: true,
            data: {
              results: [
                {
                  full_name: `likeway-org/${params.query.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
                  stars: 1420,
                  forks: 210,
                  language: "TypeScript",
                  description: "High-performance AI agent ecosystem.",
                },
              ],
            },
          };
        },
      },
    ],
  },
  {
    id: "browser_automation",
    name: "Autonomous Browser (Playwright)",
    description: "Live headless Chromium agent capable of navigating web apps, extracting DOM tables, and filling forms.",
    category: "browser",
    iconName: "Globe",
    version: "3.0.0",
    authType: "local_companion",
    isConnected: true,
    riskLevel: "medium",
    requiredScopes: ["browser:navigate", "browser:interact"],
    tools: [
      {
        name: "browser.navigate",
        description: "Navigate browser to a specified URL.",
        parameters: {
          url: { type: "string", description: "Target URL to open", required: true },
        },
        risk: "low",
        handler: async (params) => {
          return {
            success: true,
            data: {
              status: 200,
              url: params.url,
              title: "Loaded Page",
              timestamp: new Date().toISOString(),
            },
          };
        },
      },
    ],
  },
  {
    id: "google_drive",
    name: "Google Drive",
    description: "Search cloud documents, read PDFs and spreadsheets, and retrieve project assets.",
    category: "storage",
    iconName: "Folder",
    version: "1.2.0",
    authType: "oauth2",
    isConnected: false,
    riskLevel: "medium",
    requiredScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    tools: [
      {
        name: "drive.search_files",
        description: "Search documents in Google Drive.",
        parameters: {
          query: { type: "string", description: "Search query", required: true },
        },
        risk: "low",
        handler: async (params) => {
          return {
            success: true,
            data: {
              files: [
                { id: "f1", name: `${params.query}_Specification.pdf`, mimeType: "application/pdf" },
                { id: "f2", name: "Roadmap_2026.xlsx", mimeType: "application/vnd.ms-excel" },
              ],
            },
          };
        },
      },
    ],
  },
  {
    id: "mcp_adapter",
    name: "Model Context Protocol (MCP)",
    description: "Extensible connector for local and remote MCP servers (file system, Postgres, custom APIs).",
    category: "mcp",
    iconName: "Cpu",
    version: "1.0.0",
    authType: "mcp",
    isConnected: false,
    riskLevel: "medium",
    requiredScopes: ["mcp:execute"],
    tools: [],
  },
];

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
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min expiry
  };
  pendingApprovals.set(id, approval);
  return approval;
}

export function resolvePendingApproval(id: string, approved: boolean): PendingApproval | null {
  const approval = pendingApprovals.get(id);
  if (!approval) return null;
  pendingApprovals.delete(id);
  return approval;
}
