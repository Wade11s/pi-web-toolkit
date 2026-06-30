# pi-web-toolkit — Domain Context

A pi extension package that adds web research and browser automation tools to the pi agent runtime.

## Glossary

| Term | Definition |
|------|------------|
| **pi extension** | A package loaded by the pi agent runtime that registers new tools. No build step required. |
| **tool** | A function exposed to the pi agent, defined by a name, parameter schema, and execute handler. |
| **SearXNG** | A privacy-respecting metasearch engine. `web_search` uses a configured SearXNG endpoint to aggregate results from multiple engines. |
| **SearXNG endpoint** | The base URL used by `web_search` for SearXNG queries. It may be an existing local service, a user-provided/self-hosted remote service, or an opt-in installer-managed local container, but it must support `format=json`. |
| **SearXNG endpoint discovery** | The installer flow that finds candidate SearXNG endpoints, verifies that each supports the JSON search API, and helps the user select or automatically choose one. |
| **toolkit config** | The persistent user-level configuration file for pi-web-toolkit runtime options and discovered external CLI paths, used when environment variables are not set. Its default location is `${XDG_CONFIG_HOME:-~/.config}/pi-web-toolkit/config.json`. |
| **doctor mode** | A verify-only installer mode that reports pi-web-toolkit readiness without installing dependencies, modifying configuration, or installing the pi package. |
| **scrapling** | A Python CLI for fetching and scraping web pages. Used by `web_fetch` and `web_batch_fetch`. |
| **agent-browser** | A browser automation CLI with a fast Rust implementation and Node.js fallback. `web_browse` uses it for interaction and final-state extraction. |
| **stealthy mode** | Anti-bot mode for Scrapling fetches; selects the `scrapling extract stealthy-fetch` command. |
| **temp-file fallback** | When tool output exceeds truncation limits, the full result is written to a temp file and its path is returned. |
| **content-preview** | Structural markdown analysis module that extracts readable preview snippets by classifying blocks (headings, paragraphs, lists, tables) and scoring them for content quality. Handles CJK text, Wikipedia TOC, HN tables, and form dropdowns. |
| **output-sink** | Unified output handling module: truncation policy, temp-file fallback, and truncation notice formatting. Used by all four tools. |
| **cli-runner** | Central process-spawning module with consistent signal, timeout, stdin, and output handling. |
| **Firecrawl keyless** | Firecrawl's no-API-key free tier: 1,000 credits/month, IP-gated, granted only to official clients (MCP/CLI/SDK) on the `/search`, `/scrape`, and `/interact` endpoints. |
| **cloud fallback** | The automatic retry-through-Firecrawl-keyless behavior of `web_search`, `web_fetch`, and `web_browse` when their local backend errors out (or search returns nothing). Always fallback-only, never the primary path. |
| **free credits** | The monthly keyless allowance (1,000) that bounds how much cloud fallback can run before per-IP rate limits kick in. |
| **graceful skip** | When a Firecrawl attempt cannot yield a result (CLI absent, IP flagged, rate-limited, or fallback disabled), the tool falls through to the original local-tool error rather than surfacing a worse one. |
| **Firecrawl runner** | The configured way to invoke the official Firecrawl CLI for keyless fallback: an installed `firecrawl` executable, or explicit opt-in `npx`/`bunx` execution. |
| **bootstrap installer** | A single-entry installation script that checks/reuses external runtime dependencies, installs missing pieces, verifies readiness, and can install the pi extension package. |
| **installer-supported platform** | An operating system family where the bootstrap installer is expected to automate dependency setup and verification. Initially macOS and Ubuntu/Debian Linux; other Linux variants receive best-effort checks and guidance, and Windows users are directed to WSL2. |

## Architectural decisions

- **No build step** — TypeScript source is loaded directly by the pi runtime. `npm install` provides local type-checking and test dependencies.
- **One tool per file** — Each tool lives in its own module under `extensions/` and exports a default registration function.
- **External CLI dependencies** — `scrapling`, `agent-browser`, and optional `firecrawl` are separate executables installed or reused outside the npm package; they are not npm peer dependencies or bundled package files.
- **Unified entry point** — `extensions/index.ts` registers all tools so the pi runtime loads them with a single import.
- **Toolkit config** — Runtime options selected by the bootstrap installer are stored in user-level toolkit config rather than shell profiles; environment variables keep highest precedence. See [ADR 0002](docs/adr/0002-toolkit-config-for-installer-selections.md).
- **Output truncation** — All tools truncate large outputs automatically and fall back to temp files to stay within token budgets.
- **Shared utility modules** — Common concerns (content preview, output sink, CLI runner) live in `extensions/utils/` as deep modules with narrow interfaces. Tools import them; duplication is avoided.
- **Structural over heuristic** — The content-preview module parses markdown into semantic blocks rather than scoring character-level heuristics. This handles table-based pages (HN), CJK text, and mixed-language Wikipedia articles robustly.
- **Optional keyless cloud fallback** — The local tools (`web_search`, `web_fetch`, `web_browse`) transparently retry through Firecrawl Keyless when their local backend fails or returns nothing; three explicit `firecrawl_*` tools are also exposed. The fallback is keyless-only, never the primary path, and opt-out-able. See [ADR 0001](docs/adr/0001-firecrawl-keyless-cloud-fallback.md).
- **Conservative bootstrap installer** — `install.sh` automates user-level dependency setup and endpoint selection while avoiding silent system-level changes. Public SearXNG endpoints are discovered and verified before selection, and local Docker SearXNG uses pi-web-toolkit-owned resources. See [ADR 0003](docs/adr/0003-conservative-installer-prerequisites.md) and [ADR 0004](docs/adr/0004-searxng-endpoint-discovery.md).

## Consumer rules

- When adding a new tool, follow the existing schema naming (`PascalCase + ParamsSchema`) and type naming (`PascalCase + Input`) conventions.
- When modifying tool behavior, update `docs/tools.md` and `docs/guide.md` to keep documentation in sync.
- When cutting a release, bump version in `package.json` and update `CHANGELOG.md`.
- When modifying shared utilities (`extensions/utils/`), run `npm test` and `npm run typecheck`. For content-preview-only iteration, run `npx tsx test/content-preview/test.ts`.
