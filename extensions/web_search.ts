/**
 * Web Search Extension for Pi
 *
 * Provides a `web_search` tool that queries a SearXNG instance or Tavily API.
 *
 * Configuration:
 *   Set SEARCH_PROVIDER env var to 'searxng' (default) or 'tavily'.
 *   For SearXNG: set SEARXNG_URL env var to your instance (default: http://localhost:8080)
 *   For Tavily:  set TAVILY_API_KEY env var to your Tavily API key.
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

type SearchProvider = "searxng" | "tavily";

function getSearchProvider(): SearchProvider {
  const provider = (process.env.SEARCH_PROVIDER || "searxng").toLowerCase();
  if (provider === "tavily") return "tavily";
  return "searxng";
}

async function searchViaTavily(
  query: string,
  maxResults: number,
): Promise<{ results: SearxResult[]; query: string }> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY environment variable is required when SEARCH_PROVIDER=tavily");
  }

  let tavily: any;
  try {
    tavily = (await import("@tavily/core")).tavily;
  } catch {
    throw new Error(
      "Failed to import @tavily/core. Install it with: npm install @tavily/core",
    );
  }

  const client = tavily({ apiKey });
  const response = await client.search(query, {
    maxResults: Math.min(maxResults, 20),
    topic: "general",
  });

  const results: SearxResult[] = (response.results ?? []).map((r: any) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    content: r.content,
    engine: "tavily",
    score: r.score,
  }));

  return { results, query };
}

export const WebSearchParamsSchema = Type.Object({
  query: Type.String({ description: "Search query" }),
  language: Type.Optional(Type.String({ description: "Language code (e.g. en, en-US, de). Default: auto", default: "auto" })),
  results: Type.Optional(Type.Integer({ description: "Max number of results to return (1-60). Default: 20 (one page). Automatically pages through SearXNG (up to 3 pages) if needed.", minimum: 1, maximum: 60, default: 20 })),
});

export type WebSearchInput = Static<typeof WebSearchParamsSchema>;

const webSearchTool = defineTool({
  name: "web_search",
  label: "Web Search",
  description: [
    "Search the web using SearXNG or Tavily (configurable via SEARCH_PROVIDER env var).",
    "Returns a list of results with title, URL, and snippet.",
    "With SearXNG: automatically aggregates up to 3 pages when more than ~20 are needed.",
    "With Tavily: returns up to 20 results per query.",
    "Use web_search when the user asks about current events, facts, or anything",
    "that requires up-to-date information beyond the model's training data.",
    `Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}; if truncated, full output is saved to a temp file.`,
  ].join(" "),
  promptSnippet: "Search the web for current information",
  promptGuidelines: [
    "Use web_search when the user asks about recent events, current data, or external facts.",
    "Use web_search to verify claims, find documentation, or discover resources online.",
    "If web_search returns no results but includes suggestions, consider using a suggested query to refine your search.",
  ],
  parameters: WebSearchParamsSchema,

  async execute(_toolCallId, params, signal) {
    const provider = getSearchProvider();
    const maxResults = Math.floor(Math.min(60, Math.max(1, params.results ?? 20)));
    const language = params.language ?? "auto";

    const allResults: SearxResult[] = [];
    const seenUrls = new Set<string>();
    let suggestions: string[] | undefined;
    let finalQuery = params.query;
    let fullOutputPath: string | undefined;

    try {
      if (provider === "tavily") {
        // Tavily code path
        const tavilyResponse = await searchViaTavily(params.query, maxResults);
        finalQuery = tavilyResponse.query;
        for (const r of tavilyResponse.results) {
          if (!seenUrls.has(r.url)) {
            seenUrls.add(r.url);
            allResults.push(r);
          }
        }
      } else {
        // SearXNG code path (default)
        const searxngUrl = (process.env.SEARXNG_URL || "http://localhost:8080").replace(/\/$/, "");
        const MAX_PAGES = 3;

        for (let page = 1; page <= MAX_PAGES; page++) {
          const searchParams = new URLSearchParams({
            q: params.query,
            format: "json",
            language,
            pageno: String(page),
          });

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
      const truncation = truncateHead(rawText, {
        maxLines: DEFAULT_MAX_LINES,
        maxBytes: DEFAULT_MAX_BYTES,
      });

      // Always write full output to a temp file so renderResult can reference it
      const tmpDir = await mkdtemp(path.join(os.tmpdir(), "pi-web-search-"));
      fullOutputPath = path.join(tmpDir, "output.txt");
      await writeFile(fullOutputPath, rawText, "utf-8");

      let finalText = truncation.content;
      if (truncation.truncated) {
        finalText += `\n\n[Output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}). Full output saved to: ${fullOutputPath}]`;
      }

      return {
        content: [{ type: "text", text: finalText }],
        details: { query: finalQuery, totalResults: allResults.length, results: allResults.slice(0, maxResults), fullOutputPath },
      };
    } catch (err: any) {
      if (provider === "tavily") {
        throw new Error(`Failed to query Tavily: ${err.message ?? err}`);
      }
      const searxngUrl = (process.env.SEARXNG_URL || "http://localhost:8080").replace(/\/$/, "");
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
    const details = result.details as {
      query?: string;
      totalResults?: number;
      results?: Array<{ title?: string; url?: string; score?: number; engine?: string; content?: string }>;
      fullOutputPath?: string;
    } | undefined;
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
      // Default: top 3 compact — Title [engine]
      const top3 = [...(details.results ?? [])]
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 3);
      for (const r of top3) {
        const engineTag = r.engine ? theme.fg("dim", ` [${r.engine}]`) : "";
        text += `\n  ${theme.fg("toolTitle", r.title ?? "(untitled)")}${engineTag}`;
      }
      if (showing > 3) {
        text += `\n  ${theme.fg("muted", `... and ${showing - 3} more (Ctrl+O for full list)`)}`;
      }
    }

    if (expanded && details?.results?.length) {
      // Expanded (Ctrl+O): top 10 cards — L1 title|engine|score, L2 URL, L3 snippet
      const top10 = [...details.results]
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 10);
      for (const r of top10) {
        const scoreStr = r.score !== undefined ? r.score.toFixed(2) : "—";
        const metaStr = r.engine ? ` | ${r.engine} | ${scoreStr}` : ` | ${scoreStr}`;
        // L1: title + meta
        text += `\n  ${theme.fg("toolTitle", r.title ?? "(untitled)")}${theme.fg("dim", metaStr)}`;
        // L2: full URL
        text += `\n    ${theme.fg("dim", r.url ?? "")}`;
        // L3: snippet preview
        if (r.content) {
          const snippet = r.content.replace(/\s+/g, " ").trim();
          const truncated = snippet.length > 120
            ? snippet.slice(0, 120).replace(/\s+\S*$/, "") + "..."
            : snippet;
          text += `\n    ${theme.fg("muted", truncated)}`;
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
