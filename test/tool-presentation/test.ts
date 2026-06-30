/**
 * Tool presentation structure tests.
 *
 * The toolkit should not advertise an unused shallow presentation factory.
 * Current tools own their concrete renderCall/renderResult behavior, while
 * shared low-level formatting stays in render-helpers.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function source(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

function assertDoesNotMention(haystack: string, needle: string, label: string): void {
  assert.ok(!haystack.includes(needle), `${label} should not mention ${needle}`);
}

const toolFiles = [
  "extensions/web_search.ts",
  "extensions/web_fetch.ts",
  "extensions/web_browse.ts",
  "extensions/web_batch_fetch.ts",
  "extensions/firecrawl_search.ts",
  "extensions/firecrawl_scrape.ts",
  "extensions/firecrawl_interact.ts",
];

assert.equal(
  existsSync(new URL("../../extensions/utils/tool-factory.ts", import.meta.url)),
  false,
  "unused shallow tool-factory presentation helper should be deleted",
);

assertDoesNotMention(source("README.md"), "tool-factory.ts", "README structure docs");
assertDoesNotMention(source("AGENTS.md"), "tool-factory.ts", "agent structure docs");

for (const file of toolFiles) {
  const text = source(file);
  assert.match(text, /renderCall\(/, `${file} should keep explicit renderCall presentation`);
  assert.match(text, /renderResult\(/, `${file} should keep explicit renderResult presentation`);
  assertDoesNotMention(text, "tool-factory", file);
}

console.log("tool presentation structure tests passed");
