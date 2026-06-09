/**
 * Content preview extraction — structural markdown analysis
 *
 * Extracts readable preview snippets from markdown content by analyzing
 * document structure rather than character-level heuristics.
 *
 * Used by web_fetch and web_batch_fetch to show concise page previews.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BlockType = "heading" | "paragraph" | "list" | "table" | "code" | "rule";

type BlockTag = "content" | "toc" | "navigation" | "metadata" | "table_data" | "unknown";

interface MarkdownBlock {
  type: BlockType;
  raw: string;
  text: string;        // stripped of markdown syntax
  level?: number;      // heading level
  lineStart: number;
}

// ---------------------------------------------------------------------------
// Markdown block parser
// ---------------------------------------------------------------------------

function parseBlocks(md: string): MarkdownBlock[] {
  const lines = md.split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (trimmed === "") {
      i++;
      continue;
    }

    // Code block
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      const fence = trimmed.slice(0, 3);
      const start = i;
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) i++;
      const raw = lines.slice(start, i + 1).join("\n");
      blocks.push({ type: "code", raw, text: raw, lineStart: start });
      i++;
      continue;
    }

    // Table
    if (trimmed.startsWith("|")) {
      const start = i;
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const raw = tableLines.join("\n");
      blocks.push({ type: "table", raw, text: stripTable(raw), lineStart: start });
      continue;
    }

    // Heading (ATX style)
    const atxMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (atxMatch) {
      blocks.push({
        type: "heading",
        raw: line,
        text: atxMatch[2].trim(),
        level: atxMatch[1].length,
        lineStart: i,
      });
      i++;
      continue;
    }

    // Heading (Setext style)
    if (i + 1 < lines.length) {
      const nextTrimmed = lines[i + 1].trim();
      if (/^=+$/.test(nextTrimmed) || /^-+$/.test(nextTrimmed)) {
        const level = nextTrimmed[0] === "=" ? 1 : 2;
        blocks.push({
          type: "heading",
          raw: lines.slice(i, i + 2).join("\n"),
          text: trimmed,
          level,
          lineStart: i,
        });
        i += 2;
        continue;
      }
    }

    // Horizontal rule
    if (/^(---|___|\*\*\*|- - -)$/.test(trimmed)) {
      blocks.push({ type: "rule", raw: line, text: "", lineStart: i });
      i++;
      continue;
    }

    // List item
    if (/^\s*[-*+]\s/.test(trimmed) || /^\s*\d+\.\s/.test(trimmed)) {
      const start = i;
      const listLines: string[] = [lines[i]];
      i++;
      // Continue if next lines are indented or empty (within list)
      while (i < lines.length) {
        const nextLine = lines[i];
        if (nextLine.trim() === "") {
          listLines.push(nextLine);
          i++;
          continue;
        }
        if (/^\s*[-*+]\s/.test(nextLine) || /^\s*\d+\.\s/.test(nextLine)) {
          listLines.push(nextLine);
          i++;
          continue;
        }
        // Continuation line (indented relative to first item)
        if (nextLine.startsWith(" ")) {
          listLines.push(nextLine);
          i++;
          continue;
        }
        break;
      }
      const raw = listLines.join("\n");
      blocks.push({ type: "list", raw, text: stripMarkdown(raw), lineStart: start });
      continue;
    }

    // Paragraph (default)
    const start = i;
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "") {
      // Stop if we hit a structural element
      const t = lines[i].trim();
      if (/^#{1,6}\s/.test(t) || t.startsWith("```") || t.startsWith("~~~") ||
          t.startsWith("|") || /^\s*[-*+]\s/.test(t) || /^\s*\d+\.\s/.test(t) ||
          /^(---|___|\*\*\*|- - -)$/.test(t)) break;
      paraLines.push(lines[i]);
      i++;
    }
    const raw = paraLines.join("\n");
    blocks.push({ type: "paragraph", raw, text: stripMarkdown(raw), lineStart: start });
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Markdown stripping helpers
// ---------------------------------------------------------------------------

function stripTable(tableMd: string): string {
  const lines = tableMd.split("\n");
  const rows: Array<{ text: string; rawLinkCount: number }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;

    // Count links on raw markdown before stripping
    const rawLinkCount = (trimmed.match(/\[|\]\(/g) || []).length;

    // Split by |, removing first and last empty elements
    const allCells = trimmed.split("|").slice(1, -1).map((c) => c.trim());

    // Split cells into sub-rows wherever we find a pure separator cell.
    // This handles both normal tables (separators on their own line)
    // and condensed tables like HN (separators inline).
    let currentRow: string[] = [];
    for (const cell of allCells) {
      if (/^[-:]+$/.test(cell)) {
        // Flush current row if it has content
        if (currentRow.length > 0) {
          const rowText = currentRow.map((c) => stripMarkdown(c)).join(" ").trim().replace(/\s+/g, " ");
          if (rowText.length > 0 && !/^[-\s|]+$/.test(rowText)) {
            rows.push({ text: rowText, rawLinkCount });
          }
          currentRow = [];
        }
      } else if (cell.length > 0) {
        currentRow.push(cell);
      }
    }
    // Flush final row
    if (currentRow.length > 0) {
      const rowText = currentRow.map((c) => stripMarkdown(c)).join(" ").trim().replace(/\s+/g, " ");
      if (rowText.length > 0 && !/^[-\s|]+$/.test(rowText)) {
        rows.push({ text: rowText, rawLinkCount });
      }
    }
  }

  // Filter out navigation rows (HN-style header bars, short-link nav)
  return rows
    .filter((r) => {
      const rWords = r.text.split(/\s+/).filter((w) => w.length > 0);
      return !(rWords.length <= 12 && r.rawLinkCount >= 4);
    })
    .map((r) => r.text)
    .join("\n");
}

export function stripMarkdown(md: string): string {
  // Add spaces between adjacent markdown elements to prevent concatenation
  const spaced = md
    .replace(/\]\[/g, "] [")      // adjacent links
    .replace(/\*\*\[/g, "** [")   // bold then link
    .replace(/\]\*\*/g, "] **");  // link then bold

  return spaced
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*>\s*/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Block classification
// ---------------------------------------------------------------------------

