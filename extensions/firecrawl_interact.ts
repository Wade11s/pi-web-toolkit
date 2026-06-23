/**
 * Firecrawl Interact Extension — natural-language browser interaction (keyless)
 *
 * Provides a `firecrawl_interact` tool that scrapes a URL to start a live
 * Firecrawl browser session, then drives the page with a natural-language
 * prompt (or code) and returns the result. It is an escape hatch for
 * interactive pages the local agent-browser tool cannot run (missing CLI,
 * missing OS browser deps), and underpins the automatic `web_browse` fallback.
 *
 * Requires: `npm install -g firecrawl-cli` (optional; degrades gracefully).
 * Privacy: the URL, page content, and prompt are sent to Firecrawl's cloud.
 */

import {
  defineTool,
  type ExtensionAPI,
  formatSize,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type, type Static } from "typebox";
import { StringEnum } from "@earendil-works/pi-ai";
import { interactKeyless } from "./utils/firecrawl";
import { writeWithFallback } from "./utils/output-sink";
import { abbreviateUrl, getDomain, getErrorText, normalizeWhitespace } from "./utils/render-helpers";

export const FirecrawlInteractParamsSchema = Type.Object({
  url: Type.String({ description: "Full URL to open and interact with" }),
  prompt: Type.Optional(Type.String({ description: "Natural-language task for the AI agent (e.g. 'Click the pricing tab and return the price')" })),
  code: Type.Optional(Type.String({ description: "Code to execute in the browser sandbox instead of a prompt" })),
  language: Type.Optional(StringEnum(["node", "python", "bash"] as const)),
  timeout: Type.Optional(Type.Integer({ description: "Timeout in seconds (1-300). Default: 30", minimum: 1, maximum: 300 })),
});

export type FirecrawlInteractInput = Static<typeof FirecrawlInteractParamsSchema>;

const firecrawlInteractTool = defineTool({
  name: "firecrawl_interact",
  label: "Firecrawl Interact",
  description: [
    "Open a URL in a live Firecrawl browser session and drive it with a natural-language",
    "prompt (or code), returning the result. Keyless — no API key, no signup.",
    "Use firecrawl_interact when the local web_browse cannot run, or when you want",
    "natural-language page interaction without CSS selectors.",
    "Privacy: the URL, page content, and prompt are sent to Firecrawl's cloud.",
    `Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}; if truncated, full output is saved to a temp file.`,
  ].join(" "),
  promptSnippet: "Drive a page via Firecrawl keyless (natural-language interaction)",
  promptGuidelines: [
    "Prefer web_browse first; reach for firecrawl_interact when web_browse can't run or you want NL interaction.",
    "Write each prompt as a single, focused task; the session can be reused across calls.",
    "Always pass the full URL including https://.",
  ],
  parameters: FirecrawlInteractParamsSchema,

  async execute(_toolCallId, params, signal) {
    if (!params.prompt && !params.code) {
      throw new Error("firecrawl_interact requires either a prompt or code.");
    }
    const out = await interactKeyless(
      params.url,
      { prompt: params.prompt, code: params.code, language: params.language, timeout: params.timeout },
      signal,
    );

    if (!out.ok) {
      const reason = out.failure?.reason ?? "unknown error";
      throw new Error(`Firecrawl interact failed (${out.failure?.kind}): ${reason}`);
    }

    const rawText = `Interacted: ${params.url}\n(via Firecrawl keyless${out.creditsUsed !== undefined ? `, ${out.creditsUsed} credits` : ""})\n${out.liveViewUrl ? `Live view: ${out.liveViewUrl}\n` : ""}\n---\n\n${out.output || "(no output)"}`;
    const sink = await writeWithFallback(rawText, { tmpPrefix: "pi-firecrawl-interact-" });
    const preview = (out.output || "").replace(/\s+/g, " ").trim().slice(0, 500);

    return {
      content: [{ type: "text", text: sink.text }],
      details: {
        url: params.url,
        output: out.output,
        preview,
        fullOutputPath: sink.fullOutputPath,
        liveViewUrl: out.liveViewUrl,
        creditsUsed: out.creditsUsed,
        viaFirecrawl: true,
      },
    };
  },

  renderCall(args, theme) {
    let text = theme.fg("toolTitle", theme.bold("firecrawl_interact "));
    text += theme.fg("muted", args.url);
    return new Text(text, 0, 0);
  },

  renderResult(result, { expanded, isPartial }, theme, context) {
    const isError = context?.isError ?? false;

    if (isPartial) {
      const domain = details?.url ? getDomain(details.url) : "";
      const label = domain ? `Interacting with ${domain} via Firecrawl...` : "Interacting via Firecrawl...";
      return new Text(theme.fg("warning", label), 0, 0);
    }

    const details = result.details as {
      url?: string;
      output?: string;
      preview?: string;
      fullOutputPath?: string;
      liveViewUrl?: string;
      creditsUsed?: number;
    } | undefined;

    if (isError) {
      const errText = getErrorText(result);
      let text = theme.fg("error", "✗ Firecrawl interact failed");
      if (details?.url) text += `  ${theme.fg("dim", abbreviateUrl(details.url))}`;
      text += `\n\n  ${theme.fg("toolOutput", errText)}`;
      return new Text(text, 0, 0);
    }

    let text = theme.fg("success", "✓ Interacted");
    text += theme.fg("accent", " [Firecrawl keyless]");
    if (details?.url) text += `  ${theme.fg("dim", abbreviateUrl(details.url))}`;
    if (details?.creditsUsed !== undefined) text += theme.fg("muted", ` ${details.creditsUsed} credits`);

    if (!expanded && details?.preview) {
      const snippet = normalizeWhitespace(details.preview);
      const short = snippet.length > 160 ? snippet.slice(0, 160).replace(/\s+\S*$/, "") + "..." : snippet;
      text += `\n\n  ${theme.fg("muted", short)}`;
    }

    if (expanded) {
      if (details?.output) {
        text += `\n\n  ${theme.fg("muted", normalizeWhitespace(details.output))}`;
      }
      if (details?.fullOutputPath) {
        text += `\n\n${theme.fg("accent", `Full output: ${details.fullOutputPath}`)}`;
      }
    }

    return new Text(text, 0, 0);
  },
});

export default function (pi: ExtensionAPI) {
  pi.registerTool(firecrawlInteractTool);
}
