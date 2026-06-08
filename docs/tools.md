# Tool Reference

## `web_search`

Search the web via SearXNG. Returns ranked results with title, URL, and snippet. Automatically aggregates up to 3 pages of SearXNG results when more than ~20 are needed.

```typescript
{
  query: string,           // Search query
  language?: string,       // Language code (en, de, fr...). Default: "auto"
  results?: number,        // Max results (1–60). Default: 20. Automatically pages through SearXNG (up to 3 pages) if needed.
}
```

**When to use:** The user asks about current events, facts, or anything requiring up-to-date information. This is always the **first step** of web research.

**Empty results behavior:** When no results are found, `web_search` returns a list of **suggestions** — alternative queries that SearXNG believes may yield better results. The agent can use these suggestions to automatically refine and retry the search.

**Pagination:** `web_search` automatically fetches up to 3 pages from SearXNG and deduplicates by URL. You do not need to call it multiple times for deeper results.

---

## `web_fetch`

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

## `web_browse`

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
- The page requires **clicking** before showing target content (e.g. "Load more", pagination, tab switching)
- The page requires **filling a form** (e.g. search box, login)
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

## `web_batch_fetch`

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
