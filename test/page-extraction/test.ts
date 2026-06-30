/**
 * Page extraction module tests.
 *
 * These exercise the public page-extraction interface with a fake Scrapling
 * executable, avoiding network access while preserving the CLI seam used by
 * the real tools.
 */

import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  extractedPageFromContent,
  extractPage,
  writePageExtractionOutput,
} from "../../extensions/utils/page-extraction";

const OLD_ENV = { ...process.env };

function restoreEnv(): void {
  process.env = { ...OLD_ENV };
}

function installFakeScrapling(): { logFile: string } {
  const dir = mkdtempSync(join(tmpdir(), "pi-page-extraction-test-"));
  const command = join(dir, "fake-scrapling.js");
  const logFile = join(dir, "calls.jsonl");
  writeFileSync(command, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.SCRAPLING_LOG, JSON.stringify(args) + "\\n");
const url = args[2];
const outFile = args[3];
if (url.includes("fail")) {
  console.error("scrapling exploded for " + url);
  process.exit(23);
}
fs.mkdirSync(require("node:path").dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, "# Example Title\\n\\nReadable body for " + url + "\\n", "utf8");
process.exit(0);
`);
  chmodSync(command, 0o755);
  process.env.SCRAPLING_BIN = command;
  process.env.SCRAPLING_LOG = logFile;
  process.env.PI_WEB_TOOLKIT_CONFIG = join(dir, "missing-config-not-used.json");
  return { logFile };
}

function readCalls(logFile: string): string[][] {
  return readFileSync(logFile, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as string[]);
}

async function testSuccessfulLocalExtraction(): Promise<void> {
  restoreEnv();
  const { logFile } = installFakeScrapling();

  const result = await extractPage("https://example.com/article", {
    selector: "main",
    stealthy: true,
    noGetFallback: true,
    previewChars: 80,
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.error);
  assert.equal(result.url, "https://example.com/article");
  assert.equal(result.content, "# Example Title\n\nReadable body for https://example.com/article\n");
  assert.equal(result.bytes, Buffer.byteLength(result.content));
  assert.ok(result.preview.length > 0, "preview should be generated from page content");

  const calls = readCalls(logFile);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(0, 5), [
    "extract",
    "stealthy-fetch",
    "https://example.com/article",
    calls[0][3],
    "--ai-targeted",
  ]);
  assert.deepEqual(calls[0].slice(5), ["--css-selector", "main"]);
  assert.equal(existsSync(calls[0][3]), false, "temporary page file should be cleaned up");
  assert.equal(existsSync(dirname(calls[0][3])), false, "temporary page directory should be cleaned up");
}

async function testLocalExtractionFailure(): Promise<void> {
  restoreEnv();
  installFakeScrapling();

  const result = await extractPage("https://example.com/fail", {
    noGetFallback: true,
  });

  assert.equal(result.ok, false);
  if (result.ok) throw new Error("expected local extraction to fail");
  assert.equal(result.url, "https://example.com/fail");
  assert.match(result.error, /scrapling exploded/);
}

async function testOutputFallback(): Promise<void> {
  restoreEnv();
  const rawText = Array.from({ length: 25 }, (_, i) => `line ${i + 1}`).join("\n");

  const sink = await writePageExtractionOutput(rawText, {
    tmpPrefix: "pi-page-extraction-output-",
    maxLines: 5,
  });

  assert.match(sink.text, /\[Output truncated:/);
  assert.ok(sink.fullOutputPath, "truncated output should have a full-output file");
  assert.equal(readFileSync(sink.fullOutputPath, "utf8"), rawText);
}

function testExtractedPageFromContent(): void {
  const page = extractedPageFromContent("https://example.com/cloud", "# Cloud\n\nFallback content", {
    bytes: 1234,
    previewChars: 50,
  });

  assert.equal(page.ok, true);
  assert.equal(page.bytes, 1234);
  assert.ok(page.preview.length > 0, "preview should be generated for provided content");
}

async function main(): Promise<void> {
  try {
    await testSuccessfulLocalExtraction();
    await testLocalExtractionFailure();
    await testOutputFallback();
    testExtractedPageFromContent();
  } finally {
    restoreEnv();
  }

  console.log("page extraction tests passed");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
