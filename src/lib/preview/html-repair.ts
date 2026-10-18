/**
 * LikeWay Preview Engine — HTML & Sandbox Resilience Utility
 * Auto-detects and repairs incomplete, truncated, or malformed HTML, CSS, and JS snippets
 * so they render reliably in sandboxed iframes without crashing or showing blank canvases.
 */

export function repairHtmlDocument(rawHtml: string, title: string = "Preview"): string {
  let html = (rawHtml || "").trim();

  if (!html) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
</head>
<body style="margin:0;background:#05070f;color:#94a3b8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
  <p>No previewable content available.</p>
</body>
</html>`;
  }

  // 1. Repair unclosed <style> blocks (e.g. cut off at `font-family: '` or `background: `)
  const lastStyleOpen = html.lastIndexOf("<style");
  const lastStyleClose = html.lastIndexOf("</style>");
  if (lastStyleOpen !== -1 && (lastStyleClose === -1 || lastStyleClose < lastStyleOpen)) {
    const styleSnippet = html.slice(lastStyleOpen);
    const singleQuotes = (styleSnippet.match(/'/g) || []).length;
    const doubleQuotes = (styleSnippet.match(/"/g) || []).length;
    if (singleQuotes % 2 !== 0) html += "'";
    if (doubleQuotes % 2 !== 0) html += '"';

    const trimmed = html.trimEnd();
    if (!trimmed.endsWith(";") && !trimmed.endsWith("{") && !trimmed.endsWith("}")) {
      html += ";";
    }
    const openBraces = (styleSnippet.match(/\{/g) || []).length;
    const closeBraces = (styleSnippet.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      html += "\n}".repeat(openBraces - closeBraces);
    }
    html += "\n</style>";
  }

  // 2. Repair unclosed <script> blocks
  const lastScriptOpen = html.lastIndexOf("<script");
  const lastScriptClose = html.lastIndexOf("</script>");
  if (lastScriptOpen !== -1 && (lastScriptClose === -1 || lastScriptClose < lastScriptOpen)) {
    const scriptSnippet = html.slice(lastScriptOpen);
    const singleQuotes = (scriptSnippet.match(/'/g) || []).length;
    const doubleQuotes = (scriptSnippet.match(/"/g) || []).length;
    const backticks = (scriptSnippet.match(/`/g) || []).length;
    if (singleQuotes % 2 !== 0) html += "'";
    if (doubleQuotes % 2 !== 0) html += '"';
    if (backticks % 2 !== 0) html += '`';

    const openBraces = (scriptSnippet.match(/\{/g) || []).length;
    const closeBraces = (scriptSnippet.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      html += "\n}".repeat(openBraces - closeBraces);
    }
    html += "\n</script>";
  }

  // 3. Ensure standard HTML5 boilerplate structure
  const hasHtmlTag = /<html[\s>]/i.test(html);
  const hasDoctype = /<!DOCTYPE\s+html/i.test(html);

  if (!hasHtmlTag && !hasDoctype) {
    // Pure body or snippet: wrap with full shell
    html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body>
${html}
</body>
</html>`;
  } else {
    // Has partial or full HTML document shell
    if (!/<head[\s>]/i.test(html)) {
      html = html.replace(/<html[^>]*>/i, `$&\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>${title}</title>\n</head>`);
    } else if (!/<\/head>/i.test(html)) {
      html += "\n</head>";
    }

    if (!/<body[\s>]/i.test(html)) {
      html += "\n<body>";
    }
    if (!/<\/body>/i.test(html)) {
      html += "\n</body>";
    }
    if (!/<\/html>/i.test(html)) {
      html += "\n</html>";
    }
  }

  return html;
}
