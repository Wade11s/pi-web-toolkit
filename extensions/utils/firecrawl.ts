/**
 * Firecrawl CLI wrapper
 *
 * Drives the `firecrawl-cli` npm package (an official Firecrawl client) in
 * KEYLESS-ONLY mode: the cloud only grants the free keyless tier when a
 * request comes from an official client with NO Authorization header, so we
 * shell out to the CLI rather than hand-rolling REST, and we isolate the
 * child process under a temporary HOME with no key env so stored credentials
 * / API keys can never be picked up.
 *
 * This module is split so that the decision-rich, deterministic logic lives
 * in pure, network-free functions (argument builders, output parsers, failure
 * classification, keyless-eligibility, fallback decisions) which are unit
 * tested at this boundary — mirroring the agent-browser wrapper. The
 * side-effectful CLI spawning is a thin layer on top.
 */

import { mkdtemp, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { runCLI } from "./cli-runner";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** Why a Firecrawl attempt did not yield a result. */
export type FirecrawlFailureKind = "graceful-skip" | "hard-error";

/**
 * Whether the Firecrawl keyless fallback is enabled. Defaults on; disabled
 * when `PI_WEB_FIRECRAWL_FALLBACK` is a falsy value (0/false/no/off). This is
 * the single opt-out for a strict local-only / no-cloud-egress policy.
 */
export function isFirecrawlEnabled(): boolean {
  const v = (process.env.PI_WEB_FIRECRAWL_FALLBACK ?? "").trim().toLowerCase();
  return !(v === "0" || v === "false" || v === "no" || v === "off");
}

export interface FirecrawlFailure {
  kind: FirecrawlFailureKind;
  /** Human-readable reason. */
  reason: string;
  /** Raw error text, when available. */
  raw?: string;
}

// ---------------------------------------------------------------------------
// Scrape
// ---------------------------------------------------------------------------

export interface FirecrawlScrapeOptions {
  /** HTML tags to include (Firecrawl tag filter, not a CSS selector). */
  includeTags?: string[];
  /** HTML tags to exclude. */
  excludeTags?: string[];
  /** Wait (ms) before scraping, for JS-rendered content. */
  waitFor?: number;
  /** Extract only main content (drop nav/footer/etc). Default true. */
  onlyMainContent?: boolean;
}

export interface FirecrawlScrapeOutput {
  ok: boolean;
  /** Clean markdown content. */
  content: string;
  url: string;
  title?: string;
  scrapeId?: string;
  bytes: number;
  /** Reported when the source provides it; scrape responses usually do not. */
  creditsUsed?: number;
  failure?: FirecrawlFailure;
}

/**
 * Build the `firecrawl scrape` argument list for a single URL.
 * Output is always forced to JSON (`--json`) so the full data object —
 * including metadata.scrapeId needed for interact — is parseable.
 */
export function buildScrapeArgs(url: string, options: FirecrawlScrapeOptions): string[] {
  const args = ["scrape", url, "--format", "markdown", "--json"];
  if (options.onlyMainContent !== false) args.push("--only-main-content");
  if (options.waitFor !== undefined) args.push("--wait-for", String(options.waitFor));
  if (options.includeTags && options.includeTags.length > 0) {
    args.push("--include-tags", options.includeTags.join(","));
  }
  if (options.excludeTags && options.excludeTags.length > 0) {
    args.push("--exclude-tags", options.excludeTags.join(","));
  }
  return args;
}

/**
 * Classify a Firecrawl failure as either a clean, non-fatal skip (fall
 * through to the original local-tool error) or a hard error worth surfacing.
 *
 * Graceful-skip covers the known keyless reality: the CLI is absent, the IP
 * is flagged as suspicious, or the keyless quota is exhausted. These must
 * never make the user worse off than the local tool already did.
 */
export function classifyFirecrawlFailure(errorText: string, exitCode?: number): FirecrawlFailure {
  const text = (errorText ?? "").toLowerCase();
  const isGraceful =
    text.includes("is not installed") ||
    text.includes("ip address looks suspicious") ||
    text.includes("looks suspicious") ||
    text.includes("rate limit") ||
    text.includes("too many requests") ||
    exitCode === 429;
  if (isGraceful) {
    return { kind: "graceful-skip", reason: errorText.trim() || "firecrawl unavailable", raw: errorText };
  }
  return { kind: "hard-error", reason: errorText.trim() || "firecrawl request failed", raw: errorText };
}

/**
 * Parse the stdout of `firecrawl scrape --json` into a normalized result.
 *
 * The CLI prints the scrape `data` object as JSON (which includes `markdown`
 * and `metadata.scrapeId`). If parsing fails, fall back to treating stdout as
 * raw markdown so we still return something useful. Empty output is a hard
 * error.
 */
export function parseScrapeOutput(stdout: string, url: string): FirecrawlScrapeOutput {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return { ok: false, content: "", url, bytes: 0, failure: { kind: "hard-error", reason: "Empty output from firecrawl scrape" } };
  }

  try {
    const data = JSON.parse(trimmed) as Record<string, unknown>;
    const markdown = typeof data.markdown === "string" ? data.markdown : "";
    const metadata = (data.metadata ?? {}) as Record<string, unknown>;
    if (!markdown) {
      return { ok: false, content: "", url, bytes: 0, failure: { kind: "hard-error", reason: "firecrawl scrape returned no markdown" } };
    }
    return {
      ok: true,
      content: markdown,
      url,
      title: typeof metadata.title === "string" ? metadata.title : undefined,
      scrapeId: typeof metadata.scrapeId === "string" ? metadata.scrapeId : undefined,
      bytes: markdown.length,
    };
  } catch {
    // Not JSON — assume raw markdown.
    return { ok: true, content: trimmed, url, bytes: trimmed.length };
  }
}

