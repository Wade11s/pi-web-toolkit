/**
 * Firecrawl CLI wrapper regression tests.
 *
 * These tests avoid the network and the firecrawl CLI itself. They lock down
 * the pure boundary functions: argument builders, output parsers, failure
 * classification, keyless-eligibility, and fallback decisions.
 */

import assert from "node:assert/strict";
import {
  buildScrapeArgs,
  parseScrapeOutput,
  classifyFirecrawlFailure,
  isFirecrawlEnabled,
  buildSearchArgs,
  buildSearchQuery,
  parseSearchOutput,
  shouldFallbackSearch,
  buildInteractArgs,
  buildInteractStopArgs,
  parseInteractOutput,
  shouldFallbackBrowse,
  type FirecrawlScrapeOptions,
} from "../../extensions/utils/firecrawl";

// --- scrape argument builder -------------------------------------------

function testScrapeArgsBasic(): void {
  const args = buildScrapeArgs("https://example.com", {});
  assert.deepEqual(args, [
    "scrape",
    "https://example.com",
    "--format",
    "markdown",
    "--json",
    "--only-main-content",
  ]);
}

function testScrapeArgsOpts(): void {
  const args = buildScrapeArgs("https://example.com", {
    waitFor: 3000,
    includeTags: ["article", "main"],
    excludeTags: ["nav"],
    onlyMainContent: false,
  });
  assert.deepEqual(args, [
    "scrape",
    "https://example.com",
    "--format",
    "markdown",
    "--json",
    "--wait-for",
    "3000",
    "--include-tags",
    "article,main",
    "--exclude-tags",
    "nav",
  ]);
}

testScrapeArgsBasic();
testScrapeArgsOpts();

// --- scrape output parser ---------------------------------------------

function testParseScrapeJson(): void {
  const stdout = JSON.stringify({
    markdown: "# Hello",
    metadata: { scrapeId: "abc-123", title: "Hello", sourceURL: "https://example.com" },
  });
  const out = parseScrapeOutput(stdout, "https://example.com");
  assert.equal(out.ok, true);
  assert.equal(out.content, "# Hello");
  assert.equal(out.scrapeId, "abc-123");
  assert.equal(out.title, "Hello");
  assert.equal(out.url, "https://example.com");
  assert.equal(out.bytes, "# Hello".length);
}

function testParseScrapeRawMarkdown(): void {
  // If the CLI ever emits raw markdown instead of JSON, treat it as content.
  const stdout = "# Just markdown\n\nNo JSON here.";
  const out = parseScrapeOutput(stdout, "https://example.com");
  assert.equal(out.ok, true);
  assert.equal(out.content, stdout);
  assert.equal(out.scrapeId, undefined);
}

function testParseScrapeEmpty(): void {
  const out = parseScrapeOutput("", "https://example.com");
  assert.equal(out.ok, false);
  assert.equal(out.failure?.kind, "hard-error");
}

testParseScrapeJson();
testParseScrapeRawMarkdown();
testParseScrapeEmpty();

// --- failure classification -------------------------------------------

function testClassifyIpSuspicious(): void {
  const f = classifyFirecrawlFailure(
    "your IP address looks suspicious, so Firecrawl can't be used without an API key",
    403,
  );
  assert.equal(f.kind, "graceful-skip");
}

function testClassifyRateLimit(): void {
  const f = classifyFirecrawlFailure("Rate limit exceeded", 429);
  assert.equal(f.kind, "graceful-skip");
}

function testClassifyNotInstalled(): void {
  const f = classifyFirecrawlFailure("firecrawl is not installed");
  assert.equal(f.kind, "graceful-skip");
}

function testClassifyHardError(): void {
  const f = classifyFirecrawlFailure("Something went wrong on our end", 500);
  assert.equal(f.kind, "hard-error");
}

testClassifyIpSuspicious();
testClassifyRateLimit();
testClassifyNotInstalled();
testClassifyHardError();

// --- keyless-eligibility (opt-out toggle) ----------------------------

function testFirecrawlEnabledByDefault(): void {
  const prev = process.env.PI_WEB_FIRECRAWL_FALLBACK;
  delete process.env.PI_WEB_FIRECRAWL_FALLBACK;
  assert.equal(isFirecrawlEnabled(), true);
  process.env.PI_WEB_FIRECRAWL_FALLBACK = prev;
}

function testFirecrawlOptOut(): void {
  const prev = process.env.PI_WEB_FIRECRAWL_FALLBACK;
  for (const v of ["0", "false", "no", "off"]) {
    process.env.PI_WEB_FIRECRAWL_FALLBACK = v;
    assert.equal(isFirecrawlEnabled(), false, `opt-out value ${v} should disable`);
  }
  process.env.PI_WEB_FIRECRAWL_FALLBACK = prev;
}

testFirecrawlEnabledByDefault();
testFirecrawlOptOut();

// --- search argument builder ------------------------------------------

function testSearchArgsBasic(): void {
  const args = buildSearchArgs("firecrawl keyless", {});
  assert.deepEqual(args, ["search", "firecrawl keyless", "--json"]);
}

function testSearchArgsOpts(): void {
  const args = buildSearchArgs("rust async", {
    limit: 5,
    sources: ["web", "news"],
    categories: ["github", "research"],
    country: "DE",
    tbs: "qdr:w",
  });
  assert.ok(args.includes("--limit"));
  assert.equal(args[args.indexOf("--limit") + 1], "5");
  assert.ok(args.includes("--sources"));
  assert.equal(args[args.indexOf("--sources") + 1], "web,news");
  assert.ok(args.includes("--categories"));
  assert.equal(args[args.indexOf("--categories") + 1], "github,research");
  assert.equal(args[args.indexOf("--country") + 1], "DE");
  assert.equal(args[args.indexOf("--tbs") + 1], "qdr:w");
}

