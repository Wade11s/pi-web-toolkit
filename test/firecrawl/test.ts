/**
 * Firecrawl Keyless behavior tests.
 *
 * These tests exercise the same Firecrawl Keyless seam used by tools. They use
 * a fake runner adapter to avoid network/CLI calls while keeping parser,
 * failure classification, fallback decisions, and interact cleanup behind the
 * module interface.
 */

import assert from "node:assert/strict";
import {
  createFirecrawlKeyless,
  type FirecrawlKeylessRunRequest,
  type FirecrawlKeylessRunner,
  type FirecrawlRunnerResult,
} from "../../extensions/utils/firecrawl";

type Handler = (request: FirecrawlKeylessRunRequest, index: number) => Promise<FirecrawlRunnerResult> | FirecrawlRunnerResult;

function jsonStdout(value: unknown): FirecrawlRunnerResult {
  return { stdout: JSON.stringify(value), stderr: "", exitCode: 0 };
}

function fakeRunner(handler: Handler): { runner: FirecrawlKeylessRunner; requests: FirecrawlKeylessRunRequest[] } {
  const requests: FirecrawlKeylessRunRequest[] = [];
  return {
    requests,
    runner: {
      async run(request) {
        requests.push(request);
        return handler(request, requests.length - 1);
      },
    },
  };
}

async function testSearchThroughKeylessSeam(): Promise<void> {
  const { runner, requests } = fakeRunner((request) => {
    assert.equal(request.type, "search");
    if (request.type !== "search") throw new Error("expected search request");
    assert.equal(request.query, "web scraping (site:firecrawl.dev)");
    assert.equal(request.options.limit, 5);
    return jsonStdout({
      success: true,
      data: {
        web: [
          { title: "Firecrawl", url: "https://firecrawl.dev", description: "Web data API" },
        ],
      },
      id: "search-1",
      creditsUsed: 2,
    });
  });

  const client = createFirecrawlKeyless({ runner, isEnabled: () => true });
  const out = await client.search("web scraping", { limit: 5, includeDomains: ["firecrawl.dev"] });

  assert.equal(out.ok, true);
  assert.equal(out.results.length, 1);
  assert.equal(out.results[0].title, "Firecrawl");
  assert.equal(out.results[0].url, "https://firecrawl.dev");
  assert.equal(out.creditsUsed, 2);
  assert.equal(out.searchId, "search-1");
  assert.deepEqual(requests.map((r) => r.type), ["search"]);
}

async function testScrapeThroughKeylessSeam(): Promise<void> {
  const { runner } = fakeRunner((request) => {
    assert.equal(request.type, "scrape");
    if (request.type !== "scrape") throw new Error("expected scrape request");
    assert.equal(request.url, "https://example.com");
    assert.equal(request.options.onlyMainContent, false);
    return jsonStdout({
      markdown: "# Hello",
      metadata: { scrapeId: "scrape-1", title: "Hello", sourceURL: "https://example.com" },
    });
  });

  const client = createFirecrawlKeyless({ runner, isEnabled: () => true });
  const out = await client.scrape("https://example.com", { onlyMainContent: false });

  assert.equal(out.ok, true);
  assert.equal(out.content, "# Hello");
  assert.equal(out.scrapeId, "scrape-1");
  assert.equal(out.title, "Hello");
  assert.equal(out.bytes, "# Hello".length);
}

async function testGracefulSkipFailures(): Promise<void> {
  const disabledRunner = fakeRunner(() => {
    throw new Error("runner should not be called when disabled");
  });
  const disabled = createFirecrawlKeyless({ runner: disabledRunner.runner, isEnabled: () => false });
  const disabledOut = await disabled.scrape("https://example.com", {});
  assert.equal(disabledOut.ok, false);
  assert.equal(disabledOut.failure?.kind, "graceful-skip");
  assert.equal(disabledRunner.requests.length, 0);

  const cases: Array<{ name: string; result: Handler }> = [
    {
      name: "missing CLI",
      result: () => { throw new Error("firecrawl is not installed"); },
    },
    {
      name: "suspicious IP",
      result: () => ({ stdout: "", stderr: "your IP address looks suspicious", exitCode: 403 }),
    },
    {
      name: "rate limit",
      result: () => ({ stdout: "", stderr: "Rate limit exceeded", exitCode: 429 }),
    },
  ];

  for (const c of cases) {
    const { runner } = fakeRunner(c.result);
    const client = createFirecrawlKeyless({ runner, isEnabled: () => true });
    const out = await client.scrape(`https://example.com/${c.name}`, {});
    assert.equal(out.ok, false, c.name);
    assert.equal(out.failure?.kind, "graceful-skip", c.name);
  }
}

