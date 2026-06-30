/**
 * pi-web-toolkit runtime configuration
 *
 * Reads user-level toolkit configuration without requiring users to modify
 * shell profiles. Environment variables remain the highest-priority override.
 */

import { existsSync, readFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export const DEFAULT_SEARXNG_URL = "http://localhost:8080";

export interface ToolkitCommandsConfig {
  scrapling?: string;
  agentBrowser?: string;
  firecrawl?: string;
}

export type FirecrawlRunner = "installed" | "npx" | "bunx";

export interface ToolkitConfig {
  searxngUrl?: string;
  firecrawlFallback?: boolean;
  firecrawlRunner?: FirecrawlRunner;
  commands?: ToolkitCommandsConfig;
}

export type ToolkitCommandName = "scrapling" | "agentBrowser" | "firecrawl";

const COMMAND_DEFAULTS: Record<ToolkitCommandName, string> = {
  scrapling: "scrapling",
  agentBrowser: "agent-browser",
  firecrawl: "firecrawl",
};

const COMMAND_ENV_VARS: Record<ToolkitCommandName, string> = {
  scrapling: "SCRAPLING_BIN",
  agentBrowser: "AGENT_BROWSER_BIN",
  firecrawl: "FIRECRAWL_BIN",
};

const FIRECRAWL_RUNNERS = ["installed", "npx", "bunx"] as const;

function isFirecrawlRunner(value: string): value is FirecrawlRunner {
  return (FIRECRAWL_RUNNERS as readonly string[]).includes(value);
}

export function getDefaultToolkitConfigPath(): string {
  const configHome = process.env.XDG_CONFIG_HOME?.trim() || path.join(os.homedir(), ".config");
  return path.join(configHome, "pi-web-toolkit", "config.json");
}

export function getToolkitConfigPath(): string {
  const configured = process.env.PI_WEB_TOOLKIT_CONFIG?.trim();
  return configured || getDefaultToolkitConfigPath();
}

function parseConfigFile(filePath: string, required: boolean): ToolkitConfig {
  if (!existsSync(filePath)) {
    if (required) {
      throw new Error(`Toolkit config file not found: ${filePath}`);
    }
    return {};
  }

  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err: any) {
    throw new Error(`Unable to read toolkit config at ${filePath}: ${err.message ?? String(err)}`);
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("expected a JSON object");
    }
    validateToolkitConfig(parsed as Record<string, unknown>);
    return parsed as ToolkitConfig;
  } catch (err: any) {
    throw new Error(`Invalid toolkit config at ${filePath}: ${err.message ?? String(err)}`);
  }
}

function validateOptionalString(value: unknown, key: string): void {
  if (value !== undefined && typeof value !== "string") {
    throw new Error(`${key} must be a string`);
  }
}

function validateToolkitConfig(value: Record<string, unknown>): void {
  validateOptionalString(value.searxngUrl, "searxngUrl");

  if (value.firecrawlFallback !== undefined && typeof value.firecrawlFallback !== "boolean") {
    throw new Error("firecrawlFallback must be a boolean");
  }

  if (value.firecrawlRunner !== undefined) {
    if (typeof value.firecrawlRunner !== "string" || !isFirecrawlRunner(value.firecrawlRunner)) {
      throw new Error("firecrawlRunner must be one of: installed, npx, bunx");
    }
  }

  if (value.commands !== undefined) {
    if (typeof value.commands !== "object" || value.commands === null || Array.isArray(value.commands)) {
      throw new Error("commands must be an object");
    }
    const commands = value.commands as Record<string, unknown>;
    validateOptionalString(commands.scrapling, "commands.scrapling");
    validateOptionalString(commands.agentBrowser, "commands.agentBrowser");
    validateOptionalString(commands.firecrawl, "commands.firecrawl");
  }
}

export function readToolkitConfig(): ToolkitConfig {
  const filePath = getToolkitConfigPath();
  const required = Boolean(process.env.PI_WEB_TOOLKIT_CONFIG?.trim());
  return parseConfigFile(filePath, required);
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getSearxngUrl(): string {
  const envUrl = process.env.SEARXNG_URL?.trim();
  if (envUrl) return normalizeUrl(envUrl);

  const cfgUrl = readToolkitConfig().searxngUrl?.trim();
  if (cfgUrl) return normalizeUrl(cfgUrl);

  return DEFAULT_SEARXNG_URL;
}

export function getToolkitCommand(name: ToolkitCommandName): string {
  const envVar = COMMAND_ENV_VARS[name];
  const envCommand = process.env[envVar]?.trim();
  if (envCommand) return envCommand;

  const cfgCommand = readToolkitConfig().commands?.[name]?.trim();
  if (cfgCommand) return cfgCommand;

  return COMMAND_DEFAULTS[name];
}

export function isFirecrawlFallbackEnabled(): boolean {
  const envValue = process.env.PI_WEB_FIRECRAWL_FALLBACK;
  if (envValue !== undefined) {
    const v = envValue.trim().toLowerCase();
    return !(v === "0" || v === "false" || v === "no" || v === "off");
  }

  const cfgValue = readToolkitConfig().firecrawlFallback;
  if (cfgValue !== undefined) return cfgValue;

  return true;
}

export function getFirecrawlRunner(): FirecrawlRunner {
  const envValue = process.env.PI_WEB_FIRECRAWL_RUNNER?.trim().toLowerCase();
  if (envValue) {
    if (!isFirecrawlRunner(envValue)) {
      throw new Error("PI_WEB_FIRECRAWL_RUNNER must be one of: installed, npx, bunx");
    }
    return envValue;
  }

  return readToolkitConfig().firecrawlRunner ?? "installed";
}
