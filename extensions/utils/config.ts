/**
 * pi-web-toolkit runtime configuration
 *
 * Thin TypeScript wrapper around the shared CommonJS toolkit-config core used
 * by both runtime tools and the shell bootstrap installer. Environment
 * variables remain the highest-priority override.
 */

export type FirecrawlRunner = "installed" | "npx" | "bunx";

export interface ToolkitCommandsConfig {
  scrapling?: string;
  agentBrowser?: string;
  firecrawl?: string;
}

export interface ToolkitConfig {
  searxngUrl?: string;
  firecrawlFallback?: boolean;
  firecrawlRunner?: FirecrawlRunner;
  commands?: ToolkitCommandsConfig;
}

export type ToolkitConfigDocument = ToolkitConfig & Record<string, unknown>;

export interface ToolkitConfigWriteInput {
  searxngUrl?: string;
  firecrawlFallback?: boolean;
  firecrawlRunner?: FirecrawlRunner;
  commands?: ToolkitCommandsConfig;
}

export type ToolkitCommandName = "scrapling" | "agentBrowser" | "firecrawl";

export interface ResolveToolkitConfigOptions {
  env?: NodeJS.ProcessEnv;
  configPath?: string;
  required?: boolean;
}

export interface ResolvedToolkitConfig {
  configPath: string;
  config: ToolkitConfigDocument;
  searxngUrl: string;
  commands: Record<ToolkitCommandName, string>;
  firecrawlFallback: boolean;
  firecrawlRunner: FirecrawlRunner;
}

interface ToolkitConfigCore {
  DEFAULT_SEARXNG_URL: string;
  getDefaultToolkitConfigPath(env?: NodeJS.ProcessEnv, homeDir?: string): string;
  getToolkitConfigPath(env?: NodeJS.ProcessEnv, homeDir?: string): string;
  validateToolkitConfig(value: unknown): void;
  parseConfigFile(filePath: string, required?: boolean): ToolkitConfigDocument;
  readToolkitConfig(options?: ResolveToolkitConfigOptions): ToolkitConfigDocument;
  resolveToolkitConfig(options?: ResolveToolkitConfigOptions): ResolvedToolkitConfig;
  resolveSearxngUrl(options?: ResolveToolkitConfigOptions): string;
  resolveToolkitCommand(name: ToolkitCommandName, options?: ResolveToolkitConfigOptions): string;
  resolveFirecrawlFallback(options?: ResolveToolkitConfigOptions): boolean;
  resolveFirecrawlRunner(options?: ResolveToolkitConfigOptions): FirecrawlRunner;
  writeToolkitConfig(filePath: string, input: ToolkitConfigWriteInput): ToolkitConfigDocument;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const core = require("./config-core.cjs") as ToolkitConfigCore;

export const DEFAULT_SEARXNG_URL = core.DEFAULT_SEARXNG_URL;

export function getDefaultToolkitConfigPath(): string {
  return core.getDefaultToolkitConfigPath(process.env);
}

export function getToolkitConfigPath(): string {
  return core.getToolkitConfigPath(process.env);
}

export function validateToolkitConfig(value: unknown): void {
  core.validateToolkitConfig(value);
}

export function readToolkitConfig(): ToolkitConfigDocument {
  return core.readToolkitConfig({ env: process.env });
}

export function resolveToolkitConfig(options: ResolveToolkitConfigOptions = {}): ResolvedToolkitConfig {
  return core.resolveToolkitConfig(options);
}

export function writeToolkitConfig(filePath: string, input: ToolkitConfigWriteInput): ToolkitConfigDocument {
  return core.writeToolkitConfig(filePath, input);
}

export function getSearxngUrl(): string {
  return core.resolveSearxngUrl({ env: process.env });
}

export function getToolkitCommand(name: ToolkitCommandName): string {
  return core.resolveToolkitCommand(name, { env: process.env });
}

export function isFirecrawlFallbackEnabled(): boolean {
  return core.resolveFirecrawlFallback({ env: process.env });
}

export function getFirecrawlRunner(): FirecrawlRunner {
  return core.resolveFirecrawlRunner({ env: process.env });
}
