/**
 * Web Browse Extension — Interactive browser automation via agent-browser
 *
 * Provides a `web_browse` tool for multi-step page interaction using the
 * agent-browser CLI (https://github.com/vercel-labs/agent-browser).
 *
 * Use web_browse when a page requires interaction (clicking, scrolling,
 * filling forms, waiting for dynamic content) BEFORE its target content
 * becomes available.
 *
 * For static pages that need no interaction, use `web_fetch` instead.
 */

import {
  defineTool,
  type ExtensionAPI,
  truncateHead,
  formatSize,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
} from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Text } from "@earendil-works/pi-tui";
import { Type, type Static } from "typebox";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

interface BrowseAction {
  type: "click" | "fill" | "type" | "press" | "wait" | "wait_selector" | "scroll";
  selector?: string;
  value?: string;
  key?: string;
  ms?: number;
  direction?: "down" | "up" | "bottom" | "top";
  amount?: number;
  state?: "attached" | "visible" | "hidden";
}

interface AgentBrowserBatchItem {
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

function buildBatchCommands(
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

function runAgentBrowserBatch(
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

function closeAgentBrowserSession(session: string, signal?: AbortSignal): Promise<void> {
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

export const WebBrowseActionSchema = Type.Object({
  type: StringEnum(["click", "fill", "type", "press", "wait", "wait_selector", "scroll"] as const),
  selector: Type.Optional(Type.String({ description: "CSS selector for actions that target an element" })),
  value: Type.Optional(Type.String({ description: "Value for fill/type actions" })),
  key: Type.Optional(Type.String({ description: "Key for press actions, e.g. Enter or Tab" })),
  ms: Type.Optional(Type.Integer({ description: "Milliseconds for wait actions", minimum: 0 })),
  direction: Type.Optional(StringEnum(["down", "up", "bottom", "top"] as const)),
  amount: Type.Optional(Type.Integer({ description: "Pixels for scroll up/down actions", minimum: 0 })),
  state: Type.Optional(StringEnum(["attached", "visible", "hidden"] as const)),
});

export const WebBrowseParamsSchema = Type.Object({
  url: Type.String({ description: "Starting URL to open in the browser" }),
  actions: Type.Array(WebBrowseActionSchema, {
    description: "Ordered list of actions to perform on the page. Required fields depend on action type.",
    maxItems: 25,
  }),
  selector: Type.Optional(Type.String({ description: "CSS selector to extract content from the final page state" })),
  headless: Type.Optional(Type.Boolean({ description: "Run browser headlessly. Default: true", default: true })),
  timeout: Type.Optional(Type.Integer({ description: "Overall browser batch timeout in milliseconds. Default: 30000", minimum: 1, default: 30000 })),
});

export type WebBrowseInput = Static<typeof WebBrowseParamsSchema>;

const webBrowseTool = defineTool({
  name: "web_browse",
  label: "Web Browse",
  description: [
    "Interact with a web page through a browser: navigate, click, fill forms, scroll,",
    "wait for content, and then extract text.",
    "Uses the agent-browser CLI for fast, native browser automation via Chrome CDP.",
    "Use web_browse when the target content requires interaction (clicking buttons,",
    "scrolling, filling search boxes, waiting for JS to load) before it becomes available.",
    "For static pages that need no interaction, use web_fetch instead.",
    `Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}; if truncated, full output is saved to a temp file.`,
  ].join(" "),
  promptSnippet: "Interact with a web page (click, scroll, fill) and extract content",
  promptGuidelines: [
    "Use web_browse when a page requires clicking, scrolling, or form submission before showing target content.",
    "Use web_browse for SPAs, pagination (click 'Load more'), search forms, tab switching, and modal dialogs.",
    "For static articles, docs, or blogs that load everything on first request, prefer web_fetch.",
    "After web_search returns results, prefer web_fetch for reading individual articles.",
    "Only use web_browse if web_fetch fails to get the needed content.",
    "Always provide a selector to extract only the relevant content area — avoid dumping full page text.",
  ],
  parameters: WebBrowseParamsSchema,

  async execute(toolCallId, params, signal, onUpdate) {
    let fullOutputPath: string | undefined;
    const session = `pi-web-browse-${toolCallId}`;

    try {
      onUpdate?.({ content: [{ type: "text", text: `Browsing ${params.url}...` }], details: {} });

      const commands = buildBatchCommands(
        params.url,
        params.actions as BrowseAction[],
        params.selector,
      );

      const results = await runAgentBrowserBatch(commands, {
        session,
        headless: params.headless ?? true,
        signal,
        timeout: params.timeout ?? 30000,
      });

      const failed = results.find((r) => !r.success);
      if (failed) {
        const cmdStr = failed.command?.join(" ") ?? "unknown command";
        const errMsg = failed.error ?? "unknown error";
        throw new Error(`Browser action failed: ${cmdStr} — ${errMsg}`);
      }

      const contentResult = results.find((r) => {
        if (r.command[0] === "snapshot" && r.command.includes("--json")) return true;
        if (r.command[0] === "get" && r.command[1] === "text") return true;
        return false;
      });

      const titleResult = results.find((r) => r.command[0] === "get" && r.command[1] === "title");
      const urlResult = results.find((r) => r.command[0] === "get" && r.command[1] === "url");

      let content = "";
      if (contentResult?.success) {
        if (contentResult.command[0] === "snapshot") {
          content = contentResult.result?.snapshot ?? "";
        } else {
          content = contentResult.result?.text ?? "";
        }
      }

      const title = titleResult?.result?.title ?? "";
      const finalUrl = urlResult?.result?.url ?? params.url;

      const lines: string[] = [
        `Title: ${title || "(no title)"}`,
        `URL: ${finalUrl}`,
        "",
        "---",
        "",
        content || "(no content extracted)",
      ];

      const rawText = lines.join("\n");
      const truncation = truncateHead(rawText, {
        maxLines: DEFAULT_MAX_LINES,
        maxBytes: DEFAULT_MAX_BYTES,
      });

      let finalText = truncation.content;
      if (truncation.truncated) {
        const fullOutputDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pi-web-browse-"));
        fullOutputPath = path.join(fullOutputDir, "output.txt");
        await fs.promises.writeFile(fullOutputPath, rawText, "utf-8");
        finalText += `\n\n[Output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}). Full output saved to: ${fullOutputPath}]`;
      }

      onUpdate?.({ content: [{ type: "text", text: `Extracted from ${finalUrl}` }], details: {} });

      return {
        content: [{ type: "text", text: finalText }],
        details: { title, url: finalUrl, fullOutputPath },
      };
    } catch (err: any) {
      throw new Error(`Error browsing ${params.url}: ${err.message ?? err}`);
    } finally {
      await closeAgentBrowserSession(session, signal);
    }
  },

  renderCall(args, theme) {
    let text = theme.fg("toolTitle", theme.bold("web_browse "));
    text += theme.fg("muted", args.url);
    text += theme.fg("dim", ` (${args.actions?.length ?? 0} actions)`);
    return new Text(text, 0, 0);
  },

  renderResult(result, { expanded, isPartial }, theme) {
    if (isPartial) {
      return new Text(theme.fg("warning", "Browsing..."), 0, 0);
    }
    const details = result.details as { title?: string; url?: string; fullOutputPath?: string } | undefined;
    let text = theme.fg("success", "✓ Browsed");
    if (details?.title) {
      text += theme.fg("muted", ` — ${details.title}`);
    }
    if (expanded && details?.url) {
      text += `\n${theme.fg("dim", details.url)}`;
    }
    if (expanded && details?.fullOutputPath) {
      text += `\n${theme.fg("dim", `Full output: ${details.fullOutputPath}`)}`;
    }
    return new Text(text, 0, 0);
  },
});

export default function (pi: ExtensionAPI) {
  pi.registerTool(webBrowseTool);
}