// ---------------------------------------------------------------------------
// Side-effectful CLI runner (keyless-only) — not unit tested
// ---------------------------------------------------------------------------

export interface FirecrawlCliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run the firecrawl CLI under an isolated temporary HOME with no key env, so
 * it can only ever operate in keyless mode (no stored credentials, no
 * FIRECRAWL_API_KEY). The temp HOME is cleaned up after the process exits.
 */
export async function runFirecrawlCli(
  args: string[],
  signal?: AbortSignal,
  timeout?: number,
): Promise<FirecrawlCliResult> {
  const home = await mkdtemp(path.join(os.tmpdir(), "pi-firecrawl-"));
  try {
    const env: NodeJS.ProcessEnv = { ...process.env };
    // Force keyless: strip any credential the CLI would otherwise honor.
    delete env.FIRECRAWL_API_KEY;
    delete env.FIRECRAWL_API_URL;
    delete env.FIRECRAWL_OAUTH_TOKEN;
    env.HOME = home;
    env.XDG_CONFIG_HOME = path.join(home, ".config");
    return await runCLI({ command: "firecrawl", args, env, signal, timeout });
  } finally {
    await rm(home, { recursive: true, force: true }).catch(() => { /* best-effort */ });
  }
}

function disabledFailure(reason = "Firecrawl fallback disabled"): FirecrawlFailure {
  return { kind: "graceful-skip", reason };
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface FirecrawlSearchOptions {
  limit?: number;
  sources?: Array<"web" | "images" | "news">;
  categories?: Array<"github" | "research" | "pdf">;
  country?: string;
  tbs?: string;
  location?: string;
}

export interface FirecrawlSearchResultItem {
  title?: string;
  url: string;
  description?: string;
  category?: string;
  markdown?: string;
}

export interface FirecrawlSearchOutput {
  ok: boolean;
  results: FirecrawlSearchResultItem[];
  creditsUsed?: number;
  searchId?: string;
  warning?: string;
  failure?: FirecrawlFailure;
}

/**
 * Fold domain filters into a search query using search operators, since the
 * firecrawl search CLI does not expose include/exclude domain flags directly.
 * Mirrors how the official MCP server builds the query.
 */
export function buildSearchQuery(
  query: string,
  includeDomains?: string[],
  excludeDomains?: string[],
): string {
  if (includeDomains && includeDomains.length > 0) {
    const clause = includeDomains.map((d) => `site:${d}`).join(" OR ");
    return `${query} (${clause})`;
  }
  if (excludeDomains && excludeDomains.length > 0) {
    return `${query} ${excludeDomains.map((d) => `-site:${d}`).join(" ")}`;
  }
  return query;
}

/**
 * Build the `firecrawl search` argument list. Output is always JSON so the
 * full response envelope (results, id, creditsUsed) is preserved.
 */
export function buildSearchArgs(query: string, options: FirecrawlSearchOptions): string[] {
  const args = ["search", query, "--json"];
  if (options.limit !== undefined) args.push("--limit", String(options.limit));
  if (options.sources && options.sources.length > 0) args.push("--sources", options.sources.join(","));
  if (options.categories && options.categories.length > 0) args.push("--categories", options.categories.join(","));
  if (options.country) args.push("--country", options.country);
  if (options.tbs) args.push("--tbs", options.tbs);
  if (options.location) args.push("--location", options.location);
  return args;
}

/** Parse the stdout of `firecrawl search --json` (the response envelope). */
export function parseSearchOutput(stdout: string): FirecrawlSearchOutput {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return { ok: false, results: [], failure: { kind: "hard-error", reason: "Empty output from firecrawl search" } };
  }
  try {
    const env = JSON.parse(trimmed) as Record<string, unknown>;
    const data = (env.data ?? {}) as Record<string, unknown>;
    const web = Array.isArray(data.web) ? (data.web as Array<Record<string, unknown>>) : [];
    const results: FirecrawlSearchResultItem[] = web.map((r) => ({
      title: typeof r.title === "string" ? r.title : undefined,
      url: typeof r.url === "string" ? r.url : "",
      description: typeof r.description === "string" ? r.description : undefined,
      category: typeof r.category === "string" ? r.category : undefined,
      markdown: typeof r.markdown === "string" ? r.markdown : undefined,
    })).filter((r) => r.url);
    return {
      ok: true,
      results,
      creditsUsed: typeof env.creditsUsed === "number" ? env.creditsUsed : undefined,
      searchId: typeof env.id === "string" ? env.id : undefined,
      warning: typeof env.warning === "string" ? env.warning : undefined,
    };
  } catch {
    return { ok: false, results: [], failure: { kind: "hard-error", reason: "Unparseable firecrawl search output" } };
  }
}

