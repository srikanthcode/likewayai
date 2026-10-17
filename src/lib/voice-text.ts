// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — VOICE TEXT PREPARATION
// Strips markup/artifacts/markdown from assistant content before it is
// spoken, so TTS never reads raw tags or link URLs aloud.
// ══════════════════════════════════════════════════════════════════════

export function cleanTextForSpeech(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // Strip artifact blocks (code etc.) into a single spoken placeholder.
  cleaned = cleaned.replace(/<artifact\s+type="code"[\s\S]*?<\/artifact>/gi, '[Code block shared]');
  cleaned = cleaned.replace(/<artifact[\s\S]*?>/gi, '').replace(/<\/artifact>/gi, '');

  // Strip markdown punctuation, collapse URLs to "link", collapse whitespace.
  cleaned = cleaned
    .replace(/[#*`_~>\[\]()!]/g, '')
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/\n+/g, ' ')
    .trim();

  return cleaned;
}
