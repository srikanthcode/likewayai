import { ReachResult } from "../types";

export async function readReddit(url: string): Promise<ReachResult> {
  const startTime = Date.now();
  let cleanUrl = url.trim().split("?")[0].replace(/\/$/, "");

  // 1. Primary Backend: Reddit Public JSON Endpoint (Appending .json)
  try {
    const jsonUrl = cleanUrl + ".json";
    const res = await fetch(jsonUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json();

      // Case A: Post with Comments (Array of listings)
      if (Array.isArray(data) && data.length > 0) {
        const post = data[0]?.data?.children?.[0]?.data;
        const comments = (data[1]?.data?.children || []).slice(0, 8);

        if (post) {
          const title = post.title || "Reddit Post";
          const author = post.author || "[deleted]";
          const subreddit = post.subreddit_name_prefixed || "r/reddit";
          const score = post.score ?? 0;
          const selftext = post.selftext || "*No body text*";

          let formatted = `### [${title}](${cleanUrl})\n**Community:** ${subreddit} · **Author:** u/${author} · **Score:** ⬆️ ${score}\n\n${selftext}\n\n---\n#### Top Discussion & Comments:\n`;

          comments.forEach((c: any, i: number) => {
            const cData = c.data;
            if (cData && cData.body) {
              formatted += `**#${i + 1} u/${cData.author || "user"}** (⬆️ ${cData.score || 0}):\n> ${cData.body.replace(/\n/g, "\n> ")}\n\n`;
            }
          });

          return {
            success: true,
            channel: "reddit",
            url: cleanUrl,
            title,
            content: formatted.slice(0, 25000),
            backendUsed: "Reddit Public JSON API",
            metadata: { subreddit, score, author, commentCount: comments.length },
            durationMs: Date.now() - startTime,
          };
        }
      }

      // Case B: Subreddit Listing (Object with children)
      if (data && data.kind === "Listing" && data.data?.children?.length > 0) {
        const posts = data.data.children.slice(0, 10);
        const subName = posts[0]?.data?.subreddit_name_prefixed || "Reddit";
        let formatted = `### ${subName} — Top Posts\n\n`;

        posts.forEach((p: any, i: number) => {
          const pData = p.data;
          if (pData) {
            formatted += `**${i + 1}. [${pData.title}](https://reddit.com${pData.permalink})**\n`;
            formatted += `Score: ⬆️ ${pData.score || 0} | Author: u/${pData.author || "user"} | Comments: ${pData.num_comments || 0}\n`;
            if (pData.selftext) {
              formatted += `> ${pData.selftext.slice(0, 160).replace(/\n/g, " ")}...\n`;
            }
            formatted += "\n";
          }
        });

        return {
          success: true,
          channel: "reddit",
          url: cleanUrl,
          title: `${subName} Top Discussions`,
          content: formatted.slice(0, 25000),
          backendUsed: "Reddit Subreddit JSON API",
          durationMs: Date.now() - startTime,
        };
      }
    }
  } catch (err: any) {
    console.warn("[AgentReach:Reddit] JSON endpoint failed, falling back to Jina:", err?.message);
  }

  // 2. Fallback Backend: Jina Reader
  try {
    const jinaRes = await fetch(`https://r.jina.ai/${cleanUrl}`, {
      headers: { "Accept": "text/markdown" },
      signal: AbortSignal.timeout(10000),
    });

    if (jinaRes.ok) {
      const md = await jinaRes.text();
      if (md && md.length > 40) {
        return {
          success: true,
          channel: "reddit",
          url: cleanUrl,
          title: "Reddit Thread",
          content: md.slice(0, 25000),
          backendUsed: "Jina Reader (Reddit Fallback)",
          durationMs: Date.now() - startTime,
        };
      }
    }
  } catch {}

  return {
    success: false,
    channel: "reddit",
    url: cleanUrl,
    content: "",
    backendUsed: "None",
    durationMs: Date.now() - startTime,
    error: "Failed to extract Reddit post or discussion.",
  };
}
