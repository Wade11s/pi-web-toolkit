# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/Wade11s/pi-web-toolkit/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/Wade11s/pi-web-toolkit/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/Wade11s/pi-web-toolkit/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Wade11s/pi-web-toolkit/releases/tag/v0.1.0
