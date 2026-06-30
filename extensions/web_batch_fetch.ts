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
  formatSize,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type, type Static } from "typebox";
import { extractPage, writePageExtractionOutput } from "./utils/page-extraction";
import { abbreviateUrl, getErrorText, normalizeWhitespace } from "./utils/render-helpers";

interface FetchResult {
  url: string;
  content: string;
  size: number;
  ok: boolean;
  preview?: string;
  error?: string;
}

async function fetchOne(
  url: string,
  selector: string | undefined,
  stealthy: boolean,
  signal?: AbortSignal,
): Promise<FetchResult> {
  const result = await extractPage(url, { selector, stealthy, previewChars: 200 }, signal);

  if (!result.ok) {
    return { url, content: "", size: 0, ok: false, error: result.error };
  }

  return {
    url,
    content: result.content,
    size: result.bytes,
    ok: true,
    preview: result.preview,
  };
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
    description: "List of URLs to fetch (2–5 recommended, max 15)",
    minItems: 1,
    maxItems: 15,
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
    "Use web_batch_fetch for 2–5 relevant URLs, whether discovered by search or provided by the user.",
    "For a single page, use web_fetch instead.",
    `Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}; if truncated, full output is saved to a temp file.`,
  ].join(" "),
  promptSnippet: "Parallel fetch for 2–5 URLs",
  promptGuidelines: [
    "Use web_batch_fetch for 2–5 pages to compare/cross-reference/synthesize; single URL → web_fetch.",
    "Keep batches small (≤8; schema max 15); failed pages are reported without stopping the batch.",
  ],
  parameters: WebBatchFetchParamsSchema,

  async execute(_toolCallId, params, signal, onUpdate) {
    const concurrency = Math.floor(Math.min(5, Math.max(1, params.max_concurrency ?? 3)));

    // Progress tracking for live UI updates
    const progressItems = params.urls.map((url) => ({
      url,
      status: "fetching" as "fetching" | "done" | "error",
      size: 0,
      error: "",
    }));

    const sendProgress = () => {
      const completed = progressItems.filter((p) => p.status !== "fetching").length;
      const succeeded = progressItems.filter((p) => p.status === "done").length;
      const failed = progressItems.filter((p) => p.status === "error").length;
      onUpdate?.({
        content: [{ type: "text", text: `Fetching ${params.urls.length} pages (${completed}/${params.urls.length})...` }],
        details: {
          progress: {
            total: params.urls.length,
            completed,
            succeeded,
            failed,
            items: progressItems.map((p) => ({ ...p })),
          },
        },
      });
    };

    sendProgress();

    try {
      const results = await mapWithConcurrencyLimit(
        params.urls,
        concurrency,
        (url, index) => {
          return fetchOne(url, params.selector, params.stealthy ?? false, signal).then((res) => {
            progressItems[index].status = res.ok ? "done" : "error";
            progressItems[index].size = res.size;
            progressItems[index].error = res.error || "";
            sendProgress();
            return res;
          });
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
      const sink = await writePageExtractionOutput(rawText, {
        tmpPrefix: "pi-web-batch-",
      });

      return {
        content: [{ type: "text", text: sink.text }],
        details: {
          urls: params.urls,
          succeeded: successCount,
          failed: results.length - successCount,
          results: results.map((r) => ({
            url: r.url,
            ok: r.ok,
            size: r.size,
            preview: r.preview,
            error: r.error,
          })),
          fullOutputPath: sink.fullOutputPath,
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Batch fetch failed: ${message}`);
    }
  },

  renderCall(args, theme) {
    let text = theme.fg("toolTitle", theme.bold("web_batch_fetch "));
    text += theme.fg("muted", `${args.urls?.length ?? 0} URLs`);
    if (args.max_concurrency) {
      text += theme.fg("dim", ` concurrency=${args.max_concurrency}`);
    }
    if (args.selector) {
      text += theme.fg("dim", ` selector=${args.selector}`);
    }
    return new Text(text, 0, 0);
  },

  renderResult(result, { expanded, isPartial }, theme, context) {
    const isError = context?.isError ?? false;

    if (isPartial) {
      const progress = (result.details as any)?.progress;
      if (progress) {
        const { total, completed, succeeded, failed, items } = progress;
        const barWidth = 15;
        const filled = Math.round((completed / total) * barWidth);
        const bar = "█".repeat(filled) + "░".repeat(barWidth - filled);
        let text = `${theme.fg("warning", "Batch fetching")}  [${theme.fg("accent", bar.slice(0, filled))}${theme.fg("dim", bar.slice(filled))}]  ${theme.fg("muted", `${completed}/${total}`)}`;
        if (failed > 0) {
          text += ` ${theme.fg("error", `(${failed} failed)`)}`;
        }
        for (const item of items) {
          const icon = item.status === "done"
            ? theme.fg("success", "✓")
            : item.status === "error"
              ? theme.fg("error", "✗")
              : theme.fg("warning", "⏳");
          let line = `\n  ${icon} ${theme.fg("dim", abbreviateUrl(item.url, 50))}`;
          if (item.status === "done" && item.size > 0) {
            line += theme.fg("muted", ` ${formatSize(item.size)}`);
          } else if (item.status === "error" && item.error) {
            const err = item.error.slice(0, 80);
            line += theme.fg("dim", ` ${err}${item.error.length > 80 ? "..." : ""}`);
          } else if (item.status === "fetching") {
            line += theme.fg("muted", " fetching...");
          }
          text += line;
        }
        return new Text(text, 0, 0);
      }
      return new Text(theme.fg("warning", "Batch fetching..."), 0, 0);
    }

    const details = result.details as {
      succeeded?: number;
      failed?: number;
      urls?: string[];
      results?: Array<{ url: string; ok: boolean; size?: number; preview?: string; error?: string }>;
      fullOutputPath?: string;
    } | undefined;

    if (isError) {
      const errText = getErrorText(result);
      let text = theme.fg("error", "✗ Batch failed");
      if (details?.urls) {
        text += `  ${theme.fg("dim", `${details.urls.length} URLs`)}`;
      }
      text += `\n\n  ${theme.fg("toolOutput", errText)}`;
      return new Text(text, 0, 0);
    }

    const total = details?.urls?.length ?? 0;
    const ok = details?.succeeded ?? 0;
    const failed = details?.failed ?? 0;

    let text = theme.fg("success", `✓ ${ok}/${total} fetched`);
    if (failed > 0) {
      text += theme.fg("error", ` (${failed} failed)`);
    }

    if (!expanded) {
      const successes = (details?.results ?? []).filter((r) => r.ok);
      const top3 = successes.slice(0, 3);
      for (let i = 0; i < top3.length; i++) {
        const r = top3[i];
        text += `\n  [${i + 1}] ${theme.fg("toolTitle", abbreviateUrl(r.url, 40))} ${theme.fg("muted", `(${formatSize(r.size ?? 0)})`)}`;
        if (r.preview) {
          const snippet = normalizeWhitespace(r.preview);
          const short = snippet.length > 80 ? snippet.slice(0, 80).replace(/\s+\S*$/, "") + "..." : snippet;
          text += `\n    ${theme.fg("muted", short)}`;
        }
      }
      if (successes.length > 3) {
        text += `\n  ${theme.fg("muted", `... and ${successes.length - 3} more (Ctrl+O for full list)`)}`;
      }
    }

    if (expanded && details?.results) {
      const successes = details.results.filter((r) => r.ok);
      const failures = details.results.filter((r) => !r.ok);

      for (let i = 0; i < successes.length; i++) {
        const r = successes[i];
        text += `\n[${i + 1}] ${theme.fg("toolTitle", abbreviateUrl(r.url))} ${theme.fg("muted", `| ${formatSize(r.size ?? 0)}`)}`;
        if (r.preview) {
          text += `\n    ${theme.fg("muted", normalizeWhitespace(r.preview))}`;
        }
        text += "\n";
      }

      if (failures.length > 0) {
        text += `\n${theme.fg("error", "Failed:")}`;
        for (const r of failures) {
          text += `\n  ${theme.fg("error", "✗")} ${theme.fg("dim", r.url)} ${theme.fg("dim", r.error ?? "")}`;
        }
      }

      if (details?.fullOutputPath) {
        text += `\n\n${theme.fg("accent", `Full output: ${details.fullOutputPath}`)}`;
      }
    }

    return new Text(text, 0, 0);
  },
});

export default function (pi: ExtensionAPI) {
  pi.registerTool(webBatchFetchTool);
}
