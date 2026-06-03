# pi-searxng

Web research toolkit for [pi](https://pi.dev) agents. Search, fetch, browse, and batch-read the web.

## Features

| Tool | Purpose |
|------|---------|
| **`web_search`** | Search the web via SearXNG |
| **`web_fetch`** | Fetch a single static page as clean markdown |
| **`web_browse`** | Interact with a page (click, scroll, fill) then extract content |
| **`web_batch_fetch`** | Fetch 2–10 pages in parallel for research synthesis |

## Installation

### Option 1: Project-local (recommended)

```bash
# From your project root
mkdir -p .pi/extensions
ln -s /path/to/pi-searxng .pi/extensions/pi-searxng
```

### Option 2: Global

```bash
ln -s /path/to/pi-searxng ~/.pi/agent/extensions/pi-searxng
```

### Option 3: As a pi package

```bash
pi install git:github.com/yourname/pi-searxng
```

## Configuration

```bash
# SearXNG instance URL (default: http://localhost:8080)
export SEARXNG_URL="http://localhost:8080"
```

**Self-host SearXNG:**
```bash
docker run -d -p 8080:8080 -v searxng:/etc/searxng searxng/searxng
```

## Tool Reference

### `web_search`

Search the web via SearXNG. Returns ranked results with title, URL, and snippet.

```typescript
{
  query: string,           // Search query
  language?: string,       // Language code (en, de, fr...). Default: "auto"
  results?: number,        // Max results (1–50). Default: 10
}
```

**When to use:** The user asks about current events, facts, or anything requiring up-to-date information. This is always the **first step** of web research.

---

### `web_fetch`

Fetch a single page and convert it to clean markdown. Uses scrapling's browser automation for JS-heavy sites.

```typescript
{
  url: string,             // Full URL
  selector?: string,       // CSS selector to extract only a specific area
  stealthy?: boolean,      // Anti-bot mode for protected sites. Default: false
}
```

**When to use:**
- After `web_search` finds a relevant result
- The page is static or loads its content on first request
- You need to read **one** article, doc, or blog post

**Example flow:**
```
User: "What's the latest Rust release?"
→ web_search("latest Rust programming language release")
→ web_fetch("https://blog.rust-lang.org/2026/06/02/maintainers-fund/")
→ Agent answers with full context
```

---

### `web_browse`

Open a real browser, perform a chain of actions (click, fill, scroll, wait), then extract content.

Uses the [agent-browser](https://github.com/vercel-labs/agent-browser) CLI for native browser automation via Chrome CDP.

```typescript
{
  url: string,
  actions: Array<
    | { type: "click", selector: string }
    | { type: "fill", selector: string, value: string }
    | { type: "type", selector: string, value: string }
    | { type: "press", key: string, selector?: string }
    | { type: "wait", ms: number }
    | { type: "wait_selector", selector: string, state?: "attached" | "visible" | "hidden" }
    | { type: "scroll", direction: "down" | "up" | "bottom" | "top", amount?: number }
  >,
  selector?: string,       // Extract content from final page state
  headless?: boolean,      // Default: true
  timeout?: number,        // Overall browser batch timeout (ms). Default: 30000
}
```

**When to use:**
- The page requires **clicking** before showing target content (e.g., "Load more", pagination, tab switching)
- The page requires **filling a form** (e.g., search box, login)
- The page requires **scrolling** to load lazy content (infinite scroll)
- The page requires **waiting** for JS to render content (SPA)

**Example flows:**

```
# Click "Load more" twice, then extract articles
→ web_browse({
    url: "https://news.example.com",
    actions: [
      { type: "click", selector: "button.load-more" },
      { type: "wait", ms: 1000 },
      { type: "click", selector: "button.load-more" },
      { type: "wait", ms: 1000 },
    ],
    selector: "article"
  })

# Fill a search form and press Enter
→ web_browse({
    url: "https://duckduckgo.com",
    actions: [
      { type: "fill", selector: "#searchbox_input", value: "async rust" },
      { type: "press", key: "Enter" },
      { type: "wait_selector", selector: "[data-result]", state: "visible" },
    ],
    selector: "[data-result]"
  })

# Scroll to bottom of infinite-scroll page
→ web_browse({
    url: "https://social.example.com/user/posts",
    actions: [
      { type: "scroll", direction: "bottom" },
      { type: "wait", ms: 1500 },
      { type: "scroll", direction: "bottom" },
    ],
    selector: ".post"
  })
```

---

### `web_batch_fetch`

Fetch multiple pages in parallel and return aggregated content.

```typescript
{
  urls: string[],          // 1–10 URLs
  selector?: string,       // CSS selector applied to ALL pages
  stealthy?: boolean,      // Default: false
  max_concurrency?: number // Parallel fetches (1–5). Default: 3
}
```

**When to use:**
- After `web_search` returns **2–5 relevant results** that you want to read simultaneously
- Cross-referencing multiple sources for the same topic
- Comparing implementations across different docs/pages
- Research synthesis requiring multiple sources

**NOT for:** Single pages (use `web_fetch` — simpler and supports per-URL stealthy mode).

**Example flow:**
```
User: "Compare Python asyncio, Trio, and curio"
→ web_search("Python asyncio vs Trio vs curio comparison")
→ web_batch_fetch({
    urls: [
      "https://docs.python.org/3/library/asyncio.html",
      "https://trio.readthedocs.io/",
      "https://curio.readthedocs.io/",
    ],
    selector: "article, .section, main",
    max_concurrency: 3,
  })
→ Agent synthesizes comparison from all 3 sources
```

---

## Which Tool When? — Decision Tree

```
User asks about something external / current
│
├─→ web_search("...")
│   │
│   ├─→ 1 relevant result?
│   │   └─→ web_fetch(url)                     ← static page
│   │   OR
│   │   └─→ web_browse(url, actions)           ← needs interaction
│   │
│   └─→ 2–5 relevant results?
│       ├─→ All static pages?
│       │   └─→ web_batch_fetch(urls[])        ← parallel fetch
│       └─→ Some need interaction?
│           └─→ web_fetch (static ones)
│               web_browse (interactive ones)  ← sequential
│
└─→ User provides a URL directly
    ├─→ Static / loads on first request?
    │   └─→ web_fetch(url)
    └─→ Needs clicking / scrolling / waiting?
        └─→ web_browse(url, actions)
```

## Tool Comparison

| | `web_fetch` | `web_browse` | `web_batch_fetch` |
|--|-------------|--------------|-------------------|
| **Pages** | 1 | 1 | 2–10 |
| **Browser** | Yes (scrapling) | Yes (agent-browser) | Yes (scrapling) |
| **Interaction** | ❌ No | ✅ Click, fill, scroll, wait | ❌ No |
| **Selector** | ✅ Per-URL | ✅ Final state | ✅ Applied to all |
| **Stealthy** | ✅ Yes | ❌ No (planned) | ✅ Yes |
| **Speed** | Fast | Slower (browser ops) | Medium (parallel) |
| **Best for** | Articles, docs, blogs | SPAs, forms, pagination | Research synthesis |

## Requirements

- **Node.js / pi** — for running extensions
- **SearXNG** — for `web_search`
- **scrapling** — for `web_fetch` and `web_batch_fetch`
  ```bash
  pip install "scrapling[all]"
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
pi-searxng/
├── extensions/
│   ├── web_search.ts       # web_search
│   ├── web_fetch.ts        # web_fetch
│   ├── web_browse.ts       # web_browse (agent-browser)
│   └── web_batch_fetch.ts  # web_batch_fetch
├── package.json
└── README.md
```

## License

MIT
