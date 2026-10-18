import { ReachResult } from "../types";

export async function readTwitter(targetUrl: string): Promise<ReachResult> {
  const startTime = Date.now();
  let cleanUrl = targetUrl.trim();
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    cleanUrl = "https://" + cleanUrl;
  }

  // Parse username and status ID from URL
  // e.g. https://x.com/elonmusk/status/1880000000000000000
  // or https://twitter.com/OpenAI/status/1880000000000000000
  const tweetRegex = /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/(\d+)/i;
  const match = cleanUrl.match(tweetRegex);

  if (match) {
    const [, username, statusId] = match;

    // 1. Primary Backend: FxTwitter API (Open, zero-key JSON endpoint for tweets and threads)
    try {
      const fxApiUrl = `https://api.fxtwitter.com/${username}/status/${statusId}`;
      const res = await fetch(fxApiUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "LikeWay-Agent-Reach/1.0",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const data = await res.json();
        const tweet = data?.tweet;
        if (tweet && tweet.text) {
          const author = tweet.author?.name ? `${tweet.author.name} (@${tweet.author.screen_name})` : `@${username}`;
          const dateStr = tweet.created_at ? new Date(tweet.created_at).toUTCString() : "Unknown date";
          const stats = `❤️ ${tweet.likes ?? 0} | 🔁 ${tweet.retweets ?? 0} | 💬 ${tweet.replies ?? 0}`;

          let markdown = `# Tweet by ${author}\n\n`;
          markdown += `**Posted:** ${dateStr}\n`;
          markdown += `**Engagement:** ${stats}\n\n`;
          markdown += `## Content\n${tweet.text}\n\n`;

          if (tweet.media?.photos?.length) {
            markdown += `**Photos:**\n` + tweet.media.photos.map((p: any) => `- ${p.url}`).join("\n") + "\n\n";
          }
          if (tweet.quote) {
            markdown += `### Quoted Tweet (@${tweet.quote.author?.screen_name}):\n${tweet.quote.text}\n\n`;
          }

          return {
            success: true,
            channel: "twitter",
            url: cleanUrl,
            title: `Tweet by ${author}: "${tweet.text.slice(0, 60)}..."`,
            content: markdown,
            backendUsed: "FxTwitter API (Direct Open JSON)",
            durationMs: Date.now() - startTime,
            metadata: {
              author: tweet.author?.screen_name,
              likes: tweet.likes,
              retweets: tweet.retweets,
              id: statusId,
            },
          };
        }
      }
    } catch (fxErr: any) {
      console.warn("[AgentReach:Twitter] FxTwitter API failed, falling back to Jina Reader:", fxErr?.message);
    }
  }

  // 2. Secondary Backend: Jina Reader via FixTweet proxy or original URL
  try {
    const proxyUrl = cleanUrl.replace(/(?:x\.com|twitter\.com)/i, "fxtwitter.com");
    const jinaUrl = `https://r.jina.ai/${proxyUrl}`;
    const res = await fetch(jinaUrl, {
      headers: {
        "Accept": "text/markdown, text/plain",
        "User-Agent": "LikeWay-Agent-Reach/1.0",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 20) {
        return {
          success: true,
          channel: "twitter",
          url: cleanUrl,
          title: "X / Twitter Post",
          content: text.slice(0, 15000),
          backendUsed: "Jina Reader (FxTwitter Proxy)",
          durationMs: Date.now() - startTime,
        };
      }
    }
  } catch (jinaErr: any) {
    console.warn("[AgentReach:Twitter] Jina Reader fallback failed:", jinaErr?.message);
  }

  return {
    success: false,
    channel: "twitter",
    url: cleanUrl,
    content: "",
    backendUsed: "None",
    durationMs: Date.now() - startTime,
    error: "Failed to extract tweet content via FxTwitter and Jina Reader.",
  };
}
