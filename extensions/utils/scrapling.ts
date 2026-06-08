import { spawn } from "node:child_process";

/**
 * Run a scrapling CLI command with optional abort signal.
 */
export function runScrapling(
  args: string[],
  signal?: AbortSignal,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn("scrapling", args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    proc.on("close", (code, closeSignal) => {
      const exitCode = code ?? 1;
      const signalMessage = closeSignal ? `Process terminated by ${closeSignal}` : "";
      resolve({ stdout, stderr: stderr || signalMessage, exitCode });
    });
    proc.on("error", (err) => resolve({ stdout, stderr: err.message, exitCode: 1 }));

    if (signal) {
      const kill = () => {
        proc.kill("SIGTERM");
      };
      if (signal.aborted) kill();
      else signal.addEventListener("abort", kill, { once: true });
    }
  });
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
