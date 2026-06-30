/**
 * Toolkit config behavior tests.
 *
 * These tests exercise the public runtime helpers the tools use to resolve
 * endpoints, external CLI command paths, and optional cloud fallback policy.
 */

import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getFirecrawlRunner,
  getSearxngUrl,
  getToolkitCommand,
  isFirecrawlFallbackEnabled,
} from "../../extensions/utils/config";

const OLD_ENV = { ...process.env };

function restoreEnv(): void {
  process.env = { ...OLD_ENV };
}

function tempConfig(contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), "pi-web-toolkit-config-test-"));
  const file = join(dir, "config.json");
  writeFileSync(file, contents);
  return file;
}

function testDefaultSearxngUrl(): void {
  restoreEnv();
  delete process.env.SEARXNG_URL;
  delete process.env.PI_WEB_TOOLKIT_CONFIG;
  process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), "pi-web-toolkit-empty-config-"));
  assert.equal(getSearxngUrl(), "http://localhost:8080");
}

function testSearxngEnvOverridesToolkitConfig(): void {
  restoreEnv();
  process.env.PI_WEB_TOOLKIT_CONFIG = tempConfig(JSON.stringify({ searxngUrl: "https://config.example/" }));
  process.env.SEARXNG_URL = "https://env.example/";
  assert.equal(getSearxngUrl(), "https://env.example");
}

function testSearxngToolkitConfigOverridesDefault(): void {
  restoreEnv();
  delete process.env.SEARXNG_URL;
  process.env.PI_WEB_TOOLKIT_CONFIG = tempConfig(JSON.stringify({ searxngUrl: "https://config.example/" }));
  assert.equal(getSearxngUrl(), "https://config.example");
}

function testMalformedToolkitConfigFailsClearly(): void {
  restoreEnv();
  process.env.PI_WEB_TOOLKIT_CONFIG = tempConfig("{ nope");
  assert.throws(
    () => getSearxngUrl(),
    /Invalid toolkit config.*config\.json/,
  );
}

function testExplicitMissingToolkitConfigFailsClearly(): void {
  restoreEnv();
  process.env.PI_WEB_TOOLKIT_CONFIG = join(mkdtempSync(join(tmpdir(), "pi-web-toolkit-missing-config-")), "missing.json");
  assert.throws(
    () => getSearxngUrl(),
    /Toolkit config file not found.*missing\.json/,
  );
}

function testInvalidToolkitConfigShapeFailsClearly(): void {
  restoreEnv();
  process.env.PI_WEB_TOOLKIT_CONFIG = tempConfig(JSON.stringify({ searxngUrl: 42 }));
  assert.throws(
    () => getSearxngUrl(),
    /Invalid toolkit config.*searxngUrl must be a string/,
  );
}

function testCommandResolutionPrecedence(): void {
  restoreEnv();
  process.env.PI_WEB_TOOLKIT_CONFIG = tempConfig(JSON.stringify({
    commands: { scrapling: "/config/scrapling" },
  }));
  assert.equal(getToolkitCommand("scrapling"), "/config/scrapling");
  process.env.SCRAPLING_BIN = "/env/scrapling";
  assert.equal(getToolkitCommand("scrapling"), "/env/scrapling");
  delete process.env.SCRAPLING_BIN;
  assert.equal(getToolkitCommand("agentBrowser"), "agent-browser");
}

function testFirecrawlFallbackPrecedence(): void {
  restoreEnv();
  process.env.PI_WEB_TOOLKIT_CONFIG = tempConfig(JSON.stringify({ firecrawlFallback: false }));
  delete process.env.PI_WEB_FIRECRAWL_FALLBACK;
  assert.equal(isFirecrawlFallbackEnabled(), false);
  process.env.PI_WEB_FIRECRAWL_FALLBACK = "1";
  assert.equal(isFirecrawlFallbackEnabled(), true);
  process.env.PI_WEB_FIRECRAWL_FALLBACK = "off";
  assert.equal(isFirecrawlFallbackEnabled(), false);
}

function testFirecrawlRunnerPrecedence(): void {
  restoreEnv();
  process.env.PI_WEB_TOOLKIT_CONFIG = tempConfig(JSON.stringify({ firecrawlRunner: "npx" }));
  delete process.env.PI_WEB_FIRECRAWL_RUNNER;
  assert.equal(getFirecrawlRunner(), "npx");
  process.env.PI_WEB_FIRECRAWL_RUNNER = "bunx";
  assert.equal(getFirecrawlRunner(), "bunx");
  delete process.env.PI_WEB_FIRECRAWL_RUNNER;
  process.env.PI_WEB_TOOLKIT_CONFIG = tempConfig(JSON.stringify({}));
  assert.equal(getFirecrawlRunner(), "installed");
}

function testInvalidFirecrawlRunnerFailsClearly(): void {
  restoreEnv();
  process.env.PI_WEB_TOOLKIT_CONFIG = tempConfig(JSON.stringify({ firecrawlRunner: "curl" }));
  assert.throws(
    () => getFirecrawlRunner(),
    /Invalid toolkit config.*firecrawlRunner must be one of: installed, npx, bunx/,
  );
  process.env.PI_WEB_TOOLKIT_CONFIG = tempConfig(JSON.stringify({}));
  process.env.PI_WEB_FIRECRAWL_RUNNER = "curl";
  assert.throws(
    () => getFirecrawlRunner(),
    /PI_WEB_FIRECRAWL_RUNNER must be one of: installed, npx, bunx/,
  );
}

testDefaultSearxngUrl();
testSearxngEnvOverridesToolkitConfig();
testSearxngToolkitConfigOverridesDefault();
testMalformedToolkitConfigFailsClearly();
testExplicitMissingToolkitConfigFailsClearly();
testInvalidToolkitConfigShapeFailsClearly();
testCommandResolutionPrecedence();
testFirecrawlFallbackPrecedence();
testFirecrawlRunnerPrecedence();
testInvalidFirecrawlRunnerFailsClearly();
restoreEnv();

console.log("toolkit config tests passed");
