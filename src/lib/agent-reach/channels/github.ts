import { ReachResult } from "../types";

export function parseGitHubUrl(url: string): {
  owner: string;
  repo: string;
  type?: "repo" | "blob" | "issue" | "pull";
  path?: string;
  number?: string;
} | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/(blob|tree|issues|pull)\/(.+))?/i);
  if (!match) return null;

  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, "");
  const segment = match[3];
  const rest = match[4];

  if (!segment) {
    return { owner, repo, type: "repo" };
  }
  if (segment === "blob" || segment === "tree") {
    return { owner, repo, type: "blob", path: rest };
  }
  if (segment === "issues") {
    return { owner, repo, type: "issue", number: rest };
  }
  if (segment === "pull") {
    return { owner, repo, type: "pull", number: rest };
  }

  return { owner, repo, type: "repo" };
}

export async function readGitHub(url: string): Promise<ReachResult> {
  const startTime = Date.now();
  const parsed = parseGitHubUrl(url);

  if (!parsed) {
    return {
      success: false,
      channel: "github",
      url,
      content: "",
      backendUsed: "None",
      durationMs: Date.now() - startTime,
      error: "Invalid GitHub URL format.",
    };
  }

  const { owner, repo, type, path, number } = parsed;

  // 1. Direct file blob reading (e.g. README.md or specific source file)
  if (type === "blob" && path) {
    // Convert github.com/owner/repo/blob/branch/path to raw.githubusercontent.com/owner/repo/branch/path
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${path}`;
    try {
      const res = await fetch(rawUrl, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const text = await res.text();
        return {
          success: true,
          channel: "github",
          url,
          title: `${owner}/${repo}: ${path.split("/").pop()}`,
          content: `### GitHub File: ${owner}/${repo}/${path}\n\n\`\`\`\n${text}\n\`\`\``.slice(0, 30000),
          backendUsed: "GitHub Raw API",
          metadata: { owner, repo, path },
          durationMs: Date.now() - startTime,
        };
      }
    } catch {}
  }

  // 2. Repository Overview: Fetch Repo Info + README
  if (type === "repo") {
    try {
      // Primary: GitHub Public API
      const apiRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "LikeWay-Agent-Reach",
        },
        signal: AbortSignal.timeout(8000),
      });

      let repoMeta: any = {};
      if (apiRes.ok) {
        repoMeta = await apiRes.json();
      }

      // Fetch README directly from raw endpoint
      const readmeBranches = ["main", "master"];
      let readmeContent = "";

      for (const branch of readmeBranches) {
        try {
          const rRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`, {
            signal: AbortSignal.timeout(6000),
          });
          if (rRes.ok) {
            readmeContent = await rRes.text();
            break;
          }
        } catch {}
      }

      if (readmeContent || repoMeta.name) {
        const title = repoMeta.full_name || `${owner}/${repo}`;
        const stars = repoMeta.stargazers_count ?? "N/A";
        const forks = repoMeta.forks_count ?? "N/A";
        const desc = repoMeta.description || "No description provided.";
        const lang = repoMeta.language || "Unknown";

        const formatted = `### GitHub Repository: [${title}](https://github.com/${owner}/${repo})
- **Description:** ${desc}
- **Primary Language:** ${lang} · **Stars:** ⭐ ${stars} · **Forks:** 🍴 ${forks}
- **Default Branch:** ${repoMeta.default_branch || "main"}

---
#### README.md
${readmeContent || "*No README.md found in default branch.*"}`;

        return {
          success: true,
          channel: "github",
          url,
          title,
          content: formatted.slice(0, 35000),
          backendUsed: "GitHub API + Raw README",
          metadata: { owner, repo, stars, forks, language: lang },
          durationMs: Date.now() - startTime,
        };
      }
    } catch (apiErr: any) {
      console.warn("[AgentReach:GitHub] GitHub API error, falling back to Jina:", apiErr?.message);
    }
  }

  // 3. Fallback: Jina Reader on GitHub URL
  try {
    const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
      headers: { "Accept": "text/markdown" },
      signal: AbortSignal.timeout(10000),
    });

    if (jinaRes.ok) {
      const md = await jinaRes.text();
      if (md && md.length > 50) {
        return {
          success: true,
          channel: "github",
          url,
          title: `GitHub: ${owner}/${repo}`,
          content: md.slice(0, 30000),
          backendUsed: "Jina Reader (GitHub Fallback)",
          metadata: { owner, repo },
          durationMs: Date.now() - startTime,
        };
      }
    }
  } catch {}

  return {
    success: false,
    channel: "github",
    url,
    content: "",
    backendUsed: "None",
    durationMs: Date.now() - startTime,
    error: `Could not fetch GitHub repository ${owner}/${repo}.`,
  };
}
