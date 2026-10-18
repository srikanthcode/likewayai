import { ReachResult } from "../types";

export async function readRssFeed(feedUrl: string): Promise<ReachResult> {
  const startTime = Date.now();
  let cleanUrl = feedUrl.trim();
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    cleanUrl = "https://" + cleanUrl;
  }

  // 1. Primary Backend: Direct XML fetch & parser (RSS 2.0 + Atom 1.0)
  try {
    const res = await fetch(cleanUrl, {
      headers: {
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml",
        "User-Agent": "LikeWay-Agent-Reach/1.0 (RSS Reader)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const xml = await res.text();
      const isXmlFeed = xml.includes("<rss") || xml.includes("<feed") || xml.includes("<channel");

      if (isXmlFeed) {
        // Parse Channel Title
        const channelTitleMatch = xml.match(/<channel[^>]*>[\s\S]*?<title[^>]*>(?:<!\[CDATA\[(.*?)\]\]>|([^<]+))<\/title>/i) ||
                                  xml.match(/<feed[^>]*>[\s\S]*?<title[^>]*>(?:<!\[CDATA\[(.*?)\]\]>|([^<]+))<\/title>/i);
        const feedTitle = (channelTitleMatch?.[1] || channelTitleMatch?.[2] || "RSS Feed").trim();

        // Extract items / entries
        const items: Array<{ title: string; link: string; date?: string; snippet?: string }> = [];

        // Try RSS <item> tags
        const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
        for (const itemXml of itemMatches.slice(0, 10)) {
          const tMatch = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]+))<\/title>/i);
          const lMatch = itemXml.match(/<link[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]+))<\/link>/i);
          const dMatch = itemXml.match(/<pubDate[^>]*>([^<]+)<\/pubDate>/i) || itemXml.match(/<dc:date[^>]*>([^<]+)<\/dc:date>/i);
          const descMatch = itemXml.match(/<(?:description|content:encoded)[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/(?:description|content:encoded)>/i);

          const title = (tMatch?.[1] || tMatch?.[2] || "Untitled").trim();
          const link = (lMatch?.[1] || lMatch?.[2] || "").trim();
          const date = dMatch?.[1]?.trim();
          const rawDesc = descMatch?.[1] || descMatch?.[2] || "";
          const snippet = rawDesc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 250);

          if (title || link) {
            items.push({ title, link, date, snippet });
          }
        }

        // Try Atom <entry> tags if no items found
        if (items.length === 0) {
          const entryMatches = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
          for (const entryXml of entryMatches.slice(0, 10)) {
            const tMatch = entryXml.match(/<title[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]+))<\/title>/i);
            const lMatch = entryXml.match(/<link[^>]+href="([^"]+)"/i) || entryXml.match(/<link[^>]*>([^<]+)<\/link>/i);
            const dMatch = entryXml.match(/<updated[^>]*>([^<]+)<\/updated>/i) || entryXml.match(/<published[^>]*>([^<]+)<\/published>/i);
            const descMatch = entryXml.match(/<(?:summary|content)[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/(?:summary|content)>/i);

            const title = (tMatch?.[1] || tMatch?.[2] || "Untitled").trim();
            const link = (lMatch?.[1] || "").trim();
            const date = dMatch?.[1]?.trim();
            const rawDesc = descMatch?.[1] || descMatch?.[2] || "";
            const snippet = rawDesc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 250);

            if (title || link) {
              items.push({ title, link, date, snippet });
            }
          }
        }

        if (items.length > 0) {
          let markdown = `# ${feedTitle}\n\n`;
          markdown += `**Feed Source:** ${cleanUrl}\n`;
          markdown += `**Latest Articles (${items.length}):**\n\n`;

          items.forEach((item, idx) => {
            markdown += `### ${idx + 1}. [${item.title}](${item.link})\n`;
            if (item.date) markdown += `*Published: ${item.date}*\n`;
            if (item.snippet) markdown += `${item.snippet}...\n`;
            markdown += `\n`;
          });

          return {
            success: true,
            channel: "rss",
            url: cleanUrl,
            title: feedTitle,
            content: markdown,
            backendUsed: "Direct XML Stream Parser",
            durationMs: Date.now() - startTime,
            metadata: { count: items.length },
          };
        }
      }
    }
  } catch (xmlErr: any) {
    console.warn("[AgentReach:RSS] Direct XML parser failed, falling back to Jina Reader:", xmlErr?.message);
  }

  // 2. Secondary Backend: Jina Reader
  try {
    const jinaUrl = `https://r.jina.ai/${cleanUrl}`;
    const res = await fetch(jinaUrl, {
      headers: {
        "Accept": "text/markdown, text/plain",
        "User-Agent": "LikeWay-Agent-Reach/1.0",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 30) {
        return {
          success: true,
          channel: "rss",
          url: cleanUrl,
          title: "RSS Feed via Jina Reader",
          content: text.slice(0, 20000),
          backendUsed: "Jina Reader",
          durationMs: Date.now() - startTime,
        };
      }
    }
  } catch (jinaErr: any) {
    console.warn("[AgentReach:RSS] Jina Reader fallback failed:", jinaErr?.message);
  }

  return {
    success: false,
    channel: "rss",
    url: cleanUrl,
    content: "",
    backendUsed: "None",
    durationMs: Date.now() - startTime,
    error: "Failed to read or parse RSS feed.",
  };
}
