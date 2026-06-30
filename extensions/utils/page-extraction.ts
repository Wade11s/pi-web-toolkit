/**
 * Page extraction — local Scrapling reads, page accounting, previews, and output fallback
 *
 * Provides a narrow interface for page-reading tools. Callers ask for a page
 * by URL and options; this module owns Scrapling invocation, temporary files,
 * byte accounting, preview generation, cleanup, and full-output fallback.
 */

import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { extractPreview } from "./content-preview";
import { writeWithFallback, type OutputSinkOptions, type OutputSinkResult } from "./output-sink";
import { runScraplingWithFallback } from "./scrapling";

export interface PageExtractionOptions {
  /** CSS selector to extract only a specific part of the page. */
  selector?: string;
  /** Use Scrapling stealthy mode. */
  stealthy?: boolean;
  /** Disable Scrapling's GET fallback after fetch/stealthy-fetch fails. */
  noGetFallback?: boolean;
  /** Maximum preview length. Default: 500 characters. */
  previewChars?: number;
}

export interface ExtractedPage {
  ok: true;
  url: string;
  content: string;
  bytes: number;
  preview: string;
}

export interface PageExtractionFailure {
  ok: false;
  url: string;
  error: string;
}

export type PageExtractionResult = ExtractedPage | PageExtractionFailure;

export interface ExtractedPageFromContentOptions {
  /** Byte count reported by the source, when already known. */
  bytes?: number;
  /** Maximum preview length. Default: 500 characters. */
  previewChars?: number;
}

function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Build the normalized page result for content that has already been read.
 * This keeps byte accounting and preview generation local to page extraction,
 * including non-Scrapling fallback sources.
 */
export function extractedPageFromContent(
  url: string,
  content: string,
  options: ExtractedPageFromContentOptions = {},
): ExtractedPage {
  return {
    ok: true,
    url,
    content,
    bytes: options.bytes ?? Buffer.byteLength(content),
    preview: extractPreview(content, options.previewChars ?? 500),
  };
}

/**
 * Extract one page via Scrapling.
 *
 * The temporary markdown file is private to this module and is removed before
 * returning. Scrapling non-zero exits are returned as local failures; process
 * spawning errors are allowed to propagate so existing tool failure behavior is
 * preserved for missing/broken CLI installations.
 */
export async function extractPage(
  url: string,
  options: PageExtractionOptions = {},
  signal?: AbortSignal,
): Promise<PageExtractionResult> {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "pi-page-extract-"));
  const tmpFile = path.join(tmpDir, "page.md");

  try {
    const result = await runScraplingWithFallback(
      url,
      tmpFile,
      {
        selector: options.selector,
        stealthy: options.stealthy,
        noGetFallback: options.noGetFallback,
      },
      signal,
    );

    if (!result.ok) {
      return {
        ok: false,
        url,
        error: result.stderr ?? "unknown scrapling error",
      };
    }

    try {
      const [content, stats] = await Promise.all([
        readFile(tmpFile, "utf-8"),
        stat(tmpFile),
      ]);
      return extractedPageFromContent(url, content, {
        bytes: stats.size,
        previewChars: options.previewChars,
      });
    } catch (err: unknown) {
      return {
        ok: false,
        url,
        error: errorText(err),
      };
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => { /* best-effort cleanup */ });
  }
}

/**
 * Apply the shared truncation policy to page-reading output.
 *
 * Keeping this wrapper here lets tools depend on page extraction for full-output
 * temp-file fallback instead of reaching directly into the generic sink.
 */
export function writePageExtractionOutput(
  rawText: string,
  options: OutputSinkOptions,
): Promise<OutputSinkResult> {
  return writeWithFallback(rawText, options);
}
