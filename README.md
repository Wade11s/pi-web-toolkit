# pi-web-toolkit

[![npm version](https://badge.fury.io/js/pi-web-toolkit.svg)](https://www.npmjs.com/package/pi-web-toolkit)
[![Pi package](https://img.shields.io/badge/Pi-package-111111.svg)](https://pi.dev/packages/pi-web-toolkit)
[![CI](https://github.com/Wade11s/pi-web-toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/Wade11s/pi-web-toolkit/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Node.js](https://img.shields.io/badge/node-%3E%3D22-339933)

**Local-first & 100% open-source. No required API keys or paid services.**

Web research toolkit for [pi](https://pi.dev) agents. Search via SearXNG, fetch pages with scrapling, browse interactively via agent-browser, and batch-read sources in parallel. All primary backends run locally or are self-hosted, with an **optional Firecrawl Keyless cloud fallback** (no API key, no signup) so the local tools keep working when a backend is missing or fails. Built-in truncation safety and LLM-optimized prompt guidelines throughout.

## Features

| Tool | Backend | Purpose | Current Limit |
|------|---------|---------|---------------|
| **`web_search`** | [SearXNG](https://github.com/searxng/searxng) | Discover scored, ranked results from multiple engines | 20 results (max 60, auto-pages up to 3 pages) |
| **`web_fetch`** | [scrapling](https://github.com/D4Vinci/Scrapling) | Fetch a single page as clean markdown | — |
| **`web_batch_fetch`** | [scrapling](https://github.com/D4Vinci/Scrapling) | Fetch 1–15 pages in parallel for research synthesis (2–5 recommended) | 3 concurrent (max 5) |
| **`web_browse`** | [agent-browser](https://github.com/vercel-labs/agent-browser) | Interact with a page (click, scroll, fill) then extract content | 25 actions |
| **`firecrawl_search`** | [firecrawl-cli](https://github.com/firecrawl/cli) (keyless) | Cloud search with sources/categories/domain filters | — |
| **`firecrawl_scrape`** | [firecrawl-cli](https://github.com/firecrawl/cli) (keyless) | Cloud single-page fetch (anti-bot / JS / PDF) | — |
| **`firecrawl_interact`** | [firecrawl-cli](https://github.com/firecrawl/cli) (keyless) | Cloud natural-language page interaction | — |

> **Firecrawl fallback.** `web_search`, `web_fetch`, and `web_browse` are the local-first primary tools and automatically retry through Firecrawl Keyless (1,000 free credits/month, no API key) only when their local backend errors out or search returns nothing. The three `firecrawl_*` tools are fallback-only escape hatches; agents are instructed not to call them first unless you explicitly ask for Firecrawl/cloud behavior or a local-first tool already failed. Disable fallback use with `PI_WEB_FIRECRAWL_FALLBACK=0` or toolkit config `"firecrawlFallback": false`. Install the optional CLI: `npm install -g firecrawl-cli`.

## Tools Preview

A quick look at how pi renders toolkit calls while an agent searches, fetches, batches, and browses the web.

<table>
  <tr>
    <td width="50%"><strong>Multi-tool research flow</strong><br><img src="docs/assets/screenshots/tools-workflow-preview.png" alt="pi-web-toolkit multi-tool research preview"></td>
    <td width="50%"><strong><code>web_search</code> expanded results</strong><br><img src="docs/assets/screenshots/web-search-results-expanded.png" alt="web_search expanded results"></td>
  </tr>
  <tr>
    <td width="50%"><strong><code>web_batch_fetch</code> progress</strong><br><img src="docs/assets/screenshots/web-batch-fetch-progress.png" alt="web_batch_fetch progress"></td>
    <td width="50%"><strong><code>web_batch_fetch</code> results</strong><br><img src="docs/assets/screenshots/web-batch-fetch-results.png" alt="web_batch_fetch results"></td>
  </tr>
  <tr>
    <td width="50%"><strong><code>web_fetch</code> result preview</strong><br><img src="docs/assets/screenshots/web-fetch-summary.png" alt="web_fetch result preview"></td>
    <td width="50%"><strong><code>web_browse</code> headless browser flow</strong><br><img src="docs/assets/screenshots/web-browse-headless.png" alt="web_browse headless browser flow"></td>
  </tr>
  <tr>
    <td colspan="2"><strong>End-to-end research summary</strong><br><img src="docs/assets/screenshots/web-research-workflow.png" alt="end-to-end web research workflow"></td>
  </tr>
</table>

## Quick Start

### Install

Run the bootstrap installer:

```bash
curl -fsSL https://raw.githubusercontent.com/Wade11s/pi-web-toolkit/main/install.sh | bash
```

This is the normal install path. It installs the pi package, configures external runtime dependencies, verifies everything, and writes persistent runtime options to `${XDG_CONFIG_HOME:-~/.config}/pi-web-toolkit/config.json`.

When it finishes, **restart pi** so the package is loaded. If pi-web-toolkit was already loaded and only toolkit config changed, `/reload` may also work.

### What the installer does

The installer:

- Checks Node.js 22+, npm, Pi, curl, OpenSSL, and uv.
- Installs or reuses Scrapling and agent-browser.
- Configures a JSON-capable SearXNG endpoint for `web_search`.
- Optionally installs `firecrawl-cli` for the Firecrawl Keyless fallback.
- Writes toolkit config with the selected endpoint and discovered CLI paths.
- Installs the pi package with `pi install npm:pi-web-toolkit`.
- Runs final verification before reporting success.

The installer is conservative. It does **not** silently install Docker, Node.js, Pi, Homebrew, OS packages, use sudo, change shell profiles, or overwrite user-managed SearXNG resources.

### Common installer options

When piping from curl, pass flags after `bash -s --`:

```bash
curl -fsSL https://raw.githubusercontent.com/Wade11s/pi-web-toolkit/main/install.sh | bash -s -- --yes --searxng-url https://searxng.example.com --no-firecrawl
```

If you have cloned the repo, run the same flags directly:

| Goal | Command |
|------|---------|
| Use an existing/self-hosted SearXNG endpoint | `./install.sh --searxng-url https://searxng.example.com` |
| Non-interactive install with a known endpoint | `./install.sh --yes --searxng-url https://searxng.example.com --no-firecrawl` |
| Explicitly auto-select a verified public SearXNG endpoint | `./install.sh --yes --auto-searxng public --no-firecrawl` |
| Start/reuse isolated local Docker SearXNG | `./install.sh --yes --auto-searxng local-docker --searxng-port 8080 --no-firecrawl` |
| Install optional Firecrawl Keyless fallback with global CLI | `./install.sh --with-firecrawl --firecrawl-runner installed` |
| Enable Firecrawl fallback through opt-in `npx` runner | `./install.sh --with-firecrawl --firecrawl-runner npx` |
| Enable Firecrawl fallback through opt-in `bunx` runner | `./install.sh --with-firecrawl --firecrawl-runner bunx` |
| Verify readiness without changing anything | `./install.sh --doctor` |
| Install from the current checkout | `./install.sh --local` |

### SearXNG endpoint choices

`web_search` needs a SearXNG endpoint that supports JSON search responses:

```bash
curl -fsS --get "https://searxng.example.com/search" \
  --data-urlencode "q=searxng" \
  --data "format=json" | grep -q '"results"'
```

The installer can use:

- An existing/self-hosted endpoint passed with `--searxng-url`.
- A working local endpoint such as `http://localhost:8080`.
- A public endpoint discovered from `searx.space`, ranked by health signals, then verified with `format=json`.
- An isolated local Docker endpoint using container `pi-web-toolkit-searxng` and config under the toolkit config directory.

Public endpoints are not silently selected by default because search queries leave your machine. Use `--auto-searxng public` only when that trade-off is acceptable.

### Manual install (advanced)

If you prefer to install dependencies yourself:

```bash
# SearXNG endpoint: provide an existing JSON-capable endpoint, or run your own
export SEARXNG_URL="https://searxng.example.com"

# scrapling (for fetch & batch fetch)
uv tool install "scrapling[all]"
scrapling install

# agent-browser (for browse)
npm i -g agent-browser
agent-browser install
agent-browser doctor

# firecrawl-cli (optional cloud fallback; no API key needed)
npm i -g firecrawl-cli

# pi package
pi install npm:pi-web-toolkit
```

A SearXNG endpoint must support `format=json`:

```bash
curl -fsS --get "$SEARXNG_URL/search" \
  --data-urlencode "q=searxng" \
  --data "format=json" | grep -q '"results"'
```

## Configuration

Runtime configuration is resolved in this order: environment variables first, then the toolkit config file written by the installer, then built-in defaults. Runtime tools, installer writes, and doctor mode share the same config core for schema, validation, precedence, and merge behavior. No build step is required.

Default toolkit config path:

```text
${XDG_CONFIG_HOME:-~/.config}/pi-web-toolkit/config.json
```

Example:

```json
{
  "searxngUrl": "https://searxng.example.com",
  "firecrawlFallback": false,
  "firecrawlRunner": "installed",
  "commands": {
    "scrapling": "/Users/alice/.local/bin/scrapling",
    "agentBrowser": "/Users/alice/.npm-global/bin/agent-browser",
    "firecrawl": "/Users/alice/.npm-global/bin/firecrawl"
  }
}
```

| Variable | Toolkit config key | Default | Used By | Description |
|----------|--------------------|---------|---------|-------------|
| `SEARXNG_URL` | `searxngUrl` | `http://localhost:8080` | `web_search` | SearXNG endpoint. Must support `/search?q=...&format=json`. |
| `PI_WEB_FIRECRAWL_FALLBACK` | `firecrawlFallback` | `true` | all Firecrawl fallback paths | Set env to `0`/`false`/`no`/`off`, or config to `false`, to disable cloud fallback. |
| `PI_WEB_FIRECRAWL_RUNNER` | `firecrawlRunner` | `installed` | all Firecrawl fallback paths | Firecrawl runner: `installed`, `npx`, or `bunx`. `npx`/`bunx` are opt-in because they may run or download packages at fallback time. |
| `SCRAPLING_BIN` | `commands.scrapling` | `scrapling` | `web_fetch`, `web_batch_fetch` | Scrapling executable path. |
| `AGENT_BROWSER_BIN` | `commands.agentBrowser` | `agent-browser` | `web_browse` | agent-browser executable path. |
| `FIRECRAWL_BIN` | `commands.firecrawl` | `firecrawl` | `firecrawl_*`, fallback paths | Firecrawl CLI executable path. |
| `PI_WEB_TOOLKIT_CONFIG` | — | `${XDG_CONFIG_HOME:-~/.config}/pi-web-toolkit/config.json` | all tools | Override the toolkit config file location. |

Set env vars before starting pi when you need a temporary override:

```bash
export SEARXNG_URL="https://searxng.example.com"
export SCRAPLING_BIN="$HOME/.local/bin/scrapling"
export PI_WEB_FIRECRAWL_FALLBACK=0
export PI_WEB_FIRECRAWL_RUNNER=npx
```

### Optional: Firecrawl keyless fallback

When a local backend (`web_search`/`web_fetch`/`web_browse`) fails or returns nothing, the tools automatically retry through [Firecrawl Keyless](https://www.firecrawl.dev/blog/firecrawl-keyless-launch) — 1,000 free credits/month, **no API key, no signup**. The `firecrawl_*` tools are fallback-only explicit escape hatches for capabilities the local backends lack (search categories, cloud rendering, natural-language interaction). Agents should use `web_fetch`/`web_search`/`web_browse` first unless you explicitly request Firecrawl/cloud behavior.

Install the optional CLI (the fallback degrades gracefully if it is absent):

```bash
npm install -g firecrawl-cli
```

Alternatively, opt into a runner that executes the official CLI on demand:

```json
{ "firecrawlRunner": "npx" }
```

Allowed runners are `installed`, `npx`, and `bunx`. The default is `installed`; `npx` and `bunx` are never selected automatically because they may run or download packages at fallback time.

The fallback is **keyless-only**: it never reads or stores an API key, and spawns the CLI under an isolated temporary `HOME` with the key env stripped. **Privacy:** when the fallback runs, the URL and page content are sent to Firecrawl's cloud.

## Troubleshooting

Run doctor mode when an install fails, when filing an issue, or when you want to verify an existing setup. It is verify-only: it does not install dependencies, write config, start containers, or run `pi install`.

```bash
./install.sh --doctor
# or, without cloning:
curl -fsSL https://raw.githubusercontent.com/Wade11s/pi-web-toolkit/main/install.sh | bash -s -- --doctor
```

Common failures:

| Symptom | Fix |
|---------|-----|
| Node.js is too old | Install Node.js 22+ and retry. |
| `uv` is missing | Install uv, then rerun the installer. |
| SearXNG returns HTML/403 instead of JSON | Use another endpoint or enable `search.formats: json` on your SearXNG instance. |
| Docker local SearXNG fails | Start Docker first, or use `--searxng-url` / `--auto-searxng public`. |
| `agent-browser doctor` fails on Linux | Rerun with `--agent-browser-with-deps` or install the missing browser system libraries manually. |
| Firecrawl fallback says runner missing | Install `firecrawl-cli`, choose `--firecrawl-runner npx`, choose `--firecrawl-runner bunx`, or disable fallback with `--no-firecrawl`. |
| pi does not show the tools after install | Restart pi. |

To remove the pi package, run `pi remove npm:pi-web-toolkit`. To remove the toolkit config, delete `${XDG_CONFIG_HOME:-~/.config}/pi-web-toolkit/config.json`. If the installer created local SearXNG, remove container `pi-web-toolkit-searxng` and the toolkit SearXNG config directory manually.

## Project Structure

```
pi-web-toolkit/
├── extensions/
│   ├── index.ts              # Unified entry point — registers all 7 tools (4 local + 3 Firecrawl keyless)
│   ├── utils/
│   │   ├── cli-runner.ts     # Unified CLI process spawning with timeout/AbortSignal/env
│   │   ├── config.ts         # TypeScript wrapper for shared toolkit config semantics
│   │   ├── config-core.cjs    # Shared config schema/defaults/precedence/write CLI for runtime + installer
│   │   ├── browser-action-language.ts # Shared web_browse action semantics and planning
│   │   ├── content-preview.ts # Intelligent content extraction from scraped pages
│   │   ├── page-extraction.ts # Shared Scrapling page reads, previews, and output fallback
│   │   ├── output-sink.ts    # Truncation + temp-file fallback
│   │   ├── render-helpers.ts # URL abbreviations, text normalization, error formatting for TUI
│   │   ├── scrapling.ts      # Reusable scrapling CLI wrapper (shared by fetch + batch)
│   │   ├── agent-browser.ts  # agent-browser CLI execution adapter (shared by web_browse)
│   │   └── firecrawl.ts      # Firecrawl Keyless seam: search/scrape/interact + fallback decisions
│   ├── web_search.ts         # SearXNG search tool (+ Firecrawl fallback)
│   ├── web_fetch.ts          # Single-page scrapling fetcher (+ Firecrawl fallback)
│   ├── web_batch_fetch.ts    # Parallel scrapling fetcher
│   ├── web_browse.ts         # Interactive browser automation (agent-browser + Firecrawl fallback)
│   ├── firecrawl_search.ts   # Firecrawl keyless search (escape hatch)
│   ├── firecrawl_scrape.ts   # Firecrawl keyless single-page fetch (escape hatch)
│   └── firecrawl_interact.ts # Firecrawl keyless natural-language interaction (escape hatch)
├── test/
│   ├── agent-browser/        # agent-browser output parser regression tests
│   ├── browser-action-language/ # web_browse action semantics tests
│   ├── config/               # Shared toolkit config precedence/validation/write tests
│   ├── content-preview/      # Content preview fixtures, baselines & snapshots
│   ├── page-extraction/      # Page extraction interface tests
│   ├── installer/            # Bootstrap installer behavior tests
│   ├── tool-presentation/    # Presentation helper deletion-test contract
│   ├── web-search/           # SearXNG-first fallback behavior tests
│   └── README.md             # Test suite structure and conventions
├── docs/
│   ├── tools.md              # Full parameter specs
│   ├── guide.md              # Decision tree & tool comparison
│   └── agents/               # Issue tracker, triage and domain guidance
├── AGENTS.md
├── CONTEXT.md
├── CHANGELOG.md
├── install.sh
├── package.json
├── README.md
├── tsconfig.json
└── LICENSE
```

**Design principles:**
- **Unified registration** — `index.ts` is the single source of truth for what pi loads.
- **Shared utilities** — `utils/` modules encapsulate CLI spawning, content extraction, output truncation, TUI formatting, and common registration patterns; tool files import only from `utils/`, never from each other.
- **Per-tool isolation** — each tool owns its own schema, execute logic, and TUI renderer; no cross-imports except via `utils/`.
- **Runtime config** — environment variables and toolkit config are read at execute time, not build time.

## Reference

- [Tool Reference](docs/tools.md) — Full parameter specs and usage examples for each tool.
- [Usage Guide](docs/guide.md) — Decision tree and tool comparison.
- [Changelog](CHANGELOG.md) — Release history and migration notes.

## Contributing

```bash
# Local development
pi install ./

# Type-check (no build step; pi loads TypeScript directly)
npm run typecheck

# Run tests
npm run test

# Verify external CLI dependencies
scrapling --help
agent-browser doctor
```

Pull requests welcome. Please keep changes scoped to a single tool or concern and follow [Conventional Commits](https://www.conventionalcommits.org/).

## License

MIT
