# pi-web-toolkit

[![npm version](https://badge.fury.io/js/pi-web-toolkit.svg)](https://www.npmjs.com/package/pi-web-toolkit)
[![CI](https://github.com/Wade11s/pi-web-toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/Wade11s/pi-web-toolkit/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Node.js](https://img.shields.io/badge/node-%3E%3D22-339933)

**100% open-source. Zero API keys. Zero fees.**

Web research toolkit for [pi](https://pi.dev) agents. Search via SearXNG, fetch static pages with scrapling, browse interactively via agent-browser, and batch-read sources in parallel. All self-hosted, all local, all free — with built-in truncation safety and LLM-optimized prompt guidelines.

## Features

| Tool | Backend | Purpose | Current Limit |
|------|---------|---------|---------------|
| **`web_search`** | [SearXNG](https://github.com/searxng/searxng) | Search the web with scored, ranked results from multiple engines — always the first step in web research | 20 results (max 60, auto-pages up to 3 pages) |
| **`web_fetch`** | [scrapling](https://github.com/D4Vinci/Scrapling) | Fetch a single static page as clean markdown | — |
| **`web_batch_fetch`** | [scrapling](https://github.com/D4Vinci/Scrapling) | Fetch 2–15 pages in parallel for research synthesis | 3 concurrent (max 5) |
| **`web_browse`** | [agent-browser](https://github.com/vercel-labs/agent-browser) | Interact with a page (click, scroll, fill) then extract content | 25 actions |

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

### 1. Install external dependencies

```bash
# SearXNG (for search)
docker run -d --name searxng -p 8080:8080 -v searxng:/etc/searxng searxng/searxng
export SEARXNG_URL="http://localhost:8080"

# scrapling (for fetch & batch fetch)
uv tool install "scrapling[all]"
scrapling install

# agent-browser (for browse)
npm i -g agent-browser && agent-browser install
```

**Verify dependencies:**
```bash
# SearXNG
curl -s "$SEARXNG_URL" | head

# scrapling
scrapling --help

# agent-browser
agent-browser doctor
```

### 2. Install the extension
#### From npm
```bash
pi install npm:pi-web-toolkit
```
#### From GitHub
```bash
pi install git:github.com/Wade11s/pi-web-toolkit
```

## Configuration

All tools are configured via **environment variables** at runtime — no rebuild or restart required.

| Variable | Default | Used By | Description |
|----------|---------|---------|-------------|
| `SEARXNG_URL` | `http://localhost:8080` | `web_search` | Your SearXNG instance endpoint |

Set before starting pi:

```bash
export SEARXNG_URL="https://searxng.example.com"
```

## Project Structure

```
pi-web-toolkit/
├── extensions/
│   ├── index.ts              # Unified entry point — registers all 4 tools
│   ├── utils/
│   │   ├── cli-runner.ts     # Unified CLI process spawning with timeout/AbortSignal
│   │   ├── content-preview.ts # Intelligent content extraction from scraped pages
│   │   ├── output-sink.ts    # Truncation + temp-file fallback
│   │   ├── render-helpers.ts # URL abbreviations, text normalization, error formatting for TUI
│   │   ├── scrapling.ts      # Reusable scrapling CLI wrapper (shared by fetch + batch)
│   │   ├── tool-factory.ts   # Common tool registration patterns
│   │   └── agent-browser.ts  # agent-browser CLI wrapper (shared by web_browse)
│   ├── web_search.ts         # SearXNG search tool
│   ├── web_fetch.ts          # Single-page scrapling fetcher
│   ├── web_batch_fetch.ts    # Parallel scrapling fetcher
│   └── web_browse.ts         # Interactive browser automation (agent-browser)
├── test/
│   └── content-preview/      # Automated test suite with fixtures & snapshots
├── docs/
│   ├── tools.md              # Full parameter specs
│   └── guide.md              # Decision tree & tool comparison
├── CHANGELOG.md
├── package.json
├── README.md
└── LICENSE
```

**Design principles:**
- **Unified registration** — `index.ts` is the single source of truth for what pi loads.
- **Shared utilities** — `utils/` modules encapsulate CLI spawning, content extraction, output truncation, TUI formatting, and common registration patterns; tool files import only from `utils/`, never from each other.
- **Per-tool isolation** — each tool owns its own schema, execute logic, and TUI renderer; no cross-imports except via `utils/`.
- **Runtime config** — environment variables are read at execute time, not build time.

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