/**
 * Whether web_search should fall back to Firecrawl: when the local search
 * errored OR returned zero results. A non-empty result set must not fall back.
 */
export function shouldFallbackSearch(localOk: boolean, resultCount: number): boolean {
  return !localOk || resultCount === 0;
}

/**
 * Search via the firecrawl CLI in keyless mode. Never throws.

/**
 * Scrape a single URL via the firecrawl CLI in keyless mode. Never throws —
 * returns a normalized output whose `failure` field distinguishes graceful
 * skips (CLI absent / IP flagged / rate-limited / disabled) from hard errors.
 */
export async function scrapeKeyless(
  url: string,
  options: FirecrawlScrapeOptions,
  signal?: AbortSignal,
): Promise<FirecrawlScrapeOutput> {
  if (!isFirecrawlEnabled()) {
    return { ok: false, content: "", url, bytes: 0, failure: disabledFailure() };
  }
  let result: FirecrawlCliResult;
  try {
    result = await runFirecrawlCli(buildScrapeArgs(url, options), signal, 90_000);
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    return { ok: false, content: "", url, bytes: 0, failure: classifyFirecrawlFailure(msg) };
  }
  if (result.exitCode !== 0) {
    const failure = classifyFirecrawlFailure(result.stderr || result.stdout, result.exitCode);
    return { ok: false, content: "", url, bytes: 0, failure };
  }
  return parseScrapeOutput(result.stdout, url);
}

/**
 * Search via the firecrawl CLI in keyless mode. Never throws.
 */
export async function searchKeyless(
  query: string,
  options: FirecrawlSearchOptions,
  signal?: AbortSignal,
): Promise<FirecrawlSearchOutput> {
  if (!isFirecrawlEnabled()) {
    return { ok: false, results: [], failure: disabledFailure() };
  }
  let result: FirecrawlCliResult;
  try {
    result = await runFirecrawlCli(buildSearchArgs(query, options), signal, 90_000);
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    return { ok: false, results: [], failure: classifyFirecrawlFailure(msg) };
  }
  if (result.exitCode !== 0) {
    const failure = classifyFirecrawlFailure(result.stderr || result.stdout, result.exitCode);
    return { ok: false, results: [], failure };
  }
  return parseSearchOutput(result.stdout);
}

// ---------------------------------------------------------------------------
// Interact
// ---------------------------------------------------------------------------

export interface FirecrawlInteractOptions {
  /** Natural-language task. Required unless `code` is set. */
  prompt?: string;
  /** Code to execute in the browser sandbox. Required unless `prompt` is set. */
  code?: string;
  /** Code language; only used with `code`. */
  language?: "node" | "python" | "bash";
  /** Timeout in seconds (1-300). */
  timeout?: number;
}

export interface FirecrawlInteractOutput {
  ok: boolean;
  /** The agent's answer (prompt) or code result/stdout. */
  output: string;
  url: string;
  scrapeId?: string;
  liveViewUrl?: string;
  creditsUsed?: number;
  failure?: FirecrawlFailure;
}

