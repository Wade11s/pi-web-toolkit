/**
 * web_search execution core
 *
 * Keeps SearXNG-first search behavior behind a testable boundary. Firecrawl
 * remains fallback-only and missing fallback runners never replace the primary
 * SearXNG failure/no-result UX.
 */

import type { FirecrawlKeyless, FirecrawlSearchOutput } from "./firecrawl";

export interface WebSearchCoreInput {
  query: string;
  language?: string;
  results?: number;
}

export interface WebSearchResultItem {
  title: string;
  url: string;
  content?: string;
  engine?: string;
  score?: number;
}

interface SearxResponse {
  query: string;
  results: WebSearchResultItem[];
  suggestions?: string[];
}

export interface WebSearchCoreResult {
  query: string;
  totalResults: number;
  results: WebSearchResultItem[];
  suggestions?: string[];
  viaFirecrawl: boolean;
  creditsUsed?: number;
}

export interface WebSearchCoreDeps {
  searxngUrl: string;
  fetchImpl: typeof fetch;
  firecrawl: Pick<FirecrawlKeyless, "search" | "shouldFallbackSearch">;
  signal?: AbortSignal;
}

function normalizeSearxngUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export async function runWebSearchCore(
  input: WebSearchCoreInput,
  deps: WebSearchCoreDeps,
): Promise<WebSearchCoreResult> {
  const searxngUrl = normalizeSearxngUrl(deps.searxngUrl);
  const maxResults = Math.floor(Math.min(60, Math.max(1, input.results ?? 20)));
  const language = input.language ?? "";

  const allResults: WebSearchResultItem[] = [];
  const seenUrls = new Set<string>();
  let suggestions: string[] | undefined;
  let finalQuery = input.query;
  const MAX_PAGES = 3;

  let localOk = true;
  let localError: string | undefined;

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const searchParams = new URLSearchParams({
        q: input.query,
        format: "json",
        pageno: String(page),
      });
      if (language) searchParams.set("language", language);

      const response = await deps.fetchImpl(`${searxngUrl}/search?${searchParams.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: deps.signal,
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
  } catch (err: any) {
    localOk = false;
    localError = err.message ?? String(err);
  }

  if (deps.firecrawl.shouldFallbackSearch(localOk, allResults.length)) {
    const fb = await deps.firecrawl.search(input.query, { limit: Math.min(maxResults, 10) }, deps.signal);
    if (fb.ok && fb.results.length > 0) {
      const fbResults: WebSearchResultItem[] = fb.results.slice(0, maxResults).map((r) => ({
        title: r.title ?? "(untitled)",
        url: r.url,
        content: r.description,
        engine: "firecrawl",
      }));
      return {
        query: input.query,
        totalResults: fbResults.length,
        results: fbResults,
        viaFirecrawl: true,
        creditsUsed: fb.creditsUsed,
      };
    }
  }

  if (!localOk) {
    throw new Error(`Failed to query SearXNG at ${searxngUrl}: ${localError}`);
  }

  return {
    query: finalQuery,
    totalResults: allResults.length,
    results: allResults.slice(0, maxResults),
    suggestions,
    viaFirecrawl: false,
  };
}
