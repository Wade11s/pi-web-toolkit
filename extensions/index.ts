/**
 * pi-web-tools — Unified entry point
 *
 * Registers all web research tools as a single extension:
 *   - web_search: Search via SearXNG
 *   - web_fetch: Fetch a single page with scrapling
 *   - web_browse: Interactive browser automation via agent-browser
 *   - web_batch_fetch: Concurrent multi-page fetching
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import registerWebSearch from "./web_search";
import registerWebFetch from "./web_fetch";
import registerWebBrowse from "./web_browse";
import registerWebBatchFetch from "./web_batch_fetch";
import registerFirecrawlScrape from "./firecrawl_scrape";
import registerFirecrawlSearch from "./firecrawl_search";
import registerFirecrawlInteract from "./firecrawl_interact";

const WEB_TOOL_ROUTING_POLICY = [
  "Web tools are local-first: web_search=discover, web_fetch=one static URL, web_batch_fetch=2–5 static URLs, web_browse=interaction.",
  "Use firecrawl_* only after the matching local tool failed in this conversation, or when the user explicitly asks for Firecrawl/cloud.",
  "web_search/web_fetch/web_browse already auto-fallback to Firecrawl; pass full URLs with scheme and selectors when useful.",
].join("\n");

const WEB_TOOL_NAMES = new Set([
  "web_search",
  "web_fetch",
  "web_browse",
  "web_batch_fetch",
  "firecrawl_search",
  "firecrawl_scrape",
  "firecrawl_interact",
]);

function shouldInjectWebToolRoutingPolicy(selectedTools: readonly string[] | undefined): boolean {
  return selectedTools?.some((tool) => WEB_TOOL_NAMES.has(tool)) ?? false;
}

export default function (pi: ExtensionAPI) {
  registerWebSearch(pi);
  registerWebFetch(pi);
  registerWebBrowse(pi);
  registerWebBatchFetch(pi);
  registerFirecrawlScrape(pi);
  registerFirecrawlSearch(pi);
  registerFirecrawlInteract(pi);

  pi.on("before_agent_start", (event) => {
    if (!shouldInjectWebToolRoutingPolicy(event.systemPromptOptions.selectedTools)) return;
    return { systemPrompt: `${event.systemPrompt}\n\n${WEB_TOOL_ROUTING_POLICY}` };
  });
}
