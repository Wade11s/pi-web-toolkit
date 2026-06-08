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
  truncateHead,
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
    "Use web_fetch AFTER web_search to read the full content of a result page.",
    "Respects robots.txt and site ToS.",
    `Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}; if truncated, full output is saved to a temp file.`,
  ].join(" "),
  promptSnippet: "Fetch full page content from a URL as markdown",
  promptGuidelines: [
    "Use web_fetch after web_search to read full articles, docs, or pages found in search results.",
    "Always pass the full URL including https://.",
    "If the page is dynamic/JavaScript-heavy, the tool automatically uses browser automation.",
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

      if (!ok) {
        throw new Error(`Failed to fetch ${params.url}\n\nscrapling error:\n${stderr}`);
      }

      const content = await fs.promises.readFile(tmpFile, "utf-8");
      const stats = await fs.promises.stat(tmpFile);

      const rawText = `Fetched: ${params.url}\nSize: ${stats.size} bytes\n\n---\n\n${content}`;
      const truncation = truncateHead(rawText, {
        maxLines: DEFAULT_MAX_LINES,
        maxBytes: DEFAULT_MAX_BYTES,
      });

      let finalText = truncation.content;
      if (truncation.truncated) {
        const tmpFullDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pi-web-fetch-full-"));
        tmpFull = path.join(tmpFullDir, "output.txt");
        await fs.promises.writeFile(tmpFull, rawText, "utf-8");
        finalText += `\n\n[Output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}). Full output saved to: ${tmpFull}]`;
      }

      return {
        content: [{ type: "text", text: finalText }],
        details: { url: params.url, bytes: stats.size, fullOutputPath: tmpFull },
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
    if (args.selector) {
      text += theme.fg("dim", ` selector=${args.selector}`);
    }
    return new Text(text, 0, 0);
  },

  renderResult(result, { expanded, isPartial }, theme) {
    if (isPartial) {
      return new Text(theme.fg("warning", "Fetching..."), 0, 0);
    }
    const details = result.details as { url?: string; bytes?: number; fullOutputPath?: string } | undefined;
    let text = theme.fg("success", "✓ Fetched");
    if (details?.bytes) {
      text += theme.fg("muted", ` (${formatSize(details.bytes)})`);
    }
    if (expanded) {
      text += `\n${theme.fg("dim", details?.url ?? "")}`;
      if (details?.fullOutputPath) {
        text += `\n${theme.fg("dim", `Full output: ${details.fullOutputPath}`)}`;
      }
    }
    return new Text(text, 0, 0);
  },
});

export default function (pi: ExtensionAPI) {
  pi.registerTool(webFetchTool);
}
