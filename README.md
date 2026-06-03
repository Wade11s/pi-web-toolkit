# pi-web-toolkit

Web research toolkit for [pi](https://pi.dev) agents. Search, fetch, browse, and batch-read the web.

## Features

| Tool | Purpose |
|------|---------|
| **`web_search`** | Search the web via SearXNG |
| **`web_fetch`** | Fetch a single static page as clean markdown |
| **`web_browse`** | Interact with a page (click, scroll, fill) then extract content |
| **`web_batch_fetch`** | Fetch 2–10 pages in parallel for research synthesis |

## Installation

### Option 1: From npm (recommended)

```bash
pi install pi-web-toolkit
```

### Option 2: From GitHub

```bash
pi install git:github.com/Wade11s/pi-web-toolkit
```

## Requirements

- **Node.js ≥ 20** — for running pi extensions
- **SearXNG** — for `web_search`
  ```bash
  # Set your SearXNG instance URL (default: http://localhost:8080)
  export SEARXNG_URL="http://localhost:8080"

  # Self-host with Docker
  docker run -d -p 8080:8080 -v searxng:/etc/searxng searxng/searxng
  ```
- **scrapling** — for `web_fetch` and `web_batch_fetch`
  ```bash
  # recommended: install scrapling via uv
  uv tool install "scrapling[all]"
  scrapling install
  ```
- **agent-browser** — for `web_browse`
  ```bash
  npm i -g agent-browser && agent-browser install
  ```
  Verify installation:
  ```bash
  agent-browser doctor
  ```

## Project Structure

```
pi-web-toolkit/
├── extensions/
│   ├── utils/
│   │   └── scrapling.ts    # scrapling CLI wrapper
│   ├── web_search.ts       # web_search
│   ├── web_fetch.ts        # web_fetch
│   ├── web_browse.ts       # web_browse (agent-browser)
│   └── web_batch_fetch.ts  # web_batch_fetch
├── docs/
│   ├── tools.md
│   └── guide.md
├── package.json
├── README.md
└── LICENSE
```

## Reference

- [Tool Reference](docs/tools.md) — Full parameter specs and usage examples for each tool.
- [Usage Guide](docs/guide.md) — Decision tree and tool comparison.

## License

MIT
