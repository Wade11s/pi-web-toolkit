/**
 * agent-browser CLI adapter
 *
 * Encapsulates low-level interaction with the agent-browser command: process
 * spawning, batch JSON parsing, and session cleanup. Browser action semantics
 * live in browser-action-language; this module only executes planned commands.
 */

import { runCLI } from "./cli-runner";
import { getToolkitCommand } from "./config";

export interface AgentBrowserBatchItem {
  success: boolean;
  command: string[];
  result?: any;
  error?: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBatchItem(value: unknown): value is AgentBrowserBatchItem {
  return isRecord(value)
    && typeof value.success === "boolean"
    && Array.isArray(value.command)
    && value.command.every((part) => typeof part === "string");
}

function describeBatchOutput(value: unknown): string {
  if (Array.isArray(value)) return `array with ${value.length} item(s)`;
  if (isRecord(value)) return `object with keys: ${Object.keys(value).join(", ") || "(none)"}`;
  return typeof value;
}

export function parseAgentBrowserBatchOutput(stdout: string): AgentBrowserBatchItem[] {
  const parsed = JSON.parse(stdout) as unknown;

  if (Array.isArray(parsed)) {
    if (parsed.every(isBatchItem)) return parsed;
    throw new Error(`Expected every batch result item to contain { success, command }; got ${describeBatchOutput(parsed)}`);
  }

  if (isBatchItem(parsed)) {
    return [parsed];
  }

  if (isRecord(parsed)) {
    for (const key of ["results", "items", "data", "commands"]) {
      const candidate = parsed[key];
      if (Array.isArray(candidate)) {
        if (candidate.every(isBatchItem)) return candidate;
        throw new Error(`Expected ${key} to contain batch result items; got ${describeBatchOutput(candidate)}`);
      }
    }
  }

  throw new Error(`Expected JSON array of batch results; got ${describeBatchOutput(parsed)}`);
}

export async function runAgentBrowserBatch(
  commands: string[][],
  options: { session: string; headless: boolean; signal?: AbortSignal; timeout?: number },
): Promise<AgentBrowserBatchItem[]> {
  const args = ["--session", options.session];
  if (!options.headless) args.push("--headed");
  args.push("batch", "--bail", "--json");

  try {
    const result = await runCLI({
      command: getToolkitCommand("agentBrowser"),
      args,
      stdin: JSON.stringify(commands),
      timeout: options.timeout,
      signal: options.signal,
    });

    if (result.exitCode !== 0 && !result.stdout.trim()) {
      throw new Error(`agent-browser failed (exit ${result.exitCode}):\n${result.stderr || "unknown error"}`);
    }

    try {
      return parseAgentBrowserBatchOutput(result.stdout);
    } catch (err: any) {
      throw new Error(
        `Failed to parse agent-browser output: ${err.message}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
      );
    }
  } catch (err: any) {
    if (typeof err.message === "string" && err.message.includes("is not installed")) {
      throw new Error(
        "agent-browser is not installed.\n\nInstall it with:\n  npm i -g agent-browser && agent-browser install\n\nThen run: agent-browser doctor",
      );
    }
    throw err;
  }
}

export async function closeAgentBrowserSession(session: string, signal?: AbortSignal): Promise<void> {
  try {
    await runCLI({
      command: getToolkitCommand("agentBrowser"),
      args: ["--session", session, "close"],
      signal,
    });
  } catch {
    // Best-effort cleanup — ignore errors
  }
}
