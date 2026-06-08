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
| **`web_search`** | [SearXNG](https://github.com/searxng/searxng) | Search the web with scored, ranked results from multiple engines — always the first step in web research | 10 results (max 50) |
| **`web_fetch`** | [scrapling](https://github.com/D4Vinci/Scrapling) | Fetch a single static page as clean markdown | — |
| **`web_batch_fetch`** | [scrapling](https://github.com/D4Vinci/Scrapling) | Fetch 2–10 pages in parallel for research synthesis | 3 concurrent (max 5) |
| **`web_browse`** | [agent-browser](https://github.com/vercel-labs/agent-browser) | Interact with a page (click, scroll, fill) then extract content | 25 actions |

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
│   │   ├── scrapling.ts      # Reusable scrapling CLI wrapper (shared by fetch + batch)
│   │   └── agent-browser.ts  # agent-browser CLI wrapper (shared by web_browse)
│   ├── web_search.ts         # SearXNG search tool
│   ├── web_fetch.ts          # Single-page scrapling fetcher
│   ├── web_batch_fetch.ts    # Parallel scrapling fetcher
│   └── web_browse.ts         # Interactive browser automation (agent-browser)
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
- **Shared utilities** — `utils/scrapling.ts` and `utils/agent-browser.ts` encapsulate the CLI wrappers and fallback logic; tool files import only from `utils/`, never from each other.
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
npx tsc --noEmit

# Verify external CLI dependencies
scrapling --help
agent-browser doctor
```

Pull requests welcome. Please keep changes scoped to a single tool or concern and follow [Conventional Commits](https://www.conventionalcommits.org/).

## License

MIT
