# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2026-06-10

### Added

- README tools preview grid with screenshots for `web_search`, `web_fetch`, `web_batch_fetch`, and `web_browse`.
- Agent-browser parser regression tests covering array, wrapped, single-item, and invalid JSON output shapes.

### Fixed

- `web_browse` now accepts multiple agent-browser batch JSON output shapes instead of assuming a top-level array.

### Changed

- `npm test` now also runs the agent-browser parser regression suite.

## [0.2.0] - 2026-06-09

### Added

- `extensions/utils/cli-runner.ts` — unified CLI process spawning with timeout and AbortSignal support.
- `extensions/utils/content-preview.ts` — intelligent content extraction from scraped pages.
- `extensions/utils/output-sink.ts` — truncation and temp-file fallback, replacing `truncateHead` + manual `writeFile`/`mkdtemp` in every tool.
- `extensions/utils/render-helpers.ts` — URL abbreviations, text normalization, and error formatting for TUI.
- `extensions/utils/tool-factory.ts` — common tool registration patterns.
- `CLAUDE.md` — symlink to `AGENTS.md` for IDE/agent integration.
- `CONTEXT.md` — project domain summary for pi runtime context.
- `test/` directory — automated test suite under `test/content-preview/` with fixtures, baselines, snapshots, and summary report.

### Changed

- All 4 tools (`web_search`, `web_fetch`, `web_browse`, `web_batch_fetch`) refactored to use new shared utils, eliminating ~200 lines of duplicated truncate/output logic per tool.
- `scrapling.ts` and `agent-browser.ts` now use `cli-runner`, eliminating duplicate `spawn` logic.
- `web_search` — `language` default changed from `"auto"` to `""` (omits param when unset to use SearXNG default).
- `web_search` — `promptGuidelines` now recommends `web_batch_fetch` for parallel reading of 2–5 results.
- `web_batch_fetch` — added live progress tracking with per-URL status (fetching / done / error).
- `web_browse` — added step formatting and tracking (`formatBrowseStep` + `steps` in details).
- Unified TUI redesign across all 4 tools:
  - Consistent `isError` rendering with `✗` status, error text, and context details.
  - Enhanced `isPartial` rendering with domain/URL context and live progress indicators.
  - `fullOutputPath` rendered in accent color.
  - `renderCall` tags: `[stealthy]`, `[selector=...]`, `[headed]`, `concurrency`.
- `web_fetch` — content preview (500-char extract) shown in collapsed and expanded views.
- `web_browse` — expanded view shows complete step list + preview.
- `web_batch_fetch` — collapsed shows top 3 successes with previews; expanded shows full success list + failure list.

### Meta

- Stop tracking `package-lock.json` (library project; reproducible by downstream consumers).
- Add `typecheck`, `test`, and `test:approve` scripts to `package.json`.

## [0.1.2] - 2025-06-08

### Added

- `utils/agent-browser.ts` — extracted from `web_browse.ts` to encapsulate all agent-browser CLI interaction (command building, process spawning, JSON parsing, session cleanup).
- `tsconfig.json` — TypeScript project configuration for CI type-checking.
- GitHub Actions CI workflow (`ci.yml`) — runs `tsc --noEmit` on every push and PR.

### Changed

- `web_search` — `SEARXNG_URL` is now read at execute time instead of module load time, so changes take effect without restarting pi.
- `utils/scrapling.ts` — introduced `runScraplingWithFallback()` with configurable `noGetFallback` option, eliminating duplicate fallback logic in `web_fetch` and `web_batch_fetch`.
- `web_browse.ts` — reduced from ~400 lines to ~194 lines by moving CLI logic to `utils/agent-browser.ts`.
- README — added `## Configuration` section, `## Contributing` section, CI badge, and updated project structure with design principles.

### Fixed

- Preserved GET fallback for `web_batch_fetch` when `stealthy: true` fails, maintaining backward compatibility with the previous batch implementation.

## [0.1.1] - 2025-06-04

### Added

- `web_batch_fetch` — parallel multi-page fetching via scrapling.
- Built-in output truncation with temp-file fallback for all tools.
- TUI renderers for tool calls and results.

### Changed

- Unified extension entry point at `extensions/index.ts`.

## [0.1.0] - 2025-06-03

### Added

- `web_search` — SearXNG web search.
- `web_fetch` — static page extraction via scrapling.
- `web_browse` — interactive browser automation via agent-browser.
- LLM-optimized `promptGuidelines` and `promptSnippet` for every tool.

[Unreleased]: https://github.com/Wade11s/pi-web-toolkit/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/Wade11s/pi-web-toolkit/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Wade11s/pi-web-toolkit/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/Wade11s/pi-web-toolkit/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/Wade11s/pi-web-toolkit/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Wade11s/pi-web-toolkit/releases/tag/v0.1.0
