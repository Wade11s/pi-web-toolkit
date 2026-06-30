/**
 * Firecrawl Keyless module
 *
 * Drives the official `firecrawl-cli` in KEYLESS-ONLY mode for cloud fallback
 * and explicit Firecrawl tools. The public seam is intentionally narrow:
 * search, scrape, interact, and fallback decisions. CLI argument construction,
 * output parsing, failure classification, keyless environment isolation, and
 * interact session cleanup stay inside this module.
 */

import { mkdtemp, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { runCLI } from "./cli-runner";
import { getFirecrawlRunner, getToolkitCommand, isFirecrawlFallbackEnabled, type FirecrawlRunner } from "./config";

// ---------------------------------------------------------------------------
// Public seam
// ---------------------------------------------------------------------------

/** Why a Firecrawl attempt did not yield a result. */
export type FirecrawlFailureKind = "graceful-skip" | "hard-error";

export interface FirecrawlFailure {
  kind: FirecrawlFailureKind;
  /** Human-readable reason. */
  reason: string;
  /** Raw error text, when available. */
  raw?: string;
}

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

export interface FirecrawlSearchOptions {
  limit?: number;
  sources?: Array<"web" | "images" | "news">;
  categories?: Array<"github" | "research" | "pdf">;
  country?: string;
  tbs?: string;
  location?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
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

export interface FirecrawlKeyless {
  /** Whether Firecrawl fallback is currently enabled. */
  isEnabled(): boolean;
  /** Scrape one URL via Firecrawl Keyless. Never throws. */
  scrape(url: string, options: FirecrawlScrapeOptions, signal?: AbortSignal): Promise<FirecrawlScrapeOutput>;
  /** Search via Firecrawl Keyless. Never throws. */
  search(query: string, options: FirecrawlSearchOptions, signal?: AbortSignal): Promise<FirecrawlSearchOutput>;
  /** Scrape, interact, and always stop the interact session best-effort. Never throws. */
  interact(url: string, options: FirecrawlInteractOptions, signal?: AbortSignal): Promise<FirecrawlInteractOutput>;
  /** Whether local search should attempt Firecrawl fallback. */
  shouldFallbackSearch(localOk: boolean, resultCount: number): boolean;
  /** Whether local browser automation should attempt Firecrawl fallback. */
  shouldFallbackBrowse(error: Error): boolean;
}

// ---------------------------------------------------------------------------
// Test/adapter seam
// ---------------------------------------------------------------------------

export interface FirecrawlRunnerResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface FirecrawlBaseRunRequest {
  timeoutMs: number;
  signal?: AbortSignal;
}

export interface FirecrawlScrapeRunRequest extends FirecrawlBaseRunRequest {
  type: "scrape";
  url: string;
  options: FirecrawlScrapeOptions;
}

export interface FirecrawlSearchRunRequest extends FirecrawlBaseRunRequest {
  type: "search";
  query: string;
  options: FirecrawlSearchOptions;
}

export interface FirecrawlInteractRunRequest extends FirecrawlBaseRunRequest {
  type: "interact";
  scrapeId: string;
  options: FirecrawlInteractOptions;
}

export interface FirecrawlStopInteractRunRequest extends FirecrawlBaseRunRequest {
  type: "stopInteract";
  scrapeId: string;
}

export type FirecrawlKeylessRunRequest =
  | FirecrawlScrapeRunRequest
  | FirecrawlSearchRunRequest
  | FirecrawlInteractRunRequest
  | FirecrawlStopInteractRunRequest;

export interface FirecrawlKeylessRunner {
  run(request: FirecrawlKeylessRunRequest): Promise<FirecrawlRunnerResult>;
}

export interface FirecrawlKeylessDeps {
  runner?: FirecrawlKeylessRunner;
  isEnabled?: () => boolean;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

class FirecrawlKeylessClient implements FirecrawlKeyless {
  constructor(
    private readonly runner: FirecrawlKeylessRunner,
    private readonly enabled: () => boolean,
  ) {}

  isEnabled(): boolean {
    return this.enabled();
  }

  private enabledState(): { enabled: true } | { enabled: false; failure: FirecrawlFailure } {
    try {
      if (this.enabled()) return { enabled: true };
      return { enabled: false, failure: disabledFailure() };
    } catch (err: unknown) {
      const reason = errorText(err);
      return { enabled: false, failure: { kind: "hard-error", reason, raw: reason } };
    }
  }

  shouldFallbackSearch(localOk: boolean, resultCount: number): boolean {
    return !localOk || resultCount === 0;
  }

  shouldFallbackBrowse(error: Error): boolean {
    const msg = (error.message ?? "").toLowerCase();
    // Purely local validation errors (malformed caller-provided actions) must
    // not fall back — they would just fail again on the cloud too.
    if (
      msg.includes("requires non-empty") ||
      msg.includes("requires non-negative") ||
      msg.includes("unsupported browser action")
    ) {
      return false;
    }
    return true;
  }

  async scrape(
    url: string,
    options: FirecrawlScrapeOptions,
    signal?: AbortSignal,
  ): Promise<FirecrawlScrapeOutput> {
    const enabled = this.enabledState();
    if (!enabled.enabled) {
      return { ok: false, content: "", url, bytes: 0, failure: enabled.failure };
    }

    let result: FirecrawlRunnerResult;
    try {
      result = await this.runner.run({ type: "scrape", url, options, signal, timeoutMs: 90_000 });
    } catch (err: unknown) {
      return { ok: false, content: "", url, bytes: 0, failure: classifyFirecrawlFailure(errorText(err)) };
    }

    if (result.exitCode !== 0) {
      return { ok: false, content: "", url, bytes: 0, failure: classifyFirecrawlFailure(result.stderr || result.stdout, result.exitCode) };
    }

    return parseScrapeOutput(result.stdout, url);
  }

  async search(
    query: string,
    options: FirecrawlSearchOptions,
    signal?: AbortSignal,
  ): Promise<FirecrawlSearchOutput> {
    const enabled = this.enabledState();
    if (!enabled.enabled) {
      return { ok: false, results: [], failure: enabled.failure };
    }

    const effectiveQuery = buildSearchQuery(query, options.includeDomains, options.excludeDomains);

    let result: FirecrawlRunnerResult;
    try {
      result = await this.runner.run({ type: "search", query: effectiveQuery, options, signal, timeoutMs: 90_000 });
    } catch (err: unknown) {
      return { ok: false, results: [], failure: classifyFirecrawlFailure(errorText(err)) };
    }

    if (result.exitCode !== 0) {
      return { ok: false, results: [], failure: classifyFirecrawlFailure(result.stderr || result.stdout, result.exitCode) };
    }

    return parseSearchOutput(result.stdout);
  }

  async interact(
    url: string,
    options: FirecrawlInteractOptions,
    signal?: AbortSignal,
  ): Promise<FirecrawlInteractOutput> {
    const enabled = this.enabledState();
    if (!enabled.enabled) {
      return { ok: false, output: "", url, failure: enabled.failure };
    }

    const scrape = await this.scrape(url, {}, signal);
    if (!scrape.ok || !scrape.scrapeId) {
      return {
        ok: false,
        output: "",
        url,
        failure: scrape.failure ?? { kind: "hard-error", reason: "firecrawl scrape returned no scrapeId" },
      };
    }

    const scrapeId = scrape.scrapeId;

    try {
      let result: FirecrawlRunnerResult;
      try {
        result = await this.runner.run({ type: "interact", scrapeId, options, signal, timeoutMs: 120_000 });
      } catch (err: unknown) {
        return { ok: false, output: "", url, scrapeId, failure: classifyFirecrawlFailure(errorText(err)) };
      }

      if (result.exitCode !== 0) {
        return { ok: false, output: "", url, scrapeId, failure: classifyFirecrawlFailure(result.stderr || result.stdout, result.exitCode) };
      }

      const parsed = parseInteractOutput(result.stdout);
      return { ...parsed, url, scrapeId };
    } finally {
      await this.runner.run({ type: "stopInteract", scrapeId, timeoutMs: 30_000 }).catch(() => { /* best-effort */ });
    }
  }
}

export function createFirecrawlKeyless(deps: FirecrawlKeylessDeps = {}): FirecrawlKeyless {
  return new FirecrawlKeylessClient(
    deps.runner ?? new FirecrawlCliRunner(),
    deps.isEnabled ?? isFirecrawlFallbackEnabled,
  );
}

// ---------------------------------------------------------------------------
// CLI runner adapter (keyless-only)
// ---------------------------------------------------------------------------

interface FirecrawlCliInvocation {
  command: string;
  args: string[];
}

class FirecrawlCliRunner implements FirecrawlKeylessRunner {
  async run(request: FirecrawlKeylessRunRequest): Promise<FirecrawlRunnerResult> {
    return runFirecrawlCli(buildCliArgs(request), request.signal, request.timeoutMs);
  }
}

export const firecrawlKeyless = createFirecrawlKeyless();

function buildCliArgs(request: FirecrawlKeylessRunRequest): string[] {
  switch (request.type) {
    case "scrape":
      return buildScrapeArgs(request.url, request.options);
    case "search":
      return buildSearchArgs(request.query, request.options);
    case "interact":
      return buildInteractArgs(request.scrapeId, request.options);
    case "stopInteract":
      return buildInteractStopArgs(request.scrapeId);
  }
}

function buildFirecrawlCliInvocation(
  args: string[],
  runner: FirecrawlRunner = getFirecrawlRunner(),
): FirecrawlCliInvocation {
  if (runner === "npx") {
    return { command: "npx", args: ["-y", "firecrawl-cli", ...args] };
  }
  if (runner === "bunx") {
    return { command: "bunx", args: ["firecrawl-cli", ...args] };
  }
  return { command: getToolkitCommand("firecrawl"), args };
}

/**
 * Run the Firecrawl CLI under an isolated temporary HOME with no key env, so
 * it can only ever operate in keyless mode: no stored credentials and no
 * FIRECRAWL_API_KEY are available to the child process.
 */
async function runFirecrawlCli(
  args: string[],
  signal?: AbortSignal,
  timeout?: number,
): Promise<FirecrawlRunnerResult> {
  const home = await mkdtemp(path.join(os.tmpdir(), "pi-firecrawl-"));
  try {
    const env: NodeJS.ProcessEnv = { ...process.env };
    delete env.FIRECRAWL_API_KEY;
    delete env.FIRECRAWL_API_URL;
    delete env.FIRECRAWL_OAUTH_TOKEN;
    env.HOME = home;
    env.XDG_CONFIG_HOME = path.join(home, ".config");
    const invocation = buildFirecrawlCliInvocation(args);
    return await runCLI({ command: invocation.command, args: invocation.args, env, signal, timeout });
  } finally {
    await rm(home, { recursive: true, force: true }).catch(() => { /* best-effort */ });
  }
}

// ---------------------------------------------------------------------------
// Internal argument builders
// ---------------------------------------------------------------------------

function buildScrapeArgs(url: string, options: FirecrawlScrapeOptions): string[] {
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

function buildSearchQuery(
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

function buildSearchArgs(query: string, options: FirecrawlSearchOptions): string[] {
  const args = ["search", query, "--json"];
  if (options.limit !== undefined) args.push("--limit", String(options.limit));
  if (options.sources && options.sources.length > 0) args.push("--sources", options.sources.join(","));
  if (options.categories && options.categories.length > 0) args.push("--categories", options.categories.join(","));
  if (options.country) args.push("--country", options.country);
  if (options.tbs) args.push("--tbs", options.tbs);
  if (options.location) args.push("--location", options.location);
  return args;
}

function buildInteractArgs(scrapeId: string, options: FirecrawlInteractOptions): string[] {
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

function buildInteractStopArgs(scrapeId: string): string[] {
  return ["interact", "stop", scrapeId, "--json"];
}

// ---------------------------------------------------------------------------
// Internal parsing and failure handling
// ---------------------------------------------------------------------------

function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function disabledFailure(reason = "Firecrawl fallback disabled"): FirecrawlFailure {
  return { kind: "graceful-skip", reason };
}

function classifyFirecrawlFailure(errorTextValue: string, exitCode?: number): FirecrawlFailure {
  const text = (errorTextValue ?? "").toLowerCase();
  const isGraceful =
    text.includes("is not installed") ||
    text.includes("ip address looks suspicious") ||
    text.includes("looks suspicious") ||
    text.includes("rate limit") ||
    text.includes("too many requests") ||
    exitCode === 429;
  if (isGraceful) {
    return { kind: "graceful-skip", reason: errorTextValue.trim() || "firecrawl unavailable", raw: errorTextValue };
  }
  return { kind: "hard-error", reason: errorTextValue.trim() || "firecrawl request failed", raw: errorTextValue };
}

function parseScrapeOutput(stdout: string, url: string): FirecrawlScrapeOutput {
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

function parseSearchOutput(stdout: string): FirecrawlSearchOutput {
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

function parseInteractOutput(stdout: string): FirecrawlInteractOutput {
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
