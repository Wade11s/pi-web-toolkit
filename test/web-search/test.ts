/**
 * web_search local-first fallback behavior tests.
 *
 * These tests exercise the SearXNG-first search flow through a pure seam so
 * missing optional Firecrawl runners cannot masquerade as the primary backend.
 */

import assert from "node:assert/strict";
import { runWebSearchCore } from "../../extensions/utils/web-search-core";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

async function testLocalResultsDoNotAttemptFirecrawl(): Promise<void> {
  let firecrawlCalls = 0;
  const out = await runWebSearchCore({ query: "pi", results: 3 }, {
    searxngUrl: "https://searxng.example",
    fetchImpl: async () => jsonResponse({
      query: "pi",
      results: [{ title: "Pi", url: "https://example.com/pi", content: "Local result" }],
    }),
    firecrawlSearch: async () => {
      firecrawlCalls += 1;
      return { ok: true, results: [{ title: "Cloud", url: "https://firecrawl.example" }] };
    },
    signal: new AbortController().signal,
  });

  assert.equal(out.viaFirecrawl, false);
  assert.equal(out.results.length, 1);
  assert.equal(out.results[0].url, "https://example.com/pi");
  assert.equal(firecrawlCalls, 0);
}

async function testMissingFirecrawlDoesNotBecomePrimaryWebSearchError(): Promise<void> {
  let message = "";
  try {
    await runWebSearchCore({ query: "pi", results: 3 }, {
      searxngUrl: "https://searxng.example",
      fetchImpl: async () => { throw new Error("synthetic SearXNG outage"); },
      firecrawlSearch: async () => ({
        ok: false,
        results: [],
        failure: { kind: "graceful-skip", reason: "firecrawl is not installed" },
      }),
      signal: new AbortController().signal,
    });
  } catch (err: any) {
    message = err?.message ?? String(err);
  }

  assert.match(message, /Failed to query SearXNG at https:\/\/searxng\.example/);
  assert.match(message, /synthetic SearXNG outage/);
  assert.doesNotMatch(message, /firecrawl is not installed/i);
}

async function testZeroLocalResultsAndMissingFirecrawlReturnsEmptyLocalResult(): Promise<void> {
  const out = await runWebSearchCore({ query: "nothing", results: 3 }, {
    searxngUrl: "https://searxng.example",
    fetchImpl: async () => jsonResponse({ query: "nothing", results: [], suggestions: ["something"] }),
    firecrawlSearch: async () => ({
      ok: false,
      results: [],
      failure: { kind: "graceful-skip", reason: "firecrawl is not installed" },
    }),
    signal: new AbortController().signal,
  });

  assert.equal(out.viaFirecrawl, false);
  assert.deepEqual(out.results, []);
  assert.deepEqual(out.suggestions, ["something"]);
}

async function main(): Promise<void> {
  await testLocalResultsDoNotAttemptFirecrawl();
  await testMissingFirecrawlDoesNotBecomePrimaryWebSearchError();
  await testZeroLocalResultsAndMissingFirecrawlReturnsEmptyLocalResult();
  console.log("web_search fallback behavior tests passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
