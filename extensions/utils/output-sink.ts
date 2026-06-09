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
import {
  truncateHead,
  formatSize,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
} from "@earendil-works/pi-coding-agent";

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