// --- search query synthesis (domain filters) -------------------------

function testSearchQueryIncludeDomains(): void {
  const q = buildSearchQuery("web scraping", ["firecrawl.dev"], undefined);
  assert.equal(q, 'web scraping (site:firecrawl.dev)');
}

function testSearchQueryExcludeDomains(): void {
  const q = buildSearchQuery("web scraping", undefined, ["example.com"]);
  assert.equal(q, "web scraping -site:example.com");
}

function testSearchQueryNoDomains(): void {
  assert.equal(buildSearchQuery("plain", undefined, undefined), "plain");
}

// --- search output parser ---------------------------------------------

function testParseSearchEnvelope(): void {
  const stdout = JSON.stringify({
    success: true,
    data: {
      web: [
        { title: "Firecrawl", url: "https://firecrawl.dev", description: "Web data API" },
      ],
    },
    id: "search-1",
    creditsUsed: 2,
  });
  const out = parseSearchOutput(stdout);
  assert.equal(out.ok, true);
  assert.equal(out.results.length, 1);
  assert.equal(out.results[0].title, "Firecrawl");
  assert.equal(out.results[0].url, "https://firecrawl.dev");
  assert.equal(out.creditsUsed, 2);
  assert.equal(out.searchId, "search-1");
}

function testParseSearchEmpty(): void {
  const stdout = JSON.stringify({ success: true, data: { web: [] }, id: "search-2" });
  const out = parseSearchOutput(stdout);
  assert.equal(out.ok, true);
  assert.equal(out.results.length, 0);
}

function testParseSearchHardError(): void {
  const out = parseSearchOutput("");
  assert.equal(out.ok, false);
  assert.equal(out.failure?.kind, "hard-error");
}

// --- web_search fallback decision ------------------------------------

function testShouldFallbackOnError(): void {
  assert.equal(shouldFallbackSearch(true, 0), true); // no error but zero results
}

function testShouldNotFallbackOnResults(): void {
  assert.equal(shouldFallbackSearch(true, 5), false);
}

function testShouldFallbackOnLocalError(): void {
  assert.equal(shouldFallbackSearch(false, 0), true);
}

testSearchArgsBasic();
testSearchArgsOpts();
testSearchQueryIncludeDomains();
testSearchQueryExcludeDomains();
testSearchQueryNoDomains();
testParseSearchEnvelope();
testParseSearchEmpty();
testParseSearchHardError();
testShouldFallbackOnError();
testShouldNotFallbackOnResults();
testShouldFallbackOnLocalError();

// --- interact argument builder ---------------------------------------

function testInteractArgsPrompt(): void {
  const args = buildInteractArgs("scrape-1", { prompt: "Click the pricing tab" });
  assert.deepEqual(args, ["interact", "-p", "Click the pricing tab", "-s", "scrape-1", "--json"]);
}

function testInteractArgsCode(): void {
  const args = buildInteractArgs("scrape-2", { code: "await page.title()", language: "python" });
  assert.deepEqual(args, ["interact", "-c", "await page.title()", "-s", "scrape-2", "--python", "--json"]);
}

function testInteractStopArgs(): void {
  assert.deepEqual(buildInteractStopArgs("scrape-1"), ["interact", "stop", "scrape-1", "--json"]);
}

// --- interact output parser ------------------------------------------

function testParseInteractOutput(): void {
  const stdout = JSON.stringify({
    success: true,
    output: "The price is $20.",
    liveViewUrl: "https://liveview.firecrawl.dev/x",
  });
  const out = parseInteractOutput(stdout);
  assert.equal(out.ok, true);
  assert.equal(out.output, "The price is $20.");
  assert.equal(out.liveViewUrl, "https://liveview.firecrawl.dev/x");
}

function testParseInteractCodeResult(): void {
  const stdout = JSON.stringify({ success: true, stdout: "page text" });
  const out = parseInteractOutput(stdout);
  assert.equal(out.ok, true);
  assert.equal(out.output, "page text");
}

function testParseInteractHardError(): void {
  const out = parseInteractOutput("");
  assert.equal(out.ok, false);
  assert.equal(out.failure?.kind, "hard-error");
}

// --- web_browse fallback decision ------------------------------------

function testShouldFallbackBrowseRuntime(): void {
  assert.equal(shouldFallbackBrowse(new Error("agent-browser is not installed")), true);
  assert.equal(shouldFallbackBrowse(new Error("Browser action failed: click — timeout")), true);
}

function testShouldNotFallbackBrowseValidation(): void {
  assert.equal(shouldFallbackBrowse(new Error('Action "click" requires non-empty selector')), false);
  assert.equal(shouldFallbackBrowse(new Error('Action "wait" requires non-negative integer ms')), false);
  assert.equal(shouldFallbackBrowse(new Error("Unsupported browser action: foo")), false);
}

testInteractArgsPrompt();
testInteractArgsCode();
testInteractStopArgs();
testParseInteractOutput();
testParseInteractCodeResult();
testParseInteractHardError();
testShouldFallbackBrowseRuntime();
testShouldNotFallbackBrowseValidation();

console.log("firecrawl wrapper tests passed");
