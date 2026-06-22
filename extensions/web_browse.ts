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
 * For pages that need no interaction, use `web_fetch` instead.
 */

import {
  defineTool,
  type ExtensionAPI,
  formatSize,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
} from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Text } from "@earendil-works/pi-tui";
import { Type, type Static } from "typebox";
import {
  type BrowseAction,
  buildBatchCommands,
  runAgentBrowserBatch,
  closeAgentBrowserSession,
} from "./utils/agent-browser";
import { writeWithFallback } from "./utils/output-sink";
import { interactKeyless, shouldFallbackBrowse, isFirecrawlEnabled } from "./utils/firecrawl";
import { abbreviateUrl, getErrorText, normalizeWhitespace } from "./utils/render-helpers";

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

function formatBrowseStep(action: BrowseAction): string {
  switch (action.type) {
    case "click":
      return `click ${action.selector ?? ""}`;
    case "fill":
      return `fill ${action.selector ?? ""} "${action.value ?? ""}"`;
    case "type":
      return `type ${action.selector ?? ""} "${action.value ?? ""}"`;
    case "press":
      return action.selector
        ? `focus ${action.selector} + press ${action.key ?? ""}`
        : `press ${action.key ?? ""}`;
    case "wait":
      return action.selector
        ? `wait for ${action.selector}`
        : `wait ${action.ms ?? 0}ms`;
    case "wait_selector":
      return `wait for ${action.selector ?? ""} (${action.state ?? "visible"})`;
    case "scroll": {
      const dir = action.direction ?? "down";
      if (dir === "top" || dir === "bottom") return `scroll to ${dir}`;
      return `scroll ${dir}${action.amount ? ` ${action.amount}px` : ""}`;
    }
    default:
      return String((action as any).type);
  }
}

function synthesizeBrowsePrompt(params: { url: string; actions: BrowseAction[]; selector?: string }): string {
  const parts: string[] = [];
  for (const a of params.actions) {
    switch (a.type) {
      case "click": parts.push(`click the element "${a.selector ?? ""}"`); break;
      case "fill": case "type": parts.push(`type "${a.value ?? ""}" into "${a.selector ?? ""}"`); break;
      case "press": parts.push(`press ${a.key ?? ""}`); break;
      case "scroll": parts.push(`scroll ${a.direction ?? "down"}`); break;
      case "wait": parts.push("wait briefly"); break;
      case "wait_selector": parts.push(`wait for "${a.selector ?? ""}" to appear`); break;
    }
  }
  const actionText = parts.length ? `Perform these actions in order: ${parts.join("; ")}. ` : "";
  const extract = params.selector
    ? `Then return the text content of the element matching "${params.selector}".`
    : "Then return the main textual content of the page.";
  return `${actionText}${extract}`;
}

