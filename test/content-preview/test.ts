/**
 * Content preview test suite with snapshot regression
 *
 * Fetches diverse page types and runs extractPreview against each.
 * Results are compared against baselines/ to detect regressions.
 *
 * Usage:
 *   npx tsx test/content-preview/test.ts          # run tests
 *   npx tsx test/content-preview/test.ts --approve # update baselines
 */

import { extractPreview } from "../../extensions/utils/content-preview";
import * as fs from "node:fs";
import * as path from "node:path";

const IS_APPROVE = process.argv.includes("--approve");

interface TestCase {
  name: string;
  url: string;
  description: string;
  expectedBehavior: string;
}

const TEST_CASES: TestCase[] = [
  {
    name: "wikipedia-article",
    url: "https://en.wikipedia.org/wiki/Web_scraping",
    description: "Wikipedia article with heavy nav/sidebar noise",
    expectedBehavior: "Extracts body paragraph, skips TOC and language links",
  },
  {
    name: "simple-page",
    url: "https://example.com",
    description: "Minimal page with one paragraph",
    expectedBehavior: "Returns the single paragraph",
  },
  {
    name: "hacker-news-feed",
    url: "https://news.ycombinator.com",
    description: "Table-based link aggregator",
    expectedBehavior: "Extracts story titles, skips nav table noise",
  },
  {
    name: "news-article",
    url: "https://www.bbc.com/news/articles/czeyx8ewn98o",
    description: "BBC news article",
    expectedBehavior: "Extracts article lead paragraph",
  },
  {
    name: "tech-blog",
    url: "https://blog.mozilla.org/en/products/firefox/",
    description: "Mozilla blog listing page",
    expectedBehavior: "Extracts blog post previews",
  },
  {
    name: "github-repo",
    url: "https://github.com/microsoft/TypeScript",
    description: "GitHub repository README",
    expectedBehavior: "Extracts project description",
  },
  {
    name: "documentation",
    url: "https://docs.python.org/3/tutorial/index.html",
    description: "Python documentation tutorial",
    expectedBehavior: "Extracts tutorial overview",
  },
  {
    name: "forum-discussion",
    url: "https://stackoverflow.com/questions/11227809/why-is-processing-a-sorted-array-faster-than-processing-an-unsorted-array",
    description: "Stack Overflow Q&A page",
    expectedBehavior: "Extracts question body, skips sidebar",
  },
  {
    name: "chinese-content",
    url: "https://zh.wikipedia.org/wiki/%E7%BD%91%E9%A1%B5%E6%8A%93%E5%8F%96",
    description: "Chinese Wikipedia article",
    expectedBehavior: "Extracts Chinese body text",
  },
  {
    name: "japanese-content",
    url: "https://ja.wikipedia.org/wiki/%E3%82%A6%E3%82%A7%E3%83%96%E3%82%B9%E3%82%AF%E3%83%AC%E3%82%A4%E3%83%94%E3%83%B3%E3%82%B0",
    description: "Japanese Wikipedia article",
    expectedBehavior: "Extracts Japanese body text",
  },
  {
    name: "product-page",
    url: "https://www.apple.com/iphone/",
    description: "Apple product marketing page",
    expectedBehavior: "Extracts product description text",
  },
  {
    name: "reddit-post",
    url: "https://www.reddit.com/r/programming/comments/1h1a2b3/what_are_your_favorite_developer_tools/",
    description: "Reddit discussion thread",
    expectedBehavior: "Extracts post body, skips comment noise",
  },
];

