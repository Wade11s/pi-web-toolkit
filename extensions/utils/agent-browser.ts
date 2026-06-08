/**
 * agent-browser CLI wrapper
 *
 * Encapsulates all low-level interaction with the agent-browser command:
 * command building, process spawning, JSON parsing, and session cleanup.
 */

import { spawn } from "node:child_process";

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
  const value = action[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Action "${action.type}" requires non-empty ${field}`);
  }
  return value;
}

function requireInteger(action: BrowseAction, field: "ms" | "amount"): number {
  const value = action[field];
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Action "${action.type}" requires non-negative integer ${field}`);
  }
  return value;
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

export function runAgentBrowserBatch(
  commands: string[][],
  options: { session: string; headless: boolean; signal?: AbortSignal; timeout?: number },
): Promise<AgentBrowserBatchItem[]> {
  const args = ["--session", options.session];
  if (!options.headless) args.push("--headed");
  args.push("batch", "--bail", "--json");

  return new Promise((resolve, reject) => {
    const proc = spawn("agent-browser", args, {
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });

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

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    if (options.timeout) {
      timeoutId = setTimeout(() => {
        proc.kill("SIGTERM");
        settleReject(new Error(`agent-browser timed out after ${options.timeout}ms`));
      }, options.timeout);
    }

    proc.on("close", (code) => {
      if (settled) return;
      settled = true;
      cleanup();

      if (code !== 0 && !stdout.trim()) {
        reject(new Error(`agent-browser failed (exit ${code}):\n${stderr || "unknown error"}`));
        return;
      }

      try {
        const results = JSON.parse(stdout) as AgentBrowserBatchItem[];
        resolve(results);
      } catch (err: any) {
        reject(new Error(
          `Failed to parse agent-browser output: ${err.message}\nstdout: ${stdout}\nstderr: ${stderr}`
        ));
      }
    });

    proc.on("error", (err: any) => {
      if (err.code === "ENOENT") {
        settleReject(new Error(
          "agent-browser is not installed.\n\nInstall it with:\n  npm i -g agent-browser && agent-browser install\n\nThen run: agent-browser doctor"
        ));
      } else {
        settleReject(err);
      }
    });

    if (options.signal) {
      if (options.signal.aborted) kill();
      else options.signal.addEventListener("abort", kill, { once: true });
    }

    proc.stdin.write(JSON.stringify(commands));
    proc.stdin.end();
  });
}

export function closeAgentBrowserSession(session: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const proc = spawn("agent-browser", ["--session", session, "close"], {
      shell: false,
      stdio: ["ignore", "ignore", "ignore"],
    });
    const done = () => resolve();
    proc.on("close", done);
    proc.on("error", done);
    if (signal) {
      const kill = () => proc.kill("SIGTERM");
      if (signal.aborted) kill();
      else signal.addEventListener("abort", kill, { once: true });
    }
  });
}
