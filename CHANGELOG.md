# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.3] - 2026-06-28

### Added

- `install.sh` bootstrap installer for one-command pi-web-toolkit setup, including dependency verification, SearXNG endpoint selection, toolkit config writing, optional Firecrawl setup, local development install mode, and `--doctor` diagnostics.
- Toolkit config support at `${XDG_CONFIG_HOME:-~/.config}/pi-web-toolkit/config.json`, with environment variables taking precedence for SearXNG endpoints, Firecrawl fallback enablement, Firecrawl runner selection, and external CLI command paths.
- Public SearXNG endpoint discovery from `searx.space` with JSON API verification, plus an explicit isolated local Docker SearXNG option.
- Explicit Firecrawl runner selection through `firecrawlRunner` / `PI_WEB_FIRECRAWL_RUNNER`, supporting `installed`, `npx`, and `bunx`.
- Regression tests for toolkit config precedence and installer behavior, including public endpoint and local Docker flows.

### Changed

- README and guide now present the bootstrap installer as the primary installation path while keeping manual setup as an advanced option.
- External CLI wrappers can use configured absolute command paths, reducing reliance on shell profile/PATH changes after installer runs.
- `web_search` fallback behavior is covered by regression tests so missing optional Firecrawl runners do not appear as the primary search backend failure.

## [0.3.2] - 2026-06-25

### Fixed

- Kept the agent's web-tool selection local-first: ordinary URL reads now prefer `web_fetch`, discovery prefers `web_search`, and interaction prefers `web_browse`; `firecrawl_*` tools are documented and prompted as fallback-only unless explicitly requested.
- Fixed `firecrawl_scrape` and `firecrawl_interact` partial-result rendering type-check errors caused by reading `details` before declaration.

### Changed

- Reduced web-tool prompt metadata overhead by consolidating shared routing rules and shortening per-tool `promptSnippet`/`promptGuidelines` text.
- Added a tool-routing prompt regression test and included it in `npm test`.

## [0.3.1] - 2026-06-23

### Changed

- UI consistency fixes for the three Firecrawl keyless tools and their fallback paths:
  - `firecrawl_interact` renderCall: removed em-dash prose (` — prompt`), now purely tag-style (consistent with `web_browse`/`web_fetch`).
  - `web_browse` fallback render: now displays `creditsUsed` (was filled in execute but missing in render).
  - `firecrawl_scrape`/`firecrawl_interact` isPartial: now includes target domain (e.g. `Scraping example.com via Firecrawl...`), matching `web_fetch`/`web_browse` style.

## [0.3.0] - 2026-06-23

### Added

