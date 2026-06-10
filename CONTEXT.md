# pi-web-toolkit — Domain Context

A pi extension package that adds web research and browser automation tools to the pi agent runtime.

## Glossary

| Term | Definition |
|------|------------|
| **pi extension** | A package loaded by the pi agent runtime that registers new tools. No build step required. |
| **tool** | A function exposed to the pi agent, defined by a name, parameter schema, and execute handler. |
| **SearXNG** | A privacy-respecting metasearch engine. `web_search` uses it to aggregate results from multiple engines. |
| **scrapling** | A Python CLI for fetching and scraping web pages. Used by `web_fetch` and `web_batch_fetch`. |
| **agent-browser** | A browser automation CLI with a fast Rust implementation and Node.js fallback. `web_browse` uses it for interaction and final-state extraction. |
| **stealthy mode** | Anti-bot mode for Scrapling fetches; selects the `scrapling extract stealthy-fetch` command. |
| **temp-file fallback** | When tool output exceeds truncation limits, the full result is written to a temp file and its path is returned. |
| **content-preview** | Structural markdown analysis module that extracts readable preview snippets by classifying blocks (headings, paragraphs, lists, tables) and scoring them for content quality. Handles CJK text, Wikipedia TOC, HN tables, and form dropdowns. |
| **output-sink** | Unified output handling module: truncation policy, temp-file fallback, and truncation notice formatting. Used by all four tools. |
| **cli-runner** | Central process-spawning module with consistent signal, timeout, stdin, and output handling. |

## Architectural decisions

- **No build step** — TypeScript source is loaded directly by the pi runtime. `npm install` provides local type-checking and test dependencies.
- **One tool per file** — Each tool lives in its own module under `extensions/` and exports a default registration function.
- **External CLI dependencies** — `scrapling` and `agent-browser` are separate executables installed by the end user; they are not npm peer dependencies or bundled package files.
- **Unified entry point** — `extensions/index.ts` registers all tools so the pi runtime loads them with a single import.
- **Output truncation** — All tools truncate large outputs automatically and fall back to temp files to stay within token budgets.
- **Shared utility modules** — Common concerns (content preview, output sink, CLI runner) live in `extensions/utils/` as deep modules with narrow interfaces. Tools import them; duplication is avoided.
- **Structural over heuristic** — The content-preview module parses markdown into semantic blocks rather than scoring character-level heuristics. This handles table-based pages (HN), CJK text, and mixed-language Wikipedia articles robustly.

## Consumer rules

- When adding a new tool, follow the existing schema naming (`PascalCase + ParamsSchema`) and type naming (`PascalCase + Input`) conventions.
- When modifying tool behavior, update `docs/tools.md` and `docs/guide.md` to keep documentation in sync.
- When cutting a release, bump version in `package.json` and update `CHANGELOG.md`.
- When modifying shared utilities (`extensions/utils/`), run `npm test` and `npm run typecheck`. For content-preview-only iteration, run `npx tsx test/content-preview/test.ts`.
