/**
 * CLI runner — abstracted process spawning
 *
 * Provides a single interface for running external CLI commands
 * with consistent signal handling, timeout support, and stdout/stderr
 * collection. Enables testability by allowing the runner to be swapped.
 */

import { spawn, type ChildProcess } from "node:child_process";

export interface CLIRunOptions {
  command: string;
  args: string[];
  /** Data to write to stdin. If omitted, stdin is ignored. */
  stdin?: string;
  /** Timeout in milliseconds. If exceeded, the process is killed. */
  timeout?: number;
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
}

export interface CLIRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run an external CLI command and capture its output.
 *
 * Handles:
 * - stdout/stderr collection
 * - optional stdin feeding
 * - optional timeout (SIGTERM)
 * - AbortSignal cancellation (SIGTERM)
 * - process spawn errors (e.g. ENOENT)
 */
export function runCLI(options: CLIRunOptions): Promise<CLIRunResult> {
  return new Promise((resolve, reject) => {
    const stdio = options.stdin
      ? ["pipe", "pipe", "pipe"]
      : ["ignore", "pipe", "pipe"];

    const proc = spawn(options.command, options.args, {
      shell: false,
      stdio: stdio as any,
    }) as ChildProcess;

    let stdout = "";
    let stderr = "";
    let timeoutId: NodeJS.Timeout | undefined;
    let settled = false;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (options.signal) options.signal.removeEventListener("abort", kill);
    };

    const settleReject = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const kill = () => proc.kill("SIGTERM");

    proc.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    if (options.timeout) {
      timeoutId = setTimeout(() => {
        proc.kill("SIGTERM");
        settleReject(new Error(`${options.command} timed out after ${options.timeout}ms`));
      }, options.timeout);
    }

    proc.on("close", (code) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });

    proc.on("error", (err: any) => {
      if (err.code === "ENOENT") {
        settleReject(new Error(`${options.command} is not installed`));
      } else {
        settleReject(err);
      }
    });

    if (options.signal) {
      if (options.signal.aborted) kill();
      else options.signal.addEventListener("abort", kill, { once: true });
    }

    if (options.stdin && proc.stdin) {
      proc.stdin.write(options.stdin);
      proc.stdin.end();
    }
  });
}
