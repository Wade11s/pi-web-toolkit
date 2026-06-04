/**
 * pi-web-tools — Unified entry point
 *
 * Registers all web research tools as a single extension:
 *   - web_search: Search via SearXNG
 *   - web_fetch: Fetch static pages with scrapling
 *   - web_browse: Interactive browser automation via agent-browser
 *   - web_batch_fetch: Concurrent multi-page fetching
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import registerWebSearch from "./web_search";
import registerWebFetch from "./web_fetch";
import registerWebBrowse from "./web_browse";
import registerWebBatchFetch from "./web_batch_fetch";

export default function (pi: ExtensionAPI) {
  registerWebSearch(pi);
  registerWebFetch(pi);
  registerWebBrowse(pi);
  registerWebBatchFetch(pi);
}
