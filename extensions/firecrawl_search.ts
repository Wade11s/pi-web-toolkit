/**
 * Firecrawl Search Extension — web search via firecrawl-cli (keyless)
 *
 * Provides a `firecrawl_search` tool that searches the web through the
 * official Firecrawl CLI in keyless mode (no API key, no signup). It exposes
 * Firecrawl-specific capabilities the local SearXNG tool does not: sources
 * (web/images/news), categories (github/research/pdf), and domain filters.
 *
 * Requires: `npm install -g firecrawl-cli` (optional; degrades gracefully).
 * Privacy: the query is sent to Firecrawl's cloud.
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
import { StringEnum } from "@earendil-works/pi-ai";
import { searchKeyless, buildSearchQuery } from "./utils/firecrawl";
import { writeWithFallback } from "./utils/output-sink";
import { abbreviateUrl, getDomain, getErrorText, normalizeWhitespace } from "./utils/render-helpers";

export const FirecrawlSearchParamsSchema = Type.Object({
  query: Type.String({ description: "Search query" }),
  limit: Type.Optional(Type.Integer({ description: "Max results (1-100). Default: 10", minimum: 1, maximum: 100 })),
  sources: Type.Optional(Type.Array(StringEnum(["web", "images", "news"] as const), { description: "Sources to search. Default: web" })),
  categories: Type.Optional(Type.Array(StringEnum(["github", "research", "pdf"] as const), { description: "Filter by GitHub / research papers / PDFs" })),
  country: Type.Optional(Type.String({ description: "ISO country code for geo-targeting (e.g. US, DE)" })),
  tbs: Type.Optional(Type.String({ description: "Time filter: qdr:h (hour), qdr:d (day), qdr:w (week), qdr:m (month), qdr:y (year)" })),
  location: Type.Optional(Type.String({ description: "Geo-targeting location (e.g. 'Berlin,Germany')" })),
  includeDomains: Type.Optional(Type.Array(Type.String(), { description: "Restrict results to these domains (hostnames)" })),
  excludeDomains: Type.Optional(Type.Array(Type.String(), { description: "Exclude results from these domains (hostnames)" })),
});

export type FirecrawlSearchInput = Static<typeof FirecrawlSearchParamsSchema>;

const firecrawlSearchTool = defineTool({
  name: "firecrawl_search",
  label: "Firecrawl Search",
  description: [
    "Search the web via Firecrawl (keyless — no API key, no signup).",
    "Supports sources (web/images/news) and categories (github/research/pdf) that",
    "SearXNG does not. Use as an escape hatch or when web_search returns nothing.",
    "Privacy: the query is sent to Firecrawl's cloud.",
    `Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}; if truncated, full output is saved to a temp file.`,
  ].join(" "),
  promptSnippet: "Search the web via Firecrawl keyless (categories, sources, domain filters)",
  promptGuidelines: [
    "Prefer web_search first; reach for firecrawl_search when web_search fails or returns nothing.",
    "Use categories=[\"github\"], [\"research\"], or [\"pdf\"] for source-type-specific discovery.",
    "Use includeDomains/excludeDomains to scope results to specific sites.",
  ],
  parameters: FirecrawlSearchParamsSchema,

  async execute(_toolCallId, params, signal) {
    const query = buildSearchQuery(params.query, params.includeDomains, params.excludeDomains);
    const out = await searchKeyless(query, {
      limit: params.limit,
      sources: params.sources,
      categories: params.categories,
      country: params.country,
      tbs: params.tbs,
      location: params.location,
    }, signal);

    if (!out.ok) {
      const reason = out.failure?.reason ?? "unknown error";
      throw new Error(`Firecrawl search failed (${out.failure?.kind}): ${reason}`);
    }

    const lines: string[] = [`Results for "${params.query}" (via Firecrawl keyless${out.creditsUsed !== undefined ? `, ${out.creditsUsed} credits` : ""}):`, ""];
    for (let i = 0; i < out.results.length; i++) {
      const r = out.results[i];
      lines.push(`${i + 1}. ${r.title ?? "(untitled)"}`);
      lines.push(`   URL: ${r.url}`);
      if (r.description) lines.push(`   ${r.description.replace(/\s+/g, " ").trim()}`);
      if (r.category) lines.push(`   [category: ${r.category}]`);
      lines.push("");
    }

    const rawText = lines.join("\n");
    const sink = await writeWithFallback(rawText, { tmpPrefix: "pi-firecrawl-search-", alwaysWriteFile: true });

    return {
      content: [{ type: "text", text: sink.text }],
      details: {
        query: params.query,
        totalResults: out.results.length,
        results: out.results,
        creditsUsed: out.creditsUsed,
        fullOutputPath: sink.fullOutputPath,
        viaFirecrawl: true,
      },
    };
  },

  renderCall(args, theme) {
    let text = theme.fg("toolTitle", theme.bold("firecrawl_search "));
    text += theme.fg("muted", args.query);
    if (args.categories) text += theme.fg("dim", ` [${args.categories.join(",")}]`);
    return new Text(text, 0, 0);
  },

  renderResult(result, { expanded, isPartial }, theme, context) {
    const isError = context?.isError ?? false;

    if (isPartial) {
      const query = (result.details as any)?.query as string | undefined;
      const label = query ? `Searching "${query}" via Firecrawl...` : "Searching via Firecrawl...";
      return new Text(theme.fg("warning", label), 0, 0);
    }

    const details = result.details as {
      query?: string;
      totalResults?: number;
      results?: Array<{ title?: string; url?: string; description?: string; category?: string }>;
      creditsUsed?: number;
      fullOutputPath?: string;
    } | undefined;

    if (isError) {
      const errText = getErrorText(result);
      let text = theme.fg("error", "✗ Firecrawl search failed");
      if (details?.query) text += `  ${theme.fg("dim", details.query)}`;
      text += `\n\n  ${theme.fg("toolOutput", errText)}`;
      return new Text(text, 0, 0);
    }

    const showing = details?.results?.length ?? 0;
    let text = theme.fg("success", `✓ ${showing} results`);
    text += theme.fg("accent", " [Firecrawl keyless]");
    if (details?.creditsUsed !== undefined) {
      text += theme.fg("muted", ` ${details.creditsUsed} credits`);
    }

    const top = (details?.results ?? []).slice(0, expanded ? 10 : 3);
    for (let i = 0; i < top.length; i++) {
      const r = top[i];
      const domain = r.url ? theme.fg("dim", `  ${getDomain(r.url)}`) : "";
      text += `\n  [${i + 1}] ${theme.fg("toolTitle", r.title ?? "(untitled)")}${domain}`;
      if (r.description) {
        const snippet = normalizeWhitespace(r.description);
        const short = snippet.length > 90 ? snippet.slice(0, 90).replace(/\s+\S*$/, "") + "..." : snippet;
        text += `\n    ${theme.fg("muted", short)}`;
      }
    }
    if (showing > top.length) {
      text += `\n  ${theme.fg("muted", `... and ${showing - top.length} more${expanded ? "" : " (Ctrl+O for full list)"}`)}`;
    }

    if (expanded && details?.fullOutputPath) {
      text += `\n${theme.fg("accent", `Full output: ${details.fullOutputPath}`)}`;
    }

    return new Text(text, 0, 0);
  },
});

export default function (pi: ExtensionAPI) {
  pi.registerTool(firecrawlSearchTool);
}
