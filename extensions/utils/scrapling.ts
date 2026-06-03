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
