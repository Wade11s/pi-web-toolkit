/**
 * Shared rendering utilities for web toolkit tools.
 *
 * Functions that format URLs, snippets, and metadata for consistent
 * TUI presentation across web_search, web_fetch, web_browse, and
 * web_batch_fetch.
 */

/**
 * Abbreviate a URL for compact display.
 *
 *   https://github.com/microsoft/TypeScript/blob/main/README.md
 *   → github.com/.../README.md
 *
 *   https://example.com
 *   → example.com
 */
export function abbreviateUrl(url: string, maxLen = 45): string {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const path = u.pathname + u.search;
    if (path === "/" || path === "") return host;
    const full = host + path;
    if (full.length <= maxLen) return full;
    // Keep start and end, ellipsis in middle
    const keepStart = Math.floor(maxLen * 0.4);
    const keepEnd = Math.floor(maxLen * 0.35);
    return full.slice(0, keepStart) + "..." + full.slice(-keepEnd);
  } catch {
    if (url.length <= maxLen) return url;
    return url.slice(0, maxLen - 3) + "...";
  }
}

/**
 * Extract domain (hostname) from a URL.
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Normalize whitespace for display: collapse multiple whitespace
 * chars into a single space and trim.
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Format an extraction-quality label.
 *
 *   "15KB → 500 chars"  (when we extracted a small preview from large source)
 */
export function formatExtraction(sizeBytes: number, previewChars: number): string {
  const sizeLabel = sizeBytes >= 1024 * 1024
    ? `${(sizeBytes / (1024 * 1024)).toFixed(1)}MB`
    : sizeBytes >= 1024
      ? `${(sizeBytes / 1024).toFixed(1)}KB`
      : `${sizeBytes}B`;
  return `${sizeLabel} → ${previewChars} chars`;
}

/**
 * Extract the human-readable error message from a tool result when
 * the tool threw an error. Falls back to "Unknown error".
 */
export function getErrorText(result: { content?: Array<{ type?: string; text?: string }> }): string {
  const first = result.content?.[0];
  if (first && typeof first.text === "string") return first.text;
  return "Unknown error";
}