function testFallbackDecisionsThroughKeylessSeam(): void {
  const client = createFirecrawlKeyless({
    runner: fakeRunner(() => jsonStdout({ data: { web: [] } })).runner,
    isEnabled: () => true,
  });

  assert.equal(client.shouldFallbackSearch(true, 0), true);
  assert.equal(client.shouldFallbackSearch(true, 5), false);
  assert.equal(client.shouldFallbackSearch(false, 0), true);

  assert.equal(client.shouldFallbackBrowse(new Error("agent-browser is not installed")), true);
  assert.equal(client.shouldFallbackBrowse(new Error("Browser action failed: click — timeout")), true);
  assert.equal(client.shouldFallbackBrowse(new Error('Action "click" requires non-empty selector')), false);
  assert.equal(client.shouldFallbackBrowse(new Error('Action "wait" requires non-negative integer ms')), false);
  assert.equal(client.shouldFallbackBrowse(new Error("Unsupported browser action: foo")), false);
}

async function testInteractThroughKeylessSeam(): Promise<void> {
  const { runner, requests } = fakeRunner((request) => {
    if (request.type === "scrape") {
      return jsonStdout({ markdown: "# Page", metadata: { scrapeId: "scrape-ok" } });
    }
    if (request.type === "interact") {
      assert.equal(request.scrapeId, "scrape-ok");
      assert.equal(request.options.prompt, "Click pricing");
      return jsonStdout({ success: true, output: "The price is $20.", liveViewUrl: "https://live.example", creditsUsed: 3 });
    }
    if (request.type === "stopInteract") {
      assert.equal(request.scrapeId, "scrape-ok");
      return jsonStdout({ success: true });
    }
    throw new Error(`unexpected request ${request.type}`);
  });

  const client = createFirecrawlKeyless({ runner, isEnabled: () => true });
  const out = await client.interact("https://example.com", { prompt: "Click pricing" });

  assert.equal(out.ok, true);
  assert.equal(out.output, "The price is $20.");
  assert.equal(out.liveViewUrl, "https://live.example");
  assert.equal(out.creditsUsed, 3);
  assert.equal(out.scrapeId, "scrape-ok");
  assert.deepEqual(requests.map((r) => r.type), ["scrape", "interact", "stopInteract"]);
}

async function testInteractStopsSessionAfterFailure(): Promise<void> {
  const { runner, requests } = fakeRunner((request) => {
    if (request.type === "scrape") {
      return jsonStdout({ markdown: "# Page", metadata: { scrapeId: "scrape-fail" } });
    }
    if (request.type === "interact") {
      return { stdout: "", stderr: "interaction failed", exitCode: 500 };
    }
    if (request.type === "stopInteract") {
      assert.equal(request.scrapeId, "scrape-fail");
      return jsonStdout({ success: true });
    }
    throw new Error(`unexpected request ${request.type}`);
  });

  const client = createFirecrawlKeyless({ runner, isEnabled: () => true });
  const out = await client.interact("https://example.com", { prompt: "Click pricing" });

  assert.equal(out.ok, false);
  assert.equal(out.failure?.kind, "hard-error");
  assert.deepEqual(requests.map((r) => r.type), ["scrape", "interact", "stopInteract"]);
}

async function testInteractStopsSessionAfterAbort(): Promise<void> {
  const controller = new AbortController();
  const { runner, requests } = fakeRunner((request) => {
    if (request.type === "scrape") {
      return jsonStdout({ markdown: "# Page", metadata: { scrapeId: "scrape-abort" } });
    }
    if (request.type === "interact") {
      controller.abort();
      throw new Error("Operation aborted");
    }
    if (request.type === "stopInteract") {
      assert.equal(request.scrapeId, "scrape-abort");
      assert.equal(request.signal, undefined, "stop must ignore the user abort signal");
      return jsonStdout({ success: true });
    }
    throw new Error(`unexpected request ${request.type}`);
  });

  const client = createFirecrawlKeyless({ runner, isEnabled: () => true });
  const out = await client.interact("https://example.com", { prompt: "Click pricing" }, controller.signal);

  assert.equal(out.ok, false);
  assert.deepEqual(requests.map((r) => r.type), ["scrape", "interact", "stopInteract"]);
}

async function main(): Promise<void> {
  await testSearchThroughKeylessSeam();
  await testScrapeThroughKeylessSeam();
  await testGracefulSkipFailures();
  testFallbackDecisionsThroughKeylessSeam();
  await testInteractThroughKeylessSeam();
  await testInteractStopsSessionAfterFailure();
  await testInteractStopsSessionAfterAbort();
  console.log("firecrawl keyless seam tests passed");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