const FIXTURES_DIR = path.join(__dirname, "fixtures");
const SNAPSHOTS_DIR = path.join(__dirname, "snapshots");
const BASELINES_DIR = path.join(__dirname, "baselines");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function runScrapling(url: string, outputFile: string): Promise<boolean> {
  const { spawn } = require("node:child_process");
  return new Promise((resolve) => {
    const proc = spawn(
      "scrapling",
      ["extract", "fetch", url, outputFile, "--ai-targeted"],
      { shell: false, stdio: ["ignore", "pipe", "pipe"] }
    );
    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.on("close", (code: number | null) => {
      if (code !== 0) {
        console.error(`  scrapling failed (exit ${code}): ${stderr.slice(0, 200)}`);
        resolve(false);
      } else {
        resolve(true);
      }
    });
    proc.on("error", (err: Error) => {
      console.error(`  scrapling error: ${err.message}`);
      resolve(false);
    });
  });
}

async function runTest(tc: TestCase): Promise<{ ok: boolean; preview: string; length: number; error?: string }> {
  const fixturePath = path.join(FIXTURES_DIR, `${tc.name}.md`);

  if (!fs.existsSync(fixturePath)) {
    console.log(`  Fetching ${tc.url}...`);
    const ok = await runScrapling(tc.url, fixturePath);
    if (!ok) return { ok: false, preview: "", length: 0, error: "fetch failed" };
  } else {
    console.log(`  Using cached fixture`);
  }

  const content = fs.readFileSync(fixturePath, "utf-8");

  if (content.length === 0) {
    return { ok: false, preview: "", length: 0, error: "empty content" };
  }

  const preview = extractPreview(content, 500);
  return { ok: true, preview, length: preview.length };
}

/* ------------------------------------------------------------------ */
/*  Regression helpers                                                */
/* ------------------------------------------------------------------ */

type RegressionResult =
  | { type: "pass" }
  | { type: "new" }
  | { type: "fail"; diff: string };

function compareToBaseline(name: string, preview: string): RegressionResult {
  const baselinePath = path.join(BASELINES_DIR, `${name}.txt`);
  if (!fs.existsSync(baselinePath)) return { type: "new" };

  const baseline = fs.readFileSync(baselinePath, "utf-8");
  if (baseline === preview) return { type: "pass" };

  const diff = computeDiff(baseline, preview);
  return { type: "fail", diff };
}

/**
 * Simple line-level diff with 2 lines of context around each change.
 */
function computeDiff(baseline: string, snapshot: string): string {
  const a = baseline.split("\n");
  const b = snapshot.split("\n");
  const out: string[] = [];

  const max = Math.max(a.length, b.length);
  let inHunk = false;
  const CONTEXT = 2;

  for (let i = 0; i < max; i++) {
    const same = (a[i] ?? "") === (b[i] ?? "");
    if (!same) {
      if (!inHunk) {
        // print context before
        for (let k = Math.max(0, i - CONTEXT); k < i; k++) {
          out.push(`   ${String(k + 1).padStart(3)} │ ${a[k] ?? ""}`);
        }
        inHunk = true;
      }
      if (a[i] !== undefined) out.push(` - ${String(i + 1).padStart(3)} │ ${a[i]}`);
      if (b[i] !== undefined) out.push(` + ${String(i + 1).padStart(3)} │ ${b[i]}`);
    } else {
      if (inHunk) {
        // print context after
        for (let k = i; k < Math.min(max, i + CONTEXT); k++) {
          out.push(`   ${String(k + 1).padStart(3)} │ ${a[k] ?? ""}`);
        }
        out.push("");
        inHunk = false;
      }
    }
  }

  if (out.length === 0) return "(text differs but no line-level changes detected)";
  return out.join("\n");
}

