/**
 * Tool factory — separates execution from TUI rendering
 *
 * Provides a defineWebTool helper that wraps tool definitions with
 * consistent base behaviour, while letting each tool supply its own
 * execution logic and optional custom renderers.
 */

import { defineTool, formatSize } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

/**
 * Shared render utilities for custom renderResult implementations.
 */
export const RenderUtils = {
  /** Truncate preview text to maxLen, adding ellipsis. */
  truncatePreview(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "...";
  },

  /** Render the "Full output: path" line. */
  fullOutputLine(path: string | undefined, theme: any): string {
    return path ? `\n${theme.fg("accent", `Full output: ${path}`)}` : "";
  },

  /** Format a byte count using the shared formatter. */
  formatBytes(bytes: number): string {
    return formatSize(bytes);
  },
};

/**
 * Default renderCall implementation: shows tool name and first string argument.
 */
export function defaultRenderCall(name: string, args: Record<string, unknown>, theme: any): Text {
  let text = theme.fg("toolTitle", theme.bold(`${name} `));
  const firstString = Object.values(args).find((v) => typeof v === "string");
  if (firstString) {
    text += theme.fg("muted", firstString as string);
  }
  return new Text(text, 0, 0);
}

/**
 * Default renderResult implementation: shows success and full output path.
 */
export function defaultRenderResult(
  result: { content: Array<{ type: "text"; text: string }>; details?: unknown },
  state: { expanded: boolean; isPartial: boolean },
  theme: any,
): Text {
  if (state.isPartial) {
    return new Text(theme.fg("warning", "Running..."), 0, 0);
  }
  const details = result.details as { fullOutputPath?: string } | undefined;
  let text = theme.fg("success", "✓ Done");
  if (state.expanded && details?.fullOutputPath) {
    text += `\n${theme.fg("accent", `Full output: ${details.fullOutputPath}`)}`;
  }
  return new Text(text, 0, 0);
}

/**
 * Register a web tool with consistent base behaviour.
 *
 * This is a thin wrapper around defineTool that applies default
 * renderCall/renderResult when the tool does not supply its own.
 *
 * NOTE: The pi framework's TypeBox types make strict typing here difficult.
 * Callers should rely on type inference at the call site.
 */
export function defineWebTool(def: any) {
  return defineTool({
    ...def,
    renderCall: def.renderCall ?? ((args: any, theme: any) => defaultRenderCall(def.name, args, theme)),
    renderResult: def.renderResult ?? ((result: any, state: any, theme: any) => defaultRenderResult(result, state, theme)),
  });
}
