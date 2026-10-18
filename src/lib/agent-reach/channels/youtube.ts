import { ReachResult } from "../types";

export function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  );
  return match ? match[1] : null;
}

export async function readYouTube(url: string): Promise<ReachResult> {
  const startTime = Date.now();
  const videoId = extractYouTubeId(url);

  if (!videoId) {
    return {
      success: false,
      channel: "youtube",
      url,
      content: "",
      backendUsed: "None",
      durationMs: Date.now() - startTime,
      error: "Invalid YouTube URL: Could not extract video ID.",
    };
  }

  const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let videoTitle = "";
  let authorName = "";

  // 1. Fetch metadata via YouTube oEmbed (Free, zero-key official endpoint)
  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (oembedRes.ok) {
      const meta = await oembedRes.json();
      videoTitle = meta.title || "";
      authorName = meta.author_name || "";
    }
  } catch {}

  // 2. Primary: Extract Subtitles & Transcripts (TimedText API)
  try {
    const pageRes = await fetch(cleanUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (pageRes.ok) {
      const html = await pageRes.text();
      // Look for captionTracks in initial player response
      const captionsMatch = html.match(/"captionTracks":\s*(\[[^\]]+\])/);

      if (captionsMatch) {
        try {
          const tracks = JSON.parse(captionsMatch[1]);
          const englishTrack =
            tracks.find((t: any) => t.languageCode === "en") ||
            tracks.find((t: any) => t.vssId?.includes(".en")) ||
            tracks[0];

          if (englishTrack && englishTrack.baseUrl) {
            const transcriptRes = await fetch(englishTrack.baseUrl, { signal: AbortSignal.timeout(8000) });
            if (transcriptRes.ok) {
              const xml = await transcriptRes.text();
              // Extract text nodes from timed text XML
              const lines: string[] = [];
              const textRegex = /<text[^>]*>([^<]+)<\/text>/g;
              let match;
              while ((match = textRegex.exec(xml)) !== null) {
                const unescaped = match[1]
                  .replace(/&amp;/g, "&")
                  .replace(/&#39;/g, "'")
                  .replace(/&quot;/g, '"')
                  .replace(/&lt;/g, "<")
                  .replace(/&gt;/g, ">");
                lines.push(unescaped);
              }

              if (lines.length > 0) {
                const transcript = lines.join(" ");
                const formatted = `### YouTube Video: ${videoTitle || videoId}\n**Channel:** ${authorName || "Unknown"}\n**URL:** ${cleanUrl}\n\n#### Transcript / Subtitles:\n${transcript}`;
                return {
                  success: true,
                  channel: "youtube",
                  url: cleanUrl,
                  title: videoTitle || `YouTube: ${videoId}`,
                  content: formatted.slice(0, 30000),
                  backendUsed: "YouTube Subtitle Extractor (TimedText)",
                  metadata: { videoId, author: authorName, title: videoTitle, lines: lines.length },
                  durationMs: Date.now() - startTime,
                };
              }
            }
          }
        } catch {}
      }
    }
  } catch (err: any) {
    console.warn("[AgentReach:YouTube] TimedText extraction error:", err?.message);
  }

  // 3. Fallback: Jina Reader on YouTube URL
  try {
    const jinaRes = await fetch(`https://r.jina.ai/${cleanUrl}`, {
      headers: { "Accept": "text/markdown" },
      signal: AbortSignal.timeout(10000),
    });

    if (jinaRes.ok) {
      const md = await jinaRes.text();
      if (md && md.length > 50) {
        return {
          success: true,
          channel: "youtube",
          url: cleanUrl,
          title: videoTitle || `YouTube: ${videoId}`,
          content: `### YouTube Video: ${videoTitle || videoId}\n**Channel:** ${authorName}\n**URL:** ${cleanUrl}\n\n${md}`.slice(0, 25000),
          backendUsed: "Jina Reader (YouTube Fallback)",
          metadata: { videoId, author: authorName, title: videoTitle },
          durationMs: Date.now() - startTime,
        };
      }
    }
  } catch {}

  // 4. Return metadata if transcript was not available
  if (videoTitle) {
    return {
      success: true,
      channel: "youtube",
      url: cleanUrl,
      title: videoTitle,
      content: `### YouTube Video: ${videoTitle}\n**Channel:** ${authorName}\n**URL:** ${cleanUrl}\n\n*Note: Video subtitles/closed captions were not enabled for this video. Use metadata and search context.*`,
      backendUsed: "YouTube oEmbed Metadata",
      metadata: { videoId, author: authorName, title: videoTitle },
      durationMs: Date.now() - startTime,
    };
  }

  return {
    success: false,
    channel: "youtube",
    url: cleanUrl,
    content: "",
    backendUsed: "None",
    durationMs: Date.now() - startTime,
    error: "Failed to extract YouTube video information or transcript.",
  };
}
