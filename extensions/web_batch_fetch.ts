/**
 * Web Batch Fetch Extension — Concurrent multi-page fetching
 *
 * Provides a `web_batch_fetch` tool that fetches multiple URLs in parallel
 * and returns their content as a single aggregated result.
 *
 * Use web_batch_fetch when the agent needs to read 2–5 pages at once
 * (e.g., after web_search returns multiple relevant results).
 *
 * For a single page, use `web_fetch` instead — it has finer control
 * (stealthy mode, per-URL selectors) and is simpler.
 */

import {
  defineTool,
  type ExtensionAPI,
  truncateHead,
  formatSize,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type, type Static } from "typebox";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { runScraplingWithFallback } from "./utils/scrapling";

interface FetchTask {
  url: string;
  tmpFile: string;
}

async function fetchOne(
  task: FetchTask,
  selector: string | undefined,
  stealthy: boolean,
  signal?: AbortSignal,
): Promise<{ url: string; content: string; size: number; ok: boolean; error?: string }> {
  const { ok: fetchOk, stderr } = await runScraplingWithFallback(
    task.url,
    task.tmpFile,
    { selector, stealthy },
    signal,
  );

  if (!fetchOk) {
    return { url: task.url, content: "", size: 0, ok: false, error: stderr };
  }

  try {
    const content = await fs.promises.readFile(task.tmpFile, "utf-8");
    const stats = await fs.promises.stat(task.tmpFile);
    return { url: task.url, content, size: stats.size, ok: true };
  } catch (err: any) {
    return { url: task.url, content: "", size: 0, ok: false, error: err.message };
  }
}

async function mapWithConcurrencyLimit<TIn, TOut>(
  items: TIn[],
  concurrency: number,
  fn: (item: TIn, index: number) => Promise<TOut>,
): Promise<TOut[]> {
  if (items.length === 0) return [];
  const limit = Math.max(1, Math.min(concurrency, items.length));
  const results: TOut[] = new Array(items.length);
  let nextIndex = 0;

  const workers = new Array(limit).fill(null).map(async () => {
    while (true) {
      const current = nextIndex++;
      if (current >= items.length) return;
      results[current] = await fn(items[current], current);
    }
  });

  await Promise.all(workers);
  return results;
}

export const WebBatchFetchParamsSchema = Type.Object({
  urls: Type.Array(Type.String(), {
    description: "List of URLs to fetch (2–5 recommended)",
    minItems: 1,
    maxItems: 10,
  }),
  selector: Type.Optional(Type.String({
    description: "CSS selector applied to ALL pages to extract only relevant content",
  })),
  stealthy: Type.Optional(Type.Boolean({
    description: "Use stealthy mode for all requests. Default: false",
    default: false,
  })),
  max_concurrency: Type.Optional(Type.Integer({
    description: "Max parallel fetches (1–5). Default: 3",
    minimum: 1,
    maximum: 5,
    default: 3,
  })),
});

export type WebBatchFetchInput = Static<typeof WebBatchFetchParamsSchema>;

