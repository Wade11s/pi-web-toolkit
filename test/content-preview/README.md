# Content Preview Tests

Tests the `extractPreview` module against real-world page types.

## Running

```bash
# Run tests and compare against baselines
npm test

# Or directly
npx tsx test/content-preview/test.ts

# Approve new snapshots as the new baseline
npm run test:approve
```

First run fetches pages via scrapling and caches them in `fixtures/`.
Subsequent runs use the cached fixtures.

## Fixtures

| File | Source | Why it matters |
|------|--------|----------------|
| `wikipedia-article.md` | en.wikipedia.org | Heavy nav noise (TOC, language links, sidebar) |
| `simple-page.md` | example.com | Minimal — one paragraph baseline |
| `hacker-news-feed.md` | news.ycombinator.com | Table-based layout, no traditional paragraphs |
| `news-article.md` | bbc.com | Standard article with lead paragraph |
| `tech-blog.md` | blog.mozilla.org | Form dropdowns, marketing copy |
| `github-repo.md` | github.com/microsoft/TypeScript | README with code blocks |
| `documentation.md` | docs.python.org | Tutorial with headings and lists |
| `forum-discussion.md` | stackoverflow.com | Q&A with vote/sidebar noise |
| `chinese-content.md` | zh.wikipedia.org | CJK text — no spaces between words |
| `japanese-content.md` | ja.wikipedia.org | CJK text, different TOC heading (`目次`) |
| `product-page.md` | apple.com/iphone | Marketing page, sparse text |
| `reddit-post.md` | reddit.com | Feed with login gates |

## Snapshots & Regression

- `baselines/{name}.txt` — the approved "correct" snapshot (committed to git)
- `snapshots/{name}.txt` — the latest run's output (generated, not committed)
- `snapshots/summary.md` — human-readable table + diff report

If a test output differs from its baseline, the suite prints a diff and exits with code 1.
Review `snapshots/summary.md` to see exactly what changed, then run `npm run test:approve`
to promote the new snapshots to baselines.

**Never approve blindly** — only approve when you intentionally changed the behavior.

## Adding a new case

1. Add a `TestCase` to `test.ts`.
2. Run the suite — it fetches automatically.
3. Inspect the snapshot in `snapshots/{name}.txt`.
4. If the preview looks correct, run `npm run test:approve` to establish the baseline.
5. If the preview is wrong, fix `extensions/utils/content-preview.ts`, then re-run.
