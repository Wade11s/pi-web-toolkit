/**
 * Firecrawl Scrape Extension — single-page fetch via firecrawl-cli (keyless)
 *
 * Provides a `firecrawl_scrape` tool that fetches a single URL as clean
 * markdown through the official Firecrawl CLI in keyless mode (no API key,
 * no signup). It is an explicit escape hatch for hard targets the local
 * scrapling fetcher cannot handle (anti-bot, heavy JS, PDFs), and also
 * underpins the automatic `web_fetch` fallback.
 *
 * Requires: `npm install -g firecrawl-cli` (optional; the tool degrades
 * gracefully and reports when the CLI is unavailable).
 *
 * Privacy: the URL and page content are sent to Firecrawl's cloud.
 */

import {
  defineTool,
  type ExtensionAPI,
  formatSize,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type, type Static } from "typebox";
import { scrapeKeyless } from "./utils/firecrawl";
import { extractPreview } from "./utils/content-preview";
import { writeWithFallback } from "./utils/output-sink";
import { abbreviateUrl, getDomain, getErrorText, normalizeWhitespace, formatExtraction } from "./utils/render-helpers";

export const FirecrawlScrapeParamsSchema = Type.Object({
  url: Type.String({ description: "Full URL to fetch (e.g. https://example.com/article)" }),
  waitFor: Type.Optional(Type.Integer({ description: "Wait (ms) before scraping for JS-rendered content", minimum: 0 })),
  includeTags: Type.Optional(Type.Array(Type.String(), { description: "HTML tags to include (Firecrawl tag filter, not a CSS selector)" })),
  excludeTags: Type.Optional(Type.Array(Type.String(), { description: "HTML tags to exclude" })),
  onlyMainContent: Type.Optional(Type.Boolean({ description: "Extract only main content (drop nav/footer). Default: true", default: true })),
});

export type FirecrawlScrapeInput = Static<typeof FirecrawlScrapeParamsSchema>;

const firecrawlScrapeTool = defineTool({
  name: "firecrawl_scrape",
  label: "Firecrawl Scrape",
  description: [
    "Fallback-only cloud fetch via Firecrawl (keyless — no API key, no signup).",
    "Do not use firecrawl_scrape as the first attempt for ordinary URL reading; use web_fetch first.",
    "Use firecrawl_scrape only when web_fetch already failed on a hard target (anti-bot,",
    "JavaScript-heavy pages, PDFs), or when the user explicitly asks for Firecrawl/cloud rendering.",
    "Privacy: the URL and page content are sent to Firecrawl's cloud.",
    `Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}; if truncated, full output is saved to a temp file.`,
  ].join(" "),
  promptSnippet: "Fallback-only Firecrawl scrape",
  promptGuidelines: [
    "Use firecrawl_scrape only after web_fetch fails or explicit cloud scraping/rendering.",
    "Use firecrawl_scrape for anti-bot pages, heavy JS, and PDFs.",
  ],
  parameters: FirecrawlScrapeParamsSchema,

  async execute(_toolCallId, params, signal) {
    const out = await scrapeKeyless(params.url, {
      waitFor: params.waitFor,
      includeTags: params.includeTags,
      excludeTags: params.excludeTags,
      onlyMainContent: params.onlyMainContent,
    }, signal);

    if (!out.ok) {
      const reason = out.failure?.reason ?? "unknown error";
      throw new Error(`Firecrawl scrape failed (${out.failure?.kind}): ${reason}`);
    }

    const preview = extractPreview(out.content, 500);
    const rawText = `Fetched: ${params.url}\n(via Firecrawl keyless${out.creditsUsed !== undefined ? `, ${out.creditsUsed} credits` : ""})\nSize: ${out.bytes} bytes\n\n---\n\n${out.content}`;
    const sink = await writeWithFallback(rawText, { tmpPrefix: "pi-firecrawl-scrape-full-" });

    return {
      content: [{ type: "text", text: sink.text }],
      details: {
        url: params.url,
        bytes: out.bytes,
        fullOutputPath: sink.fullOutputPath,
        preview,
        title: out.title,
        creditsUsed: out.creditsUsed,
        viaFirecrawl: true,
      },
    };
  },

  renderCall(args, theme) {
    let text = theme.fg("toolTitle", theme.bold("firecrawl_scrape "));
    text += theme.fg("muted", args.url);
    if (args.waitFor) {
      text += theme.fg("dim", ` [wait=${args.waitFor}]`);
    }
    return new Text(text, 0, 0);
  },

  renderResult(result, { expanded, isPartial }, theme, context) {
    const isError = context?.isError ?? false;
    const details = result.details as {
      url?: string;
      bytes?: number;
      fullOutputPath?: string;
      preview?: string;
      title?: string;
      creditsUsed?: number;
    } | undefined;

    if (isPartial) {
      const domain = details?.url ? getDomain(details.url) : "";
      const label = domain ? `Scraping ${domain} via Firecrawl...` : "Scraping via Firecrawl...";
      return new Text(theme.fg("warning", label), 0, 0);
    }

    if (isError) {
      const errText = getErrorText(result);
      let text = theme.fg("error", "✗ Firecrawl scrape failed");
      if (details?.url) text += `  ${theme.fg("dim", abbreviateUrl(details.url))}`;
      text += `\n\n  ${theme.fg("toolOutput", errText)}`;
      return new Text(text, 0, 0);
    }

    let text = theme.fg("success", "✓ Fetched");
    text += theme.fg("accent", " [Firecrawl keyless]");
    if (details?.title) {
      text += `  ${theme.fg("toolTitle", details.title)}`;
    } else if (details?.url) {
      text += `  ${theme.fg("dim", abbreviateUrl(details.url))}`;
    }
    if (details?.bytes && details?.preview) {
      text += `  ${theme.fg("muted", formatExtraction(details.bytes, details.preview.length))}`;
    }

    if (!expanded && details?.preview) {
      const snippet = normalizeWhitespace(details.preview);
      const short = snippet.length > 160 ? snippet.slice(0, 160).replace(/\s+\S*$/, "") + "..." : snippet;
      text += `\n\n  ${theme.fg("muted", short)}`;
    }

    if (expanded) {
      if (details?.preview) {
        text += `\n\n  ${theme.fg("muted", normalizeWhitespace(details.preview))}`;
      }
      if (details?.fullOutputPath) {
        text += `\n\n${theme.fg("accent", `Full output: ${details.fullOutputPath}`)}`;
      }
    }

    return new Text(text, 0, 0);
  },
});

export default function (pi: ExtensionAPI) {
  pi.registerTool(firecrawlScrapeTool);
}
