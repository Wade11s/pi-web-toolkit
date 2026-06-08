/**
 * SearXNG Web Search Extension for Pi
 *
 * Provides a `web_search` tool that queries a SearXNG instance.
 *
 * Configuration:
 *   Set SEARXNG_URL env var to your instance (default: http://localhost:8080)
 *
 * Usage:
 *   The LLM can call web_search with a query to get search results.
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
import { mkdtemp, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";



interface SearxResult {
  title: string;
  url: string;
  content?: string;
  engine?: string;
  score?: number;
}

interface SearxResponse {
  query: string;
  results: SearxResult[];
  suggestions?: string[];
}

export const WebSearchParamsSchema = Type.Object({
  query: Type.String({ description: "Search query" }),
  language: Type.Optional(Type.String({ description: "Language code (e.g. en, en-US, de). Default: auto", default: "auto" })),
  results: Type.Optional(Type.Integer({ description: "Max number of results to return (1-50). Default: 10", minimum: 1, maximum: 50, default: 10 })),
});

export type WebSearchInput = Static<typeof WebSearchParamsSchema>;

const webSearchTool = defineTool({
  name: "web_search",
  label: "Web Search",
  description: [
    "Search the web using a SearXNG instance.",
    "Returns a list of results with title, URL, and snippet.",
    "Use web_search when the user asks about current events, facts, or anything",
    "that requires up-to-date information beyond the model's training data.",
    `Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}; if truncated, full output is saved to a temp file.`,
  ].join(" "),
  promptSnippet: "Search the web for current information",
  promptGuidelines: [
    "Use web_search when the user asks about recent events, current data, or external facts.",
    "Use web_search to verify claims, find documentation, or discover resources online.",
  ],
  parameters: WebSearchParamsSchema,

  async execute(_toolCallId, params, signal) {
    const searxngUrl = (process.env.SEARXNG_URL || "http://localhost:8080").replace(/\/$/, "");
    const maxResults = Math.floor(Math.min(50, Math.max(1, params.results ?? 10)));
    const searchParams = new URLSearchParams({
      q: params.query,
      format: "json",
      language: params.language ?? "auto",
    });

    const url = `${searxngUrl}/search?${searchParams.toString()}`;

    let fullOutputPath: string | undefined;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`SearXNG error: ${response.status} ${response.statusText}\n${body}`);
      }

      const data = (await response.json()) as SearxResponse;

      if (!data.results || data.results.length === 0) {
        let text = `No results found for "${data.query}".`;
        if (data.suggestions && data.suggestions.length > 0) {
          text += `\n\nSuggestions:\n${data.suggestions.map((s) => `- ${s}`).join("\n")}`;
        }
        return {
          content: [{ type: "text", text }],
          details: { query: data.query, totalResults: 0, results: [], fullOutputPath: undefined },
        };
      }

      const lines: string[] = [
        `Results for "${data.query}":`,
        "",
      ];

      for (let i = 0; i < Math.min(maxResults, data.results.length); i++) {
        const r = data.results[i];
        lines.push(`${i + 1}. ${r.title}`);
        lines.push(`   URL: ${r.url}`);
        if (r.content) {
          const snippet = r.content.replace(/\s+/g, " ").trim();
          lines.push(`   ${snippet}`);
        }
        if (r.engine) {
          lines.push(`   [engine: ${r.engine}]`);
        }
        lines.push("");
      }

      const rawText = lines.join("\n");
      const truncation = truncateHead(rawText, {
        maxLines: DEFAULT_MAX_LINES,
        maxBytes: DEFAULT_MAX_BYTES,
      });

      let finalText = truncation.content;
      if (truncation.truncated) {
        const tmpDir = await mkdtemp(path.join(os.tmpdir(), "pi-web-search-"));
        fullOutputPath = path.join(tmpDir, "output.txt");
        await writeFile(fullOutputPath, rawText, "utf-8");
        finalText += `\n\n[Output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}). Full output saved to: ${fullOutputPath}]`;
      }

      return {
        content: [{ type: "text", text: finalText }],
        details: { query: data.query, totalResults: data.results.length, results: data.results.slice(0, maxResults), fullOutputPath },
      };
    } catch (err: any) {
      throw new Error(`Failed to query SearXNG at ${searxngUrl}: ${err.message ?? err}`);
    }
  },

  renderCall(args, theme) {
    let text = theme.fg("toolTitle", theme.bold("web_search "));
    text += theme.fg("muted", args.query);
    if (args.results) {
      text += theme.fg("dim", ` results=${args.results}`);
    }
    return new Text(text, 0, 0);
  },

  renderResult(result, { expanded, isPartial }, theme) {
    if (isPartial) {
      return new Text(theme.fg("warning", "Searching..."), 0, 0);
    }
    const details = result.details as { query?: string; totalResults?: number; results?: Array<{ title?: string; url?: string }>; fullOutputPath?: string } | undefined;
    let text = theme.fg("success", `✓ ${details?.totalResults ?? 0} results`);
    if (details?.query) {
      text += theme.fg("muted", ` for ${details.query}`);
    }
    if (expanded && details?.results?.length) {
      for (const r of details.results.slice(0, 10)) {
        text += `\n  ${theme.fg("dim", `${r.title ?? "(untitled)"} — ${r.url ?? ""}`)}`;
      }
    }
    if (expanded && details?.fullOutputPath) {
      text += `\n${theme.fg("dim", `Full output: ${details.fullOutputPath}`)}`;
    }
    return new Text(text, 0, 0);
  },
});

export default function (pi: ExtensionAPI) {
  pi.registerTool(webSearchTool);
}
