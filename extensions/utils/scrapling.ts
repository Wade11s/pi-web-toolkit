import { runCLI } from "./cli-runner";
import { getToolkitCommand } from "./config";

/**
 * Run a scrapling CLI command with optional abort signal.
 */
export function runScrapling(
  args: string[],
  signal?: AbortSignal,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return runCLI({ command: getToolkitCommand("scrapling"), args, signal });
}

/**
 * Run scrapling fetch with automatic fallback to HTTP GET on failure.
 *
 * @param url       Target URL
 * @param tmpFile   Output markdown file path
 * @param options   { selector?: string; stealthy?: boolean; noGetFallback?: boolean }
 * @param signal    Optional AbortSignal
 * @returns         { ok: true } or { ok: false, stderr: string }
 */
export async function runScraplingWithFallback(
  url: string,
  tmpFile: string,
  options: { selector?: string; stealthy?: boolean; noGetFallback?: boolean },
  signal?: AbortSignal,
): Promise<{ ok: boolean; stderr?: string }> {
  const cmd = options.stealthy ? "stealthy-fetch" : "fetch";
  const args = ["extract", cmd, url, tmpFile, "--ai-targeted"];
  if (options.selector) {
    args.push("--css-selector", options.selector);
  }

  const result = await runScrapling(args, signal);
  if (result.exitCode === 0) {
    return { ok: true };
  }

  if (!options.noGetFallback) {
    const fallback = await runScrapling(
      ["extract", "get", url, tmpFile, "--ai-targeted"],
      signal,
    );
    if (fallback.exitCode === 0) {
      return { ok: true };
    }
    return { ok: false, stderr: result.stderr || fallback.stderr };
  }

  return { ok: false, stderr: result.stderr };
}