const webBatchFetchTool = defineTool({
  name: "web_batch_fetch",
  label: "Web Batch Fetch",
  description: [
    "Fetch multiple web pages in parallel and return their content aggregated.",
    "Use web_batch_fetch AFTER web_search when there are 2–5 relevant results",
    "that the agent wants to read simultaneously for comparison or synthesis.",
    "For a single page, use web_fetch instead.",
    `Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}; if truncated, full output is saved to a temp file.`,
  ].join(" "),
  promptSnippet: "Fetch multiple URLs in parallel for research",
  promptGuidelines: [
    "Use web_batch_fetch when web_search returns multiple (2–5) relevant pages and the agent needs to read them all.",
    "Use web_batch_fetch for cross-referencing sources, comparing implementations, or synthesizing research from multiple sites.",
    "For a single URL, always use web_fetch — it supports per-URL selectors and stealthy mode.",
    "If a page in the batch fails, the tool reports the error but continues with the others.",
    "Keep batch sizes small (≤5) to avoid overwhelming the browser and token budget.",
  ],
  parameters: WebBatchFetchParamsSchema,

  async execute(_toolCallId, params, signal, onUpdate) {
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pi-batch-"));
    const tasks: FetchTask[] = params.urls.map((url, i) => ({
      url,
      tmpFile: path.join(tmpDir, `page-${i}.md`),
    }));
    let fullOutputPath: string | undefined;

    try {
      const concurrency = Math.floor(Math.min(5, Math.max(1, params.max_concurrency ?? 3)));
      onUpdate?.({ content: [{ type: "text", text: `Fetching ${tasks.length} pages with concurrency ${concurrency}...` }], details: {} });

      const results = await mapWithConcurrencyLimit(
        tasks,
        concurrency,
        (task, index) => {
          onUpdate?.({ content: [{ type: "text", text: `Fetching ${task.url} (${index + 1}/${tasks.length})...` }], details: {} });
          return fetchOne(task, params.selector, params.stealthy ?? false, signal);
        },
      );

      const successCount = results.filter((r) => r.ok).length;
      const lines: string[] = [
        `Batch fetch: ${successCount}/${results.length} succeeded`,
        "",
      ];

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        lines.push(`--- Page ${i + 1}: ${r.url} ---`);
        if (r.ok) {
          lines.push(`Size: ${r.size} bytes`);
          lines.push("");
          lines.push(r.content);
        } else {
          lines.push(`ERROR: ${r.error || "unknown error"}`);
        }
        lines.push("");
      }

      const rawText = lines.join("\n");
      const truncation = truncateHead(rawText, {
        maxLines: DEFAULT_MAX_LINES,
        maxBytes: DEFAULT_MAX_BYTES,
      });

      let finalText = truncation.content;
      if (truncation.truncated) {
        const fullOutputDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pi-web-batch-"));
        fullOutputPath = path.join(fullOutputDir, "output.txt");
        await fs.promises.writeFile(fullOutputPath, rawText, "utf-8");
        finalText += `\n\n[Output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}). Full output saved to: ${fullOutputPath}]`;
      }

      onUpdate?.({ content: [{ type: "text", text: `Batch complete: ${successCount}/${results.length} succeeded` }], details: {} });
      return {
        content: [{ type: "text", text: finalText }],
        details: {
          urls: params.urls,
          succeeded: successCount,
          failed: results.length - successCount,
          results: results.map((r) => ({ url: r.url, ok: r.ok, size: r.size })),
          fullOutputPath,
        },
      };
    } catch (err: any) {
      throw new Error(`Batch fetch failed: ${err.message ?? err}`);
    } finally {
      // Cleanup tmp files
      try {
        for (const task of tasks) {
          try { fs.unlinkSync(task.tmpFile); } catch { /* ignore */ }
        }
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch { /* ignore */ }
    }
  },

  renderCall(args, theme) {
    let text = theme.fg("toolTitle", theme.bold("web_batch_fetch "));
    text += theme.fg("muted", `${args.urls?.length ?? 0} URLs`);
    if (args.selector) {
      text += theme.fg("dim", ` selector=${args.selector}`);
    }
    return new Text(text, 0, 0);
  },

  renderResult(result, { expanded, isPartial }, theme) {
    if (isPartial) {
      return new Text(theme.fg("warning", "Batch fetching..."), 0, 0);
    }
    const details = result.details as {
      succeeded?: number;
      failed?: number;
      urls?: string[];
      results?: Array<{ url: string; ok: boolean; size?: number }>;
      fullOutputPath?: string;
    } | undefined;
    const total = details?.urls?.length ?? 0;
    const ok = details?.succeeded ?? 0;
    let text = theme.fg("success", `✓ ${ok}/${total} fetched`);
    if (details?.failed) {
      text += theme.fg("error", ` (${details.failed} failed)`);
    }
    if (expanded && details?.results) {
      for (const r of details.results) {
        text += `\n  ${r.ok ? theme.fg("success", "✓") : theme.fg("error", "✗")} ${theme.fg("dim", r.url)}`;
        if (r.size) {
          text += theme.fg("muted", ` ${formatSize(r.size)}`);
        }
      }
    }
    if (expanded && details?.fullOutputPath) {
      text += `\n${theme.fg("dim", `Full output: ${details.fullOutputPath}`)}`;
    }
    return new Text(text, 0, 0);
  },
});

export default function (pi: ExtensionAPI) {
  pi.registerTool(webBatchFetchTool);
}
