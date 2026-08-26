// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — CODE SANDBOX
// Isolated code execution with resource limits
// ══════════════════════════════════════════════════════════════════════

import { createTool, ToolSchema, ToolResult, ToolContext } from "./tool-registry";
import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const SANDBOX_DIR = path.join(process.cwd(), ".sandbox");
const MAX_EXECUTION_TIME = 30000; // 30 seconds
const MAX_MEMORY = 128 * 1024 * 1024; // 128MB

function ensureSandboxDir() {
  if (!fs.existsSync(SANDBOX_DIR)) {
    fs.mkdirSync(SANDBOX_DIR, { recursive: true });
  }
}

function cleanupSandbox(id: string) {
  try {
    const dir = path.join(SANDBOX_DIR, id);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch {}
}

// ══════════════════════════════════════════════════════════════════════
// PYTHON EXECUTION TOOL
// ══════════════════════════════════════════════════════════════════════

export const pythonExecutorTool = createTool(
  {
    name: "RUN_PYTHON",
    description: "Execute Python code in an isolated sandbox. Returns stdout, stderr, and exit code.",
    category: "code",
    parameters: [
      { name: "code", type: "string", description: "Python code to execute", required: true },
      { name: "timeout", type: "number", description: "Execution timeout in milliseconds", required: false, default: 15000 },
    ],
    permissions: ["execute", "filesystem"],
    cost: { tokens: 500, credits: 1, money: 0.001 },
    timeout: MAX_EXECUTION_TIME,
    retryable: false,
    examples: ["print('Hello World')", "import math; print(math.pi)"],
  },
  async (params, context) => {
    const startTime = Date.now();
    const id = crypto.randomBytes(8).toString("hex");
    ensureSandboxDir();

    const scriptDir = path.join(SANDBOX_DIR, id);
    fs.mkdirSync(scriptDir, { recursive: true });

    const scriptPath = path.join(scriptDir, "script.py");
    fs.writeFileSync(scriptPath, params.code);

    try {
      const result = execSync(
        `python "${scriptPath}"`,
        {
          timeout: params.timeout || MAX_EXECUTION_TIME,
          maxBuffer: 1024 * 1024,
          cwd: scriptDir,
          encoding: "utf-8",
          env: {
            ...process.env,
            PYTHONIOENCODING: "utf-8",
            PYTHONDONTWRITEBYTECODE: "1",
          },
        }
      );

      cleanupSandbox(id);
      return {
        success: true,
        data: {
          stdout: result,
          exitCode: 0,
        },
        metadata: { duration: Date.now() - startTime, tokensUsed: 0 },
      };
    } catch (error: any) {
      cleanupSandbox(id);
      return {
        success: false,
        data: {
          stdout: error.stdout || "",
          stderr: error.stderr || error.message,
          exitCode: error.status || 1,
        },
        error: error.message,
        metadata: { duration: Date.now() - startTime, tokensUsed: 0 },
      };
    }
  }
);

// ══════════════════════════════════════════════════════════════════════
// NODE.JS EXECUTION TOOL
// ══════════════════════════════════════════════════════════════════════

export const nodeExecutorTool = createTool(
  {
    name: "RUN_NODE",
    description: "Execute JavaScript/Node.js code in an isolated sandbox.",
    category: "code",
    parameters: [
      { name: "code", type: "string", description: "JavaScript code to execute", required: true },
      { name: "timeout", type: "number", description: "Execution timeout in milliseconds", required: false, default: 15000 },
    ],
    permissions: ["execute", "filesystem"],
    cost: { tokens: 500, credits: 1, money: 0.001 },
    timeout: MAX_EXECUTION_TIME,
    retryable: false,
    examples: ["console.log('Hello World')", "JSON.stringify({a: 1})"],
  },
  async (params, context) => {
    const startTime = Date.now();
    const id = crypto.randomBytes(8).toString("hex");
    ensureSandboxDir();

    const scriptDir = path.join(SANDBOX_DIR, id);
    fs.mkdirSync(scriptDir, { recursive: true });

    const scriptPath = path.join(scriptDir, "script.js");
    fs.writeFileSync(scriptPath, params.code);

    try {
      const result = execSync(
        `node "${scriptPath}"`,
        {
          timeout: params.timeout || MAX_EXECUTION_TIME,
          maxBuffer: 1024 * 1024,
          cwd: scriptDir,
          encoding: "utf-8",
        }
      );

      cleanupSandbox(id);
      return {
        success: true,
        data: {
          stdout: result,
          exitCode: 0,
        },
        metadata: { duration: Date.now() - startTime, tokensUsed: 0 },
      };
    } catch (error: any) {
      cleanupSandbox(id);
      return {
        success: false,
        data: {
          stdout: error.stdout || "",
          stderr: error.stderr || error.message,
          exitCode: error.status || 1,
        },
        error: error.message,
        metadata: { duration: Date.now() - startTime, tokensUsed: 0 },
      };
    }
  }
);

// ══════════════════════════════════════════════════════════════════════
// SHELL EXECUTION TOOL
// ══════════════════════════════════════════════════════════════════════

export const shellExecutorTool = createTool(
  {
    name: "RUN_SHELL",
    description: "Execute a shell command in a sandboxed environment. Use for file operations, git, npm, etc.",
    category: "code",
    parameters: [
      { name: "command", type: "string", description: "Shell command to execute", required: true },
      { name: "workdir", type: "string", description: "Working directory (relative to sandbox)", required: false, default: "." },
      { name: "timeout", type: "number", description: "Execution timeout in milliseconds", required: false, default: 15000 },
    ],
    permissions: ["execute", "filesystem", "network"],
    cost: { tokens: 200, credits: 0, money: 0 },
    timeout: MAX_EXECUTION_TIME,
    retryable: false,
    examples: ["ls -la", "git status", "npm list"],
  },
  async (params, context) => {
    const startTime = Date.now();
    const id = crypto.randomBytes(8).toString("hex");
    ensureSandboxDir();

    const workDir = path.join(SANDBOX_DIR, id, params.workdir || ".");
    fs.mkdirSync(workDir, { recursive: true });

    // Block dangerous commands
    const blocked = /\b(rm\s+-rf|format|mkfs|dd\s+if|shutdown|reboot|halt|init\s+[06]|kill\s+-9\s+1|chmod\s+777|wget|curl.*\|\s*sh|eval|exec)\b/i;
    if (blocked.test(params.command)) {
      cleanupSandbox(id);
      return {
        success: false,
        error: "This command is blocked for safety reasons.",
        metadata: { duration: Date.now() - startTime, tokensUsed: 0 },
      };
    }

    try {
      const result = execSync(params.command, {
        timeout: params.timeout || MAX_EXECUTION_TIME,
        maxBuffer: 1024 * 1024,
        cwd: workDir,
        encoding: "utf-8",
        shell: "bash",
      });

      cleanupSandbox(id);
      return {
        success: true,
        data: {
          stdout: result,
          exitCode: 0,
        },
        metadata: { duration: Date.now() - startTime, tokensUsed: 0 },
      };
    } catch (error: any) {
      cleanupSandbox(id);
      return {
        success: false,
        data: {
          stdout: error.stdout || "",
          stderr: error.stderr || error.message,
          exitCode: error.status || 1,
        },
        error: error.message,
        metadata: { duration: Date.now() - startTime, tokensUsed: 0 },
      };
    }
  }
);

// ══════════════════════════════════════════════════════════════════════
// EXPORT ALL SANDBOX TOOLS
// ══════════════════════════════════════════════════════════════════════

export const sandboxTools = [
  pythonExecutorTool,
  nodeExecutorTool,
  shellExecutorTool,
];