- **Firecrawl Keyless fallback** — `web_search`, `web_fetch`, and `web_browse` now automatically retry through [Firecrawl Keyless](https://www.firecrawl.dev/blog/firecrawl-keyless-launch) (1,000 free credits/month, **no API key, no signup**) when their local backend errors out, or when `web_search` returns zero results. The fallback is keyless-only, never the primary path, and degrades gracefully to the original local-tool error if the `firecrawl-cli` is absent, the IP is flagged, the quota is exhausted, or the fallback is disabled.
- Three explicit escape-hatch tools for capabilities the local backends lack: `firecrawl_search` (sources, `github`/`research`/`pdf` categories, domain filters), `firecrawl_scrape` (anti-bot bypass, JS rendering, PDF parsing), and `firecrawl_interact` (natural-language page interaction).
- `extensions/utils/firecrawl.ts` — a deep Firecrawl CLI wrapper (scrape/search/interact argument builders, output parsers, graceful-skip failure classifier, keyless-eligibility check, and fallback-decision predicates).
- Optional external CLI dependency: `npm install -g firecrawl-cli`.
- Environment toggle `PI_WEB_FIRECRAWL_FALLBACK` (default on) to disable all Firecrawl usage.
- `test/firecrawl/test.ts` — pure-function regression tests for the firecrawl wrapper boundary (wired into `npm test` as `test:firecrawl`).
- ADR 0001 and `CONTEXT.md` glossary entries (`Firecrawl keyless`, `cloud fallback`, `free credits`, `graceful skip`) documenting the local-first → optional keyless cloud fallback architectural decision.

### Changed

- **Default network/privacy behavior.** When a local web tool fails, it now makes a cloud request to Firecrawl (sending the URL/query and page content) before giving up. The fallback is **keyless-only** — it never reads, stores, or sends an API key, and spawns the CLI under an isolated temporary `HOME` with the key env stripped. To enforce a strict local-only / no-cloud-egress policy, set `PI_WEB_FIRECRAWL_FALLBACK=0`.
- `web_search` falls back on a SearXNG error **or** zero results; `web_fetch` falls back on a scrapling failure (incl. its HTTP-GET fallback); `web_browse` falls back only on runtime failures (missing/broken `agent-browser`), never on caller validation errors. `web_batch_fetch` has no fallback (Firecrawl batch scrape is not keyless).
- Firecrawl results report `creditsUsed` where the source provides it (search, interact); scrape responses do not surface it.
- README tagline and hero now describe the toolkit as local-first with an optional keyless cloud fallback; features table, install prompt, configuration, project structure, tool reference, and usage guide updated accordingly.
- `cli-runner` gained an optional `env` passthrough so the firecrawl CLI can be spawned keyless-only.

## [0.2.2] - 2026-06-11

### Added

- Self-contained README prompt that Pi users can copy to install and verify the package, SearXNG, Scrapling, and agent-browser.
- `CHANGELOG.md` to the files included in the published npm package.

### Changed

- Corrected README, tool reference, usage guide, agent guidance, project context, and test documentation to match current repository behavior.
- Clarified when to use each tool, Scrapling fallback behavior, external dependency requirements, and SearXNG JSON API setup.
- Test scripts now use the locally installed `tsx` development dependency.
- User-visible tool descriptions now distinguish pages that need interaction from those that do not.

### Fixed

- Corrected historical changelog dates and inaccurate claims about robots.txt enforcement, tool limits, runtime configuration, and test coverage.
- Corrected GitHub issue-reading commands in agent guidance.

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

- `extensions/utils/cli-runner.ts` — centralized CLI process spawning with timeout and AbortSignal support.
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

## [0.1.2] - 2026-06-08

### Added

- `utils/agent-browser.ts` — extracted from `web_browse.ts` to encapsulate all agent-browser CLI interaction (command building, process spawning, JSON parsing, session cleanup).
- `tsconfig.json` — TypeScript project configuration for CI type-checking.
- GitHub Actions CI workflow (`ci.yml`) — runs `tsc --noEmit` on every push and PR.

### Changed

- `web_search` — `SEARXNG_URL` is now read at execute time instead of module load time, so in-process environment changes take effect without reloading the extension.
- `utils/scrapling.ts` — introduced `runScraplingWithFallback()` with configurable `noGetFallback` option, eliminating duplicate fallback logic in `web_fetch` and `web_batch_fetch`.
- `web_browse.ts` — reduced from ~400 lines to ~194 lines by moving CLI logic to `utils/agent-browser.ts`.
- README — added `## Configuration` section, `## Contributing` section, CI badge, and updated project structure with design principles.

### Fixed

- Preserved GET fallback for `web_batch_fetch` when `stealthy: true` fails, maintaining backward compatibility with the previous batch implementation.

## [0.1.1] - 2026-06-04

### Added

- `web_batch_fetch` — parallel multi-page fetching via scrapling.
- Built-in output truncation with temp-file fallback for all tools.
- TUI renderers for tool calls and results.

### Changed

- Unified extension entry point at `extensions/index.ts`.

## [0.1.0] - 2026-06-03

### Added

- `web_search` — SearXNG web search.
- `web_fetch` — single-page extraction via scrapling.
- `web_browse` — interactive browser automation via agent-browser.
- LLM-optimized `promptGuidelines` and `promptSnippet` for every tool.

[Unreleased]: https://github.com/Wade11s/pi-web-toolkit/compare/v0.3.3...HEAD
[0.3.3]: https://github.com/Wade11s/pi-web-toolkit/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/Wade11s/pi-web-toolkit/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/Wade11s/pi-web-toolkit/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/Wade11s/pi-web-toolkit/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/Wade11s/pi-web-toolkit/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/Wade11s/pi-web-toolkit/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Wade11s/pi-web-toolkit/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/Wade11s/pi-web-toolkit/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/Wade11s/pi-web-toolkit/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Wade11s/pi-web-toolkit/releases/tag/v0.1.0
