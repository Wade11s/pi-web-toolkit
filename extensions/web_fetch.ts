/**
 * Web Fetch Extension — Fetch full page content via scrapling
 *
 * Provides a `web_fetch` tool that downloads and extracts readable
 * content from any URL using the scrapling CLI.
 *
 * Requires: `pip install "scrapling[all]"` and `scrapling install`
 *
 * Usage:
 *   The LLM calls web_fetch with a URL after web_search finds relevant pages.
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
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { runScraplingWithFallback } from "./utils/scrapling";
import { extractPreview } from "./utils/content-preview";
import { writeWithFallback } from "./utils/output-sink";
import { scrapeKeyless } from "./utils/firecrawl";
import { abbreviateUrl, getDomain, getErrorText, normalizeWhitespace, formatExtraction } from "./utils/render-helpers";

export const WebFetchParamsSchema = Type.Object({
  url: Type.String({ description: "Full URL to fetch (e.g. https://example.com/article)" }),
  selector: Type.Optional(Type.String({ description: "CSS selector to extract only a specific part of the page" })),
  stealthy: Type.Optional(Type.Boolean({ description: "Use stealthy mode for protected/anti-bot sites. Default: false", default: false })),
});

export type WebFetchInput = Static<typeof WebFetchParamsSchema>;

const webFetchTool = defineTool({
  name: "web_fetch",
  label: "Web Fetch",
  description: [
    "Fetch and extract readable content from a web page URL.",
    "Uses scrapling to download the page and convert it to clean markdown.",
    "Use web_fetch to read the full content of a specific result or user-provided URL.",
    "Callers remain responsible for robots.txt and site terms; Scrapling extract commands do not enforce them automatically.",
    `Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}; if truncated, full output is saved to a temp file.`,
  ].join(" "),
  promptSnippet: "Fetch full page content from a URL as markdown",
  promptGuidelines: [
    "Use web_fetch to read a single page (article, doc, or blog) that needs no interaction.",
    "For a single URL, always use web_fetch instead of web_batch_fetch.",
    "If the page is dynamic/JavaScript-heavy, the tool automatically uses browser automation.",
    "When reading multiple (2–5) pages at once (e.g., after web_search), prefer web_batch_fetch over repeated web_fetch calls.",
    "Always pass the full URL including https://.",
  ],
  parameters: WebFetchParamsSchema,

  async execute(_toolCallId, params, signal) {
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pi-web-fetch-"));
    const tmpFile = path.join(tmpDir, "page.md");
    let tmpFull: string | undefined;

    try {
      const { ok, stderr } = await runScraplingWithFallback(
        params.url,
        tmpFile,
        { selector: params.selector, stealthy: params.stealthy, noGetFallback: params.stealthy },
        signal,
      );

      let content: string;
      let bytes: number;
      let viaFirecrawl = false;

      if (ok) {
        content = await fs.promises.readFile(tmpFile, "utf-8");
        bytes = (await fs.promises.stat(tmpFile)).size;
      } else {
        // Local scrapling failed — try the Firecrawl keyless fallback.
        const localError = `Failed to fetch ${params.url}\n\nscrapling error:\n${stderr}`;
        const fb = await scrapeKeyless(params.url, {}, signal);
        if (fb.ok) {
          content = fb.content;
          bytes = fb.bytes;
          viaFirecrawl = true;
        } else {
          // Graceful skip (CLI absent / IP flagged / rate-limited / disabled):
          // never leave the user worse off — surface the original local error.
          throw new Error(localError);
        }
      }

      const preview = extractPreview(content, 500);
      const viaTag = viaFirecrawl ? "\n(via Firecrawl keyless fallback)" : "";
      const rawText = `Fetched: ${params.url}${viaTag}\nSize: ${bytes} bytes\n\n---\n\n${content}`;
      const sink = await writeWithFallback(rawText, {
        tmpPrefix: "pi-web-fetch-full-",
      });
      tmpFull = sink.fullOutputPath;

      return {
        content: [{ type: "text", text: sink.text }],
        details: {
          url: params.url,
          bytes,
          fullOutputPath: tmpFull,
          preview,
          selector: params.selector,
          stealthy: params.stealthy,
          viaFirecrawl,
        },
      };
    } catch (err: any) {
      throw new Error(`Error fetching ${params.url}: ${err.message ?? err}`);
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  },

  renderCall(args, theme) {
    let text = theme.fg("toolTitle", theme.bold("web_fetch "));
    text += theme.fg("muted", args.url);
    if (args.stealthy) {
      text += theme.fg("dim", " [stealthy]");
    }
    if (args.selector) {
      text += theme.fg("dim", ` [selector=${args.selector}]`);
    }
    return new Text(text, 0, 0);
  },

  renderResult(result, { expanded, isPartial }, theme, context) {
    const isError = context?.isError ?? false;

    if (isPartial) {
      const url = (result.details as any)?.url as string | undefined;
      const domain = url ? getDomain(url) : "";
      const label = domain ? `Fetching ${domain}...` : "Fetching...";
      return new Text(theme.fg("warning", label), 0, 0);
    }
    const details = result.details as {
      url?: string;
      bytes?: number;
      fullOutputPath?: string;
      preview?: string;
      selector?: string;
      stealthy?: boolean;
      viaFirecrawl?: boolean;
    } | undefined;

    if (isError) {
      const errText = getErrorText(result);
      let text = theme.fg("error", "✗ Fetch failed");
      if (details?.url) text += `  ${theme.fg("dim", abbreviateUrl(details.url))}`;
      text += `\n\n  ${theme.fg("toolOutput", errText)}`;
      return new Text(text, 0, 0);
    }

    let text = theme.fg("success", "✓ Fetched");
    if (details?.viaFirecrawl) {
      text += theme.fg("accent", " [Firecrawl keyless]");
    }
    if (details?.url) {
      text += `  ${theme.fg("dim", abbreviateUrl(details.url))}`;
    }
    if (details?.bytes && details?.preview) {
      text += `  ${theme.fg("muted", formatExtraction(details.bytes, details.preview.length))}`;
    }

    if (details?.selector) {
      text += `\n  ${theme.fg("dim", `[selector=${details.selector}]`)}`;
    }
    if (details?.stealthy) {
      text += `${details?.selector ? "" : "\n  "}${theme.fg("dim", "[stealthy]")}`;
    }

    if (!expanded && details?.preview) {
      const snippet = normalizeWhitespace(details.preview);
      const short = snippet.length > 160
        ? snippet.slice(0, 160).replace(/\s+\S*$/, "") + "..."
        : snippet;
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
  pi.registerTool(webFetchTool);
}
