/**
 * Output sink — truncation + temp-file fallback
 *
 * Centralises the output handling policy for all tools:
 * - Truncate to line/byte budgets
 * - Write full output to a temp file when truncated
 * - Return display text + optional temp-file path
 */

import { mkdtemp, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

// Mirrors pi-coding-agent's tool-output defaults while keeping this utility
// importable from CommonJS-based regression tests.
export const DEFAULT_MAX_LINES = 2000;
export const DEFAULT_MAX_BYTES = 50 * 1024;

type TruncationLimit = "lines" | "bytes" | null;

interface TruncationResult {
  content: string;
  truncated: boolean;
  truncatedBy: TruncationLimit;
  totalLines: number;
  totalBytes: number;
  outputLines: number;
  outputBytes: number;
  firstLineExceedsLimit: boolean;
}

function splitLinesForCounting(content: string): string[] {
  if (content.length === 0) return [];
  const lines = content.split("\n");
  if (content.endsWith("\n")) lines.pop();
  return lines;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function truncateHead(
  content: string,
  options: { maxLines?: number; maxBytes?: number } = {},
): TruncationResult {
  const maxLines = options.maxLines ?? DEFAULT_MAX_LINES;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  const totalBytes = Buffer.byteLength(content, "utf-8");
  const lines = splitLinesForCounting(content);
  const totalLines = lines.length;

  if (totalLines <= maxLines && totalBytes <= maxBytes) {
    return {
      content,
      truncated: false,
      truncatedBy: null,
      totalLines,
      totalBytes,
      outputLines: totalLines,
      outputBytes: totalBytes,
      firstLineExceedsLimit: false,
    };
  }

  const firstLineBytes = Buffer.byteLength(lines[0] ?? "", "utf-8");
  if (firstLineBytes > maxBytes) {
    return {
      content: "",
      truncated: true,
      truncatedBy: "bytes",
      totalLines,
      totalBytes,
      outputLines: 0,
      outputBytes: 0,
      firstLineExceedsLimit: true,
    };
  }

  const outputLinesArr: string[] = [];
  let outputBytesCount = 0;
  let truncatedBy: "lines" | "bytes" = "lines";

  for (let i = 0; i < lines.length && i < maxLines; i++) {
    const line = lines[i];
    const lineBytes = Buffer.byteLength(line, "utf-8") + (i > 0 ? 1 : 0);

    if (outputBytesCount + lineBytes > maxBytes) {
      truncatedBy = "bytes";
      break;
    }

    outputLinesArr.push(line);
    outputBytesCount += lineBytes;
  }

  if (outputLinesArr.length >= maxLines && outputBytesCount <= maxBytes) {
    truncatedBy = "lines";
  }

  const outputContent = outputLinesArr.join("\n");
  const finalOutputBytes = Buffer.byteLength(outputContent, "utf-8");

  return {
    content: outputContent,
    truncated: true,
    truncatedBy,
    totalLines,
    totalBytes,
    outputLines: outputLinesArr.length,
    outputBytes: finalOutputBytes,
    firstLineExceedsLimit: false,
  };
}

export interface OutputSinkOptions {
  /** Temp directory prefix, e.g. "pi-web-search-" */
  tmpPrefix: string;
  /** Whether to always write the full output to a temp file, even when not truncated */
  alwaysWriteFile?: boolean;
  /** Override default max lines */
  maxLines?: number;
  /** Override default max bytes */
  maxBytes?: number;
}

export interface OutputSinkResult {
  /** Display text (possibly truncated) */
  text: string;
  /** Path to the full-output temp file, if one was written */
  fullOutputPath?: string;
}

/**
 * Process raw tool output through truncation policy.
 *
 * When truncated, writes the full raw text to a temp file and appends
 * a truncation notice with the file path.
 */
export async function writeWithFallback(
  rawText: string,
  options: OutputSinkOptions,
): Promise<OutputSinkResult> {
  const maxLines = options.maxLines ?? DEFAULT_MAX_LINES;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  const truncation = truncateHead(rawText, { maxLines, maxBytes });

  let fullOutputPath: string | undefined;

  if (truncation.truncated || options.alwaysWriteFile) {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), options.tmpPrefix));
    fullOutputPath = path.join(tmpDir, "output.txt");
    await writeFile(fullOutputPath, rawText, "utf-8");
  }

  let text = truncation.content;
  if (truncation.truncated) {
    text += `\n\n[Output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}). Full output saved to: ${fullOutputPath}]`;
  }

  return { text, fullOutputPath };
}