/** Build `firecrawl interact` args bound to a scrapeId. */
export function buildInteractArgs(scrapeId: string, options: FirecrawlInteractOptions): string[] {
  const args = ["interact"];
  if (options.prompt !== undefined) args.push("-p", options.prompt);
  if (options.code !== undefined) args.push("-c", options.code);
  args.push("-s", scrapeId);
  if (options.language === "python") args.push("--python");
  else if (options.language === "bash") args.push("--bash");
  if (options.timeout !== undefined) args.push("--timeout", String(options.timeout));
  args.push("--json");
  return args;
}

/** Build `firecrawl interact stop` args for a scrapeId. */
export function buildInteractStopArgs(scrapeId: string): string[] {
  return ["interact", "stop", scrapeId, "--json"];
}

/** Parse the stdout of `firecrawl interact --json` (the full response). */
export function parseInteractOutput(stdout: string): FirecrawlInteractOutput {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return { ok: false, output: "", url: "", failure: { kind: "hard-error", reason: "Empty output from firecrawl interact" } };
  }
  try {
    const data = JSON.parse(trimmed) as Record<string, unknown>;
    if (data.success === false) {
      const reason = typeof data.error === "string" ? data.error : "firecrawl interact failed";
      return { ok: false, output: "", url: "", failure: { kind: "hard-error", reason } };
    }
    const output =
      (typeof data.output === "string" && data.output) ||
      (typeof data.result === "string" && data.result) ||
      (typeof data.stdout === "string" && data.stdout) ||
      "";
    return {
      ok: true,
      output,
      url: "",
      liveViewUrl: typeof data.liveViewUrl === "string" ? data.liveViewUrl : undefined,
      creditsUsed: typeof data.creditsUsed === "number" ? data.creditsUsed : undefined,
    };
  } catch {
    return { ok: false, output: "", url: "", failure: { kind: "hard-error", reason: "Unparseable firecrawl interact output" } };
  }
}

/**
 * Whether web_browse should fall back to Firecrawl interact. Runtime failures
 * (CLI missing, batch execution failure) fall back; purely local validation
 * errors (malformed caller-provided actions) do not — they would just fail
 * again.
 */
export function shouldFallbackBrowse(error: Error): boolean {
  const msg = (error.message ?? "").toLowerCase();
  // Purely local validation errors (malformed caller-provided actions) must not
  // fall back — they would just fail again on the cloud too.
  if (
    msg.includes("requires non-empty") ||
    msg.includes("requires non-negative") ||
    msg.includes("unsupported browser action")
  ) {
    return false;
  }
  return true;
}

/**
 * Drive a page via Firecrawl interact in keyless mode: scrape to start a
 * session, run one interact call (prompt or code), and ALWAYS stop the session
 * (even on error/abort) so no billable session is left open. Never throws.
 */
export async function interactKeyless(
  url: string,
  options: FirecrawlInteractOptions,
  signal?: AbortSignal,
): Promise<FirecrawlInteractOutput> {
  if (!isFirecrawlEnabled()) {
    return { ok: false, output: "", url, failure: disabledFailure() };
  }

  // 1. Scrape to obtain a scrapeId that an interact session binds to.
  const scrape = await scrapeKeyless(url, {}, signal);
  if (!scrape.ok || !scrape.scrapeId) {
    return {
      ok: false,
      output: "",
      url,
      failure: scrape.failure ?? { kind: "hard-error", reason: "firecrawl scrape returned no scrapeId" },
    };
  }
  const scrapeId = scrape.scrapeId;

  // 2. Interact, then always stop (best-effort, independent of the user signal).
  try {
    let result: FirecrawlCliResult;
    try {
      result = await runFirecrawlCli(buildInteractArgs(scrapeId, options), signal, 120_000);
    } catch (err: any) {
      return { ok: false, output: "", url, scrapeId, failure: classifyFirecrawlFailure(err?.message ?? String(err)) };
    }
    if (result.exitCode !== 0) {
      const failure = classifyFirecrawlFailure(result.stderr || result.stdout, result.exitCode);
      return { ok: false, output: "", url, scrapeId, failure };
    }
    const parsed = parseInteractOutput(result.stdout);
    return { ...parsed, url, scrapeId };
  } finally {
    await runFirecrawlCli(buildInteractStopArgs(scrapeId), undefined, 30_000).catch(() => { /* best-effort */ });
  }
}
