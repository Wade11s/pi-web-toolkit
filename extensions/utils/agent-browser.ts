/**
 * agent-browser CLI wrapper
 *
 * Encapsulates all low-level interaction with the agent-browser command:
 * command building, process spawning, JSON parsing, and session cleanup.
 */

import { runCLI } from "./cli-runner";

export interface BrowseAction {
  type: "click" | "fill" | "type" | "press" | "wait" | "wait_selector" | "scroll";
  selector?: string;
  value?: string;
  key?: string;
  ms?: number;
  direction?: "down" | "up" | "bottom" | "top";
  amount?: number;
  state?: "attached" | "visible" | "hidden";
}

export interface AgentBrowserBatchItem {
  success: boolean;
  command: string[];
  result?: any;
  error?: string | null;
}

function requireString(action: BrowseAction, field: "selector" | "value" | "key"): string {
  const value = action[field] as string | undefined;
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Action "${action.type}" requires non-empty ${field}`);
  }
  return value;
}

function requireInteger(action: BrowseAction, field: "ms" | "amount"): number {
  const value = action[field] as number | undefined;
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`Action "${action.type}" requires non-negative integer ${field}`);
  }
  return value as number;
}

function waitForSelectorScript(selector: string, state: "attached" | "visible" | "hidden"): string {
  const selectorLiteral = JSON.stringify(selector);
  const stateLiteral = JSON.stringify(state);
  return `await new Promise((resolve, reject) => {
    const selector = ${selectorLiteral};
    const state = ${stateLiteral};
    const deadline = Date.now() + 30000;
    const isVisible = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
    const check = () => {
      const el = document.querySelector(selector);
      const ok = state === "attached" ? !!el : state === "hidden" ? !isVisible(el) : isVisible(el);
      if (ok) return resolve(true);
      if (Date.now() > deadline) return reject(new Error(\`Timed out waiting for ${state} selector: ${selector}\`));
      setTimeout(check, 100);
    };
    check();
  })`;
}

export function buildBatchCommands(
  url: string,
  actions: BrowseAction[],
  selector?: string,
): string[][] {
  const commands: string[][] = [["open", url]];

  for (const action of actions) {
    switch (action.type) {
      case "click":
        commands.push(["click", requireString(action, "selector")]);
        break;
      case "fill":
        commands.push(["fill", requireString(action, "selector"), requireString(action, "value")]);
        break;
      case "type":
        commands.push(["type", requireString(action, "selector"), requireString(action, "value")]);
        break;
      case "press": {
        if (action.selector) {
          commands.push(["focus", action.selector]);
        }
        commands.push(["press", requireString(action, "key")]);
        break;
      }
      case "wait":
        commands.push(["wait", String(requireInteger(action, "ms"))]);
        break;
      case "wait_selector": {
        const state = action.state ?? "visible";
        const waitSelector = requireString(action, "selector");
        if (state === "visible") {
          commands.push(["wait", waitSelector]);
        } else {
          commands.push(["eval", waitForSelectorScript(waitSelector, state)]);
        }
        break;
      }
      case "scroll": {
        const dir = action.direction ?? "down";
        if (dir === "top") {
          commands.push(["eval", "window.scrollTo(0, 0)"]);
        } else if (dir === "bottom") {
          commands.push(["eval", "window.scrollTo(0, document.body.scrollHeight)"]);
        } else {
          commands.push(["scroll", dir, String(action.amount ?? 500)]);
        }
        break;
      }
      default:
        throw new Error(`Unsupported browser action: ${(action as BrowseAction).type}`);
    }
  }

  // Extract content
  if (selector) {
    commands.push(["get", "text", selector, "--json"]);
  } else {
    commands.push(["snapshot", "-i", "--json"]);
  }

  // Metadata
  commands.push(["get", "title", "--json"]);
  commands.push(["get", "url", "--json"]);

  return commands;
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
      command: "agent-browser",
      args,
      stdin: JSON.stringify(commands),
      timeout: options.timeout,
      signal: options.signal,
    });

    if (result.exitCode !== 0 && !result.stdout.trim()) {
      throw new Error(`agent-browser failed (exit ${result.exitCode}):\n${result.stderr || "unknown error"}`);
    }

    try {
      return JSON.parse(result.stdout) as AgentBrowserBatchItem[];
    } catch (err: any) {
      throw new Error(
        `Failed to parse agent-browser output: ${err.message}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`
      );
    }
  } catch (err: any) {
    if (err.message === "agent-browser is not installed") {
      throw new Error(
        "agent-browser is not installed.\n\nInstall it with:\n  npm i -g agent-browser && agent-browser install\n\nThen run: agent-browser doctor"
      );
    }
    throw err;
  }
}

export async function closeAgentBrowserSession(session: string, signal?: AbortSignal): Promise<void> {
  try {
    await runCLI({
      command: "agent-browser",
      args: ["--session", session, "close"],
      signal,
    });
  } catch {
    // Best-effort cleanup — ignore errors
  }
}
