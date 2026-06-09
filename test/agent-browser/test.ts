/**
 * agent-browser wrapper regression tests.
 *
 * These tests avoid launching the browser. They lock down parser compatibility
 * for agent-browser batch JSON output shapes seen across pi/CLI versions.
 */

import assert from "node:assert/strict";
import { parseAgentBrowserBatchOutput } from "../../extensions/utils/agent-browser";

const batchItem = {
  command: ["get", "title", "--json"],
  error: null,
  result: { title: "Example Domain" },
  success: true,
};

function testArrayOutput(): void {
  const parsed = parseAgentBrowserBatchOutput(JSON.stringify([batchItem]));
  assert.equal(parsed.length, 1);
  assert.deepEqual(parsed[0].command, ["get", "title", "--json"]);
}

function testWrappedResultsOutput(): void {
  const parsed = parseAgentBrowserBatchOutput(JSON.stringify({ results: [batchItem] }));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].success, true);
}

function testSingleItemOutput(): void {
  const parsed = parseAgentBrowserBatchOutput(JSON.stringify(batchItem));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].result?.title, "Example Domain");
}

function testInvalidOutput(): void {
  assert.throws(
    () => parseAgentBrowserBatchOutput(JSON.stringify({ ok: true })),
    /Expected JSON array of batch results/,
  );
}

testArrayOutput();
testWrappedResultsOutput();
testSingleItemOutput();
testInvalidOutput();

console.log("agent-browser parser tests passed");