function classifyBlock(block: MarkdownBlock, neighbors: MarkdownBlock[]): BlockTag {
  if (block.type === "code" || block.type === "rule") return "unknown";

  const t = block.text;
  const words = t.split(/\s+/).filter((w) => w.length > 0);

  // Wikipedia-style edit links
  if (/\[edit\]/i.test(block.raw) || /\bEdit\b/i.test(t)) return "metadata";

  // TOC detection: common heading labels across languages
  if (block.type === "heading" &&
      /^(Contents|Table of contents|目次|目录|Inhaltsverzeichnis|Sommaire|Contenido|Содержание|Indice|Conteúdo|목차|İçindekiler)$/i.test(t)) {
    return "toc";
  }

  // List classification
  if (block.type === "list") {
    const items = block.raw.split("\n").filter((l) => /^\s*[-*+]\s/.test(l) || /^\s*\d+\.\s/.test(l));

    // Detect form dropdowns rendered as list items (e.g. "- select -Afghanistan...")
    const listText = block.text;
    if (/select\s+-/i.test(listText) || /choose\s+/i.test(listText)) return "navigation";
    const titleCaseMatches = listText.match(/[A-Z][a-z]+/g) || [];
    const listWords = listText.split(/\s+/).filter((w) => w.length > 0);
    const titleCaseRatio = titleCaseMatches.length / Math.max(listWords.length, 1);
    if (titleCaseMatches.length > 50 && (listWords.length < 200 || titleCaseRatio > 1.5)) {
      return "navigation";
    }

    // All items are short links → TOC or navigation
    const allShortLinks = items.every((item) => {
      const stripped = stripMarkdown(item);
      return stripped.length < 40 && /\[/.test(item);
    });
    if (allShortLinks && items.length > 2) return "toc";

    // Language links pattern: [Lang](https://xx.wikipedia.org/...)
    const langLinks = items.filter((item) =>
      /https?:\/\/[a-z]{2}(-[a-z]+)?\.\w+/.test(item),
    );
    if (langLinks.length > 3) return "navigation";

    // Mixed list with some links → could be content or navigation
    const linkRatio = items.filter((i) => /\[/.test(i)).length / Math.max(items.length, 1);
    if (linkRatio > 0.8 && items.length > 5) return "navigation";
  }

  // Table classification
  if (block.type === "table") {
    const rows = block.text.split("\n").filter((r) => r.trim().length > 0);
    if (rows.length === 0) return "unknown";

    // Check if most rows are short-link navigation
    const navRows = rows.filter((r) => {
      const words = r.split(/\s+/).filter((w) => w.length > 0);
      const linkCount = (r.match(/\[|\]\(/g) || []).length;
      return words.length <= 12 && linkCount >= 2;
    });
    if (navRows.length / rows.length > 0.7) return "navigation";

    return "table_data";
  }

  // Paragraph after TOC heading or in nav cluster
  if (block.type === "paragraph") {
    // Very short → likely not content
    if (t.length < 30) return "unknown";

    // Check if surrounded by navigation
    const nearbyNav = neighbors.filter((n) =>
      n.lineStart >= block.lineStart - 10 && n.lineStart <= block.lineStart + 10 &&
      (n.type === "list" || n.type === "heading"),
    );
    const navRatio = nearbyNav.length / Math.max(nearbyNav.length, 1);
    // CJK text has no spaces — use character length instead of word count
    const isCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(t);
    const navThreshold = isCJK ? 40 : 15;
    if (navRatio > 0.5 && (isCJK ? t.length < navThreshold : words.length < navThreshold)) return "navigation";
  }

  // Form / dropdown detection: concatenated option lists
  if (block.type === "paragraph") {
    // Detect select dropdowns rendered as text
    if (/^-?\s*select\s+-/i.test(t) || /^-?\s*choose\s+/i.test(t)) return "navigation";

    // Detect dense concatenated lists (AfghanistanAkrotiriAlbania...)
    // Uses global regex to find Title Case patterns even without spaces
    const titleCaseMatches = t.match(/[A-Z][a-z]+/g) || [];
    const titleCaseRatio = titleCaseMatches.length / Math.max(words.length, 1);
    if (titleCaseMatches.length > 50 && (words.length < 200 || titleCaseRatio > 1.5)) {
      return "navigation";
    }
  }

  // Default: if it looks like real text with sentences
  // CJK text has no spaces — use character count instead of word count
  const hasCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(t);
  const effectiveWords = hasCJK ? t.length : words.length;
  const wordThreshold = hasCJK ? 30 : 10;

  if (block.type === "paragraph" && /[.!?。！？]/.test(t) && effectiveWords > wordThreshold) {
    // But not if it's mostly Title Case (dropdown options, form labels)
    const titleCaseWords = words.filter((w) =>
      /^[A-Z][a-z]+$/.test(w) && w.length > 2
    );
    if (titleCaseWords.length / Math.max(words.length, 1) > 0.6) return "navigation";
    return "content";
  }

  return "unknown";
}

// ---------------------------------------------------------------------------
// Preview extraction
// ---------------------------------------------------------------------------

interface ScoredBlock {
  block: MarkdownBlock;
  tag: BlockTag;
  score: number;
}

function scoreBlocks(blocks: MarkdownBlock[]): ScoredBlock[] {
  const scored: ScoredBlock[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const neighbors = blocks.slice(Math.max(0, i - 3), Math.min(blocks.length, i + 4));
    const tag = classifyBlock(block, neighbors);

    let score = 0;

    switch (tag) {
      case "content":
        score = 100;
        // Bonus for length (but not too long)
        score += Math.min(block.text.length / 20, 30);
        // Bonus for being after a heading
        if (i > 0 && blocks[i - 1].type === "heading") score += 20;
        break;

      case "table_data": {
        // For table-heavy pages (e.g. HN), score based on content row density
        const rows = block.text.split("\n").filter((r) => r.trim().length > 0);
        const contentRows = rows.filter((r) => {
          const rWords = r.split(/\s+/).filter((w) => w.length > 0);
          const linkCount = (r.match(/\[|\]\(/g) || []).length;
          // Filter out short-link navigation rows (HN header, nav bars)
          return !(rWords.length <= 8 && linkCount >= 2);
        });
        score = Math.min(contentRows.length * 5, 80);
        break;
      }

      case "toc":
      case "navigation":
      case "metadata":
        score = -100;
        break;

      case "unknown":
      default: {
        // Unknown paragraphs: score by text quality
        if (block.type === "paragraph") {
          if (block.text.length > 80 && /[.!?。！？]/.test(block.text)) {
            score = 50;
          } else if (block.text.length > 40) {
            score = 20;
          }
        }
        // Unknown lists: short lists with some substance
        if (block.type === "list" && block.text.length > 60) {
          score = 30;
        }
        break;
      }
    }

    // Penalize blocks near the very top (usually nav)
    if (block.lineStart < 5) score -= 30;

    // Penalize blocks that look like cookie banners or alerts
    if (/cookie|consent|privacy policy|terms of use/i.test(block.text)) {
      score -= 50;
    }

    scored.push({ block, tag, score });
  }

  return scored;
}

function buildPreview(blocks: MarkdownBlock[], maxLen: number): string {
  const scored = scoreBlocks(blocks);
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score <= 0) {
    // Fallback: join all non-nav, non-toc text
    const navTags = new Set(["toc", "navigation", "metadata"]);
    const allText = blocks
      .filter((b) => b.type !== "code" && b.type !== "rule")
      .map((b) => {
        const s = scored.find((sc) => sc.block === b);
        return s && navTags.has(s.tag) ? "" : b.text;
      })
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return allText.slice(0, maxLen);
  }

  // Build preview from best block, with context
  const idx = blocks.indexOf(best.block);
  const parts: string[] = [];
  let remaining = maxLen;

  // Start with best block
  const bestText = best.block.text.trim();
  if (bestText.length <= remaining) {
    parts.push(bestText);
    remaining -= bestText.length;
  } else {
    return bestText.slice(0, maxLen).replace(/\s+\S*$/, "") + "...";
  }

  // Try adjacent content blocks
  for (const offset of [-1, 1, -2, 2]) {
    const neighbor = blocks[idx + offset];
    if (!neighbor || remaining < 20) break;
    const neighborScore = scored.find((s) => s.block === neighbor);
    if (!neighborScore || neighborScore.score < 20) continue;

    const text = neighbor.text.trim();
    if (text.length <= remaining - 2) {
      parts.push(text);
      remaining -= text.length + 2;
    }
  }

  return parts.join("\n\n").slice(0, maxLen);
}

/**
 * Extract a plain-text preview from markdown content.
 *
 * Uses structural analysis:
 * - Parses markdown into semantic blocks (headings, paragraphs, lists, tables)
 * - Classifies blocks as content, TOC, navigation, or metadata
 * - Scores content blocks by quality signals (length, sentence structure, position)
 * - Returns the best preview, with context from adjacent good blocks
 */
export function extractPreview(content: string, maxLen: number = 500): string {
  const blocks = parseBlocks(content);
  if (blocks.length === 0) return "";
  return buildPreview(blocks, maxLen);
}