const webBrowseTool = defineTool({
  name: "web_browse",
  label: "Web Browse",
  description: [
    "Interact with a web page through a browser: navigate, click, fill forms, scroll,",
    "wait for content, and then extract text.",
    "Uses the agent-browser CLI with batched JSON commands.",
    "Use web_browse when the target content requires interaction (clicking buttons,",
    "scrolling, filling search boxes, waiting for JS to load) before it becomes available.",
    "For pages that need no interaction, use web_fetch instead.",
    `Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}; if truncated, full output is saved to a temp file.`,
  ].join(" "),
  promptSnippet: "Interact with a web page (click, scroll, fill) and extract content",
  promptGuidelines: [
    "Use web_browse when a page requires clicking, scrolling, or form submission before showing target content.",
    "Use web_browse for SPAs, pagination (click 'Load more'), search forms, tab switching, and modal dialogs.",
    "For static articles, docs, or blogs that load everything on first request, prefer web_fetch.",
    "After web_search returns results, prefer web_fetch for reading individual articles.",
    "Use web_browse directly when interaction is required; otherwise try web_fetch first.",
    "Always provide a selector to extract only the relevant content area — avoid dumping full page text.",
  ],
  parameters: WebBrowseParamsSchema,

  async execute(toolCallId, params, signal, onUpdate) {
    let fullOutputPath: string | undefined;
    const session = `pi-web-browse-${toolCallId}`;
    const actionCount = params.actions.length;
    const steps = [
      `open ${params.url}`,
      ...(params.actions as BrowseAction[]).map(formatBrowseStep),
      params.selector ? `get text ${params.selector}` : "snapshot",
      "get title",
      "get url",
    ];

    // Stream planned steps for isPartial rendering
    onUpdate?.({
      content: [{ type: "text", text: `Browsing ${params.url} (${actionCount} actions)...` }],
      details: { url: params.url, steps, actionCount, selector: params.selector, headless: params.headless ?? true },
    });

    try {
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
      const preview = content.replace(/\s+/g, " ").trim().slice(0, 500);

      const lines: string[] = [
        `Title: ${title || "(no title)"}`,
        `URL: ${finalUrl}`,
        "",
        "---",
        "",
        content || "(no content extracted)",
      ];

      const rawText = lines.join("\n");
      const sink = await writeWithFallback(rawText, {
        tmpPrefix: "pi-web-browse-",
      });
      fullOutputPath = sink.fullOutputPath;

      return {
        content: [{ type: "text", text: sink.text }],
        details: {
          title,
          url: finalUrl,
          fullOutputPath,
          preview,
          selector: params.selector,
          headless: params.headless ?? true,
          actionCount,
          steps,
        },
      };
    } catch (err: any) {
      // Firecrawl keyless fallback: only on runtime failures (CLI missing /
      // batch failure), never on local validation errors (bad caller actions).
      if (isFirecrawlEnabled() && !signal?.aborted && shouldFallbackBrowse(err as Error)) {
        const fb = await interactKeyless(
          params.url,
          { prompt: synthesizeBrowsePrompt({ url: params.url, actions: params.actions as BrowseAction[], selector: params.selector }), timeout: 60 },
          signal,
        );
        if (fb.ok) {
          const preview = (fb.output || "").replace(/\s+/g, " ").trim().slice(0, 500);
          const creditTag = fb.creditsUsed !== undefined ? `, ${fb.creditsUsed} credits` : "";
          const rawText = `URL: ${params.url}\n(via Firecrawl keyless interact fallback${creditTag})\n\n---\n\n${fb.output || "(no content extracted)"}`;
          const sink = await writeWithFallback(rawText, { tmpPrefix: "pi-web-browse-firecrawl-" });
          return {
            content: [{ type: "text", text: sink.text }],
            details: {
              title: "",
              url: params.url,
              fullOutputPath: sink.fullOutputPath,
              preview,
              selector: params.selector,
              headless: params.headless ?? true,
              actionCount,
              steps,
              viaFirecrawl: true,
              creditsUsed: fb.creditsUsed,
            },
          };
        }
        // Graceful skip (CLI absent / IP flagged / rate-limited / disabled):
        // fall through to the original local error.
      }
      throw new Error(`Error browsing ${params.url}: ${err.message ?? err}`);
    } finally {
      await closeAgentBrowserSession(session, signal);
    }
  },

  renderCall(args, theme) {
    let text = theme.fg("toolTitle", theme.bold("web_browse "));
    text += theme.fg("muted", args.url);
    text += theme.fg("dim", ` (${args.actions?.length ?? 0} actions)`);
    if (args.selector) {
      text += theme.fg("dim", ` [selector=${args.selector}]`);
    }
    if (args.headless === false) {
      text += theme.fg("dim", " [headed]");
    }
    return new Text(text, 0, 0);
  },

  renderResult(result, { expanded, isPartial }, theme, context) {
    const isError = context?.isError ?? false;

    if (isPartial) {
      const progress = (result.details as any);
      const steps = progress?.steps as string[] | undefined;
      const url = progress?.url as string | undefined;
      const actionCount = progress?.actionCount ?? steps?.length ?? 0;
      let text = theme.fg("warning", "Browsing");
      if (url) {
        text += `  ${theme.fg("dim", abbreviateUrl(url))}`;
      }
      text += theme.fg("dim", ` (${actionCount} steps)`);
      if (steps && steps.length > 0) {
        // Limit to first 5 steps to avoid blowing up vertical space
        const maxPreviewSteps = 5;
        for (let i = 0; i < Math.min(steps.length, maxPreviewSteps); i++) {
          text += `\n  ${theme.fg("dim", `[${i + 1}] ${steps[i]}`)}`;
        }
        if (steps.length > maxPreviewSteps) {
          text += `\n  ${theme.fg("muted", `... and ${steps.length - maxPreviewSteps} more`)}`;
        }
      }
      return new Text(text, 0, 0);
    }

    const details = result.details as {
      title?: string;
      url?: string;
      fullOutputPath?: string;
      preview?: string;
      selector?: string;
      headless?: boolean;
      actionCount?: number;
      steps?: string[];
      viaFirecrawl?: boolean;
      creditsUsed?: number;
    } | undefined;

    if (isError) {
      const errText = getErrorText(result);
      let text = theme.fg("error", "✗ Browse failed");
      if (details?.url) text += `  ${theme.fg("dim", abbreviateUrl(details.url))}`;
      text += `\n\n  ${theme.fg("toolOutput", errText)}`;
      if (details?.steps && details.steps.length > 0) {
        text += `\n\n${theme.fg("dim", "Steps attempted:")}`;
        for (let i = 0; i < details.steps.length; i++) {
          text += `\n  ${theme.fg("dim", `[${i + 1}] ${details.steps[i]}`)}`;
        }
      }
      return new Text(text, 0, 0);
    }

    let text = theme.fg("success", "✓ Browsed");
    if (details?.viaFirecrawl) {
      text += theme.fg("accent", " [Firecrawl keyless]");
    }
    if (details?.title) {
      text += `  ${theme.fg("toolTitle", details.title)}`;
    }
    if (details?.url) {
      text += `\n  ${theme.fg("dim", abbreviateUrl(details.url))}`;
    }
    if (details?.actionCount) {
      text += theme.fg("muted", ` (${details.actionCount} actions)`);
    }

    if (details?.selector) {
      text += `\n  ${theme.fg("dim", `[selector=${details.selector}]`)}`;
    }
    if (details?.headless === false) {
      text += `${details?.selector ? "" : "\n  "}${theme.fg("dim", "[headed]")}`;
    }

    if (!expanded && details?.preview) {
      const snippet = normalizeWhitespace(details.preview);
      const short = snippet.length > 160
        ? snippet.slice(0, 160).replace(/\s+\S*$/, "") + "..."
        : snippet;
      text += `\n\n  ${theme.fg("muted", short)}`;
    }

    if (expanded) {
      if (details?.steps && details.steps.length > 0) {
        text += `\n\n${theme.fg("dim", "Steps:")}`;
        for (let i = 0; i < details.steps.length; i++) {
          text += `\n  ${theme.fg("dim", `[${i + 1}] ${details.steps[i]}`)}`;
        }
      }

      if (details?.preview) {
        text += `\n\n  ${theme.fg("muted", normalizeWhitespace(details.preview))}`;
      }

      if (details?.fullOutputPath) {
        text += `\n\n${theme.fg("accent", `Full output: ${details.fullOutputPath}`)}`;
      }
    }

    return new Text(text, 0, 0);
  },
});

export default function (pi: ExtensionAPI) {
  pi.registerTool(webBrowseTool);
}
