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
  formatSize,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type, type Static } from "typebox";
import { writeWithFallback } from "./utils/output-sink";
import { abbreviateUrl, getDomain, getErrorText, normalizeWhitespace } from "./utils/render-helpers";



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
  language: Type.Optional(Type.String({ description: "Language code (e.g. en, en-US, de). Omit to use SearXNG default.", default: "" })),
  results: Type.Optional(Type.Integer({ description: "Max number of results to return (1-60). Default: 20 (one page). Automatically pages through SearXNG (up to 3 pages) if needed.", minimum: 1, maximum: 60, default: 20 })),
});

export type WebSearchInput = Static<typeof WebSearchParamsSchema>;

const webSearchTool = defineTool({
  name: "web_search",
  label: "Web Search",
  description: [
    "Search the web using a SearXNG instance.",
    "Returns a list of results with title, URL, and snippet.",
    "Automatically aggregates up to 3 pages of SearXNG results when more than ~20 are needed.",
    "Use web_search when the user asks about current events, facts, or anything",
    "that requires up-to-date information beyond the model's training data.",
    `Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}; if truncated, full output is saved to a temp file.`,
  ].join(" "),
  promptSnippet: "Search the web for current information",
  promptGuidelines: [
    "Use web_search when the user asks about recent events, current data, or external facts.",
    "Use web_search to verify claims, find documentation, or discover resources online.",
    "If web_search returns no results but includes suggestions, consider using a suggested query to refine your search.",
    "If web_search returns multiple (2–5) relevant results that all need to be read, prefer web_batch_fetch to fetch them in parallel instead of calling web_fetch repeatedly.",
  ],
  parameters: WebSearchParamsSchema,

  async execute(_toolCallId, params, signal) {
    const searxngUrl = (process.env.SEARXNG_URL || "http://localhost:8080").replace(/\/$/, "");
    const maxResults = Math.floor(Math.min(60, Math.max(1, params.results ?? 20)));
    const language = params.language ?? "";

    const allResults: SearxResult[] = [];
    const seenUrls = new Set<string>();
    let suggestions: string[] | undefined;
    let finalQuery = params.query;
    let fullOutputPath: string | undefined;
    const MAX_PAGES = 3;

    try {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const searchParams = new URLSearchParams({
          q: params.query,
          format: "json",
          pageno: String(page),
        });
        if (language) searchParams.set("language", language);

        const response = await fetch(`${searxngUrl}/search?${searchParams.toString()}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal,
        });

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new Error(`SearXNG error: ${response.status} ${response.statusText}\n${body}`);
        }

        const data = (await response.json()) as SearxResponse;
        finalQuery = data.query;

        if (data.suggestions && data.suggestions.length > 0 && !suggestions) {
          suggestions = data.suggestions;
        }

        if (!data.results || data.results.length === 0) {
          break;
        }

        for (const r of data.results) {
          if (!seenUrls.has(r.url)) {
            seenUrls.add(r.url);
            allResults.push(r);
          }
        }

        if (allResults.length >= maxResults) {
          break;
        }
      }

      if (allResults.length === 0) {
        let text = `No results found for "${finalQuery}".`;
        if (suggestions && suggestions.length > 0) {
          text += `\n\nSuggestions:\n${suggestions.map((s) => `- ${s}`).join("\n")}`;
        }
        return {
          content: [{ type: "text", text }],
          details: { query: finalQuery, totalResults: 0, results: [] as SearxResult[], fullOutputPath: undefined as string | undefined },
        };
      }

      const lines: string[] = [
        `Results for "${finalQuery}":`,
        "",
      ];

      for (let i = 0; i < Math.min(maxResults, allResults.length); i++) {
        const r = allResults[i];
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
      const sink = await writeWithFallback(rawText, {
        tmpPrefix: "pi-web-search-",
        alwaysWriteFile: true,
      });
      fullOutputPath = sink.fullOutputPath;

      return {
        content: [{ type: "text", text: sink.text }],
        details: { query: finalQuery, totalResults: allResults.length, results: allResults.slice(0, maxResults), fullOutputPath },
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

  renderResult(result, { expanded, isPartial }, theme, context) {
    const isError = context?.isError ?? false;

    if (isPartial) {
      const query = (result.details as any)?.query as string | undefined;
      const label = query ? `Searching "${query}"...` : "Searching...";
      return new Text(theme.fg("warning", label), 0, 0);
    }

    const details = result.details as {
      query?: string;
      totalResults?: number;
      results?: Array<{ title?: string; url?: string; score?: number; engine?: string; content?: string }>;
      fullOutputPath?: string;
    } | undefined;

    if (isError) {
      const errText = getErrorText(result);
      const query = details?.query;
      let text = theme.fg("error", "✗ Search failed");
      if (query) text += `  ${theme.fg("dim", query)}`;
      text += `\n\n  ${theme.fg("toolOutput", errText)}`;
      return new Text(text, 0, 0);
    }

    if (!details) {
      return new Text(theme.fg("error", "No result details"), 0, 0);
    }
    const showing = details.results?.length ?? 0;
    const total = details?.totalResults ?? 0;
    let text = theme.fg("success", `✓ ${showing} unique results`);
    if (total > showing) {
      text += theme.fg("dim", ` (${total} total)`);
    }

    if (!expanded && showing > 0) {
      // Default: top 3 compact — [i] Title + domain + snippet
      const top3 = (details.results ?? []).slice(0, 3);
      for (let i = 0; i < top3.length; i++) {
        const r = top3[i];
        const domain = r.url ? theme.fg("dim", `  ${getDomain(r.url)}`) : "";
        text += `\n  [${i + 1}] ${theme.fg("toolTitle", r.title ?? "(untitled)")}${domain}`;
        if (r.content) {
          const snippet = normalizeWhitespace(r.content);
          const short = snippet.length > 90 ? snippet.slice(0, 90).replace(/\s+\S*$/, "") + "..." : snippet;
          text += `\n    ${theme.fg("muted", short)}`;
        }
      }
      if (showing > 3) {
        text += `\n  ${theme.fg("muted", `... and ${showing - 3} more (Ctrl+O for full list)`)}`;
      }
    }

    if (expanded && details?.results?.length) {
      // Expanded (Ctrl+O): top 10 cards — [i] Title|engine|score, URL, snippet
      const top10 = (details.results ?? []).slice(0, 10);
      for (let i = 0; i < top10.length; i++) {
        const r = top10[i];
        const scoreStr = r.score !== undefined ? r.score.toFixed(2) : "—";
        const metaStr = r.engine ? ` | ${r.engine} | ${scoreStr}` : ` | ${scoreStr}`;
        text += `\n  [${i + 1}] ${theme.fg("toolTitle", r.title ?? "(untitled)")}${theme.fg("dim", metaStr)}`;
        text += `\n    ${theme.fg("dim", abbreviateUrl(r.url ?? ""))}`;
        if (r.content) {
          text += `\n    ${theme.fg("muted", normalizeWhitespace(r.content))}`;
        }
        text += "\n";
      }
      if (details.results.length > 10) {
        text += `\n  ${theme.fg("muted", `... and ${details.results.length - 10} more results (see full output file)`)}`;
      }
    }

    if (expanded && details?.fullOutputPath) {
      text += `\n${theme.fg("accent", `Full output: ${details.fullOutputPath}`)}`;
    }

    return new Text(text, 0, 0);
  },
});

export default function (pi: ExtensionAPI) {
  pi.registerTool(webSearchTool);
}