function approveAll(): void {
  ensureDir(BASELINES_DIR);
  const files = fs.readdirSync(SNAPSHOTS_DIR).filter((f) => f.endsWith(".txt"));
  for (const file of files) {
    fs.copyFileSync(path.join(SNAPSHOTS_DIR, file), path.join(BASELINES_DIR, file));
  }
  console.log(`Approved ${files.length} baselines in ${BASELINES_DIR}`);
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

async function main() {
  ensureDir(FIXTURES_DIR);
  ensureDir(SNAPSHOTS_DIR);

  if (IS_APPROVE) {
    approveAll();
    return;
  }

  const results: Array<{
    name: string;
    url: string;
    expected: string;
    ok: boolean;
    preview: string;
    length: number;
    regression: RegressionResult;
    error?: string;
  }> = [];

  for (const tc of TEST_CASES) {
    console.log(`\n[${tc.name}] ${tc.description}`);
    const result = await runTest(tc);

    let regression: RegressionResult = { type: "pass" };
    if (result.ok) {
      const snapshotPath = path.join(SNAPSHOTS_DIR, `${tc.name}.txt`);
      fs.writeFileSync(snapshotPath, result.preview, "utf-8");
      regression = compareToBaseline(tc.name, result.preview);

      if (regression.type === "pass") {
        console.log(`  ✓ Preview: ${result.length} chars — matches baseline`);
      } else if (regression.type === "new") {
        console.log(`  ? Preview: ${result.length} chars — no baseline yet (run --approve)`);
      } else {
        console.log(`  ⚠ REGRESSION: ${result.length} chars — differs from baseline`);
      }
      console.log(`  → ${result.preview.slice(0, 100).replace(/\n/g, " ")}...`);
    } else {
      console.log(`  ✗ ${result.error}`);
    }

    results.push({
      name: tc.name,
      url: tc.url,
      expected: tc.expectedBehavior,
      ok: result.ok,
      preview: result.preview,
      length: result.length,
      regression,
      error: result.error,
    });
  }

  // Summary report
  const reportPath = path.join(SNAPSHOTS_DIR, "summary.md");
  const passed = results.filter((r) => r.ok && r.regression.type === "pass").length;
  const failed = results.filter((r) => !r.ok).length;
  const regressed = results.filter((r) => r.ok && r.regression.type === "fail").length;
  const newOnes = results.filter((r) => r.ok && r.regression.type === "new").length;

  const report = [
    "# Content Preview Test Results",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Regressed: ${regressed} | New: ${newOnes}`,
    "",
    "| Site | Status | Length | Preview |",
    "|------|--------|--------|---------|",
    ...results.map((r) => {
      let status = "—";
      if (!r.ok) status = `✗ ${r.error}`;
      else if (r.regression.type === "pass") status = "✓";
      else if (r.regression.type === "new") status = "? new";
      else if (r.regression.type === "fail") status = "⚠ regressed";
      const preview = r.ok ? r.preview.slice(0, 60).replace(/\|/g, "\\|").replace(/\n/g, " ") : "—";
      return `| ${r.name} | ${status} | ${r.length} | ${preview}... |`;
    }),
    "",
    "## Regression diffs",
    "",
    ...results.flatMap((r) => {
      if (r.regression.type !== "fail") return [];
      return [
        `### ${r.name}`,
        "```diff",
        r.regression.diff,
        "```",
        "",
      ];
    }),
    "",
    "## Details",
    "",
    ...results.flatMap((r) => [
      `### ${r.name}`,
      `- **URL**: ${r.url}`,
      `- **Expected**: ${r.expected}`,
      `- **Status**: ${r.ok ? (r.regression.type === "pass" ? "PASS" : r.regression.type === "new" ? "NEW — needs approval" : "REGRESSED") : `FAIL — ${r.error}`}`,
      r.ok ? `- **Preview (${r.length} chars)**: ${r.preview.slice(0, 200).replace(/\n/g, " ")}...` : "",
      "",
    ]),
  ].join("\n");

  fs.writeFileSync(reportPath, report, "utf-8");

  // Print final summary
  console.log("\n" + "=".repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Regressed: ${regressed} | New: ${newOnes}`);
  if (regressed > 0) {
    console.log("\nRegressions detected:");
    for (const r of results) {
      if (r.regression.type === "fail") {
        console.log(`  ⚠ ${r.name}`);
      }
    }
    console.log("\nReview diffs in snapshots/summary.md, then run:");
    console.log("  npx tsx test/content-preview/test.ts --approve");
  }
  console.log("=".repeat(60));

  // Exit with non-zero if failures or regressions
  if (failed > 0 || regressed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
