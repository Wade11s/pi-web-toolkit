/**
 * Tool-routing prompt regression tests.
 *
 * These tests do not try to make LLM tool choice deterministic. They lock down
 * the prompt contract that keeps local tools primary and Firecrawl cloud tools
 * fallback-only unless the user explicitly asks for Firecrawl/cloud behavior.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

const webFetch = source("extensions/web_fetch.ts");
const webSearch = source("extensions/web_search.ts");
const webBrowse = source("extensions/web_browse.ts");
const firecrawlScrape = source("extensions/firecrawl_scrape.ts");
const firecrawlSearch = source("extensions/firecrawl_search.ts");
const firecrawlInteract = source("extensions/firecrawl_interact.ts");
const extensionEntry = source("extensions/index.ts");

function assertContains(haystack: string, needle: string, label: string): void {
  assert.ok(
    haystack.includes(needle),
    `${label} should contain routing guidance: ${JSON.stringify(needle)}`,
  );
}

function assertFallbackOnlyFirecrawlTool(sourceText: string, toolName: string, primaryTool: string): void {
  assertContains(
    sourceText,
    `Use ${toolName} only after ${primaryTool} fails`,
    toolName,
  );
  assert.match(
    sourceText,
    /fallback-only/i,
    `${toolName} prompt metadata should say it is fallback-only`,
  );
}

assertContains(
  webFetch,
  "Use web_fetch for one non-interactive URL",
  "web_fetch",
);

assertContains(
  webSearch,
  "Use web_search for current/external facts",
  "web_search",
);
assertContains(
  webBrowse,
  "Use web_browse only when clicks/forms/scroll/wait",
  "web_browse",
);

assertFallbackOnlyFirecrawlTool(firecrawlScrape, "firecrawl_scrape", "web_fetch");
assertFallbackOnlyFirecrawlTool(firecrawlSearch, "firecrawl_search", "web_search");
assertContains(
  firecrawlSearch,
  "Firecrawl search failed",
  "firecrawl_search",
);
assertFallbackOnlyFirecrawlTool(firecrawlInteract, "firecrawl_interact", "web_browse");

assertContains(
  extensionEntry,
  "Web tools are local-first",
  "extension entry",
);
assertContains(
  extensionEntry,
  "Use firecrawl_* only after the matching local tool failed",
  "extension entry",
);
assertContains(
  extensionEntry,
  "web_search/web_fetch/web_browse already auto-fallback",
  "extension entry",
);

console.log("tool-routing prompt tests passed");
