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
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  type BrowseAction,
  buildBatchCommands,
  runAgentBrowserBatch,
  closeAgentBrowserSession,
} from "./utils/agent-browser";

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
