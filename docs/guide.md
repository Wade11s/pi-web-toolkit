# Usage Guide

## Which Tool When? — Decision Tree

```
User asks about something external / current
│
├─→ web_search("...")
│   │
│   ├─→ 1 relevant result?
│   │   └─→ web_fetch(url)                     ← no interaction needed
│   │   OR
│   │   └─→ web_browse(url, actions)           ← needs interaction
│   │
│   └─→ 2–5 relevant results?
│       ├─→ All need no interaction?
│       │   └─→ web_batch_fetch(urls[])        ← parallel fetch
│       └─→ Some need interaction?
│           └─→ web_fetch (no-interaction ones)
│               web_browse (interactive ones)  ← sequential
│
└─→ User provides a URL directly
    ├─→ No interaction needed / loads on first request?
    │   └─→ web_fetch(url)
    └─→ Needs clicking / scrolling / waiting?
        └─→ web_browse(url, actions)
```

---

## Tool Comparison

| | `web_fetch` | `web_browse` | `web_batch_fetch` |
|--|-------------|--------------|-------------------|
| **Pages** | 1 | 1 | 1–15 (2–5 recommended) |
| **Browser** | Yes (Scrapling) | Yes (agent-browser) | Yes (Scrapling) |
| **Interaction** | ❌ No | ✅ Click, fill, scroll, wait | ❌ No |
| **Selector** | ✅ Per-URL | ✅ Final state | ✅ Applied to all |
| **Stealthy** | ✅ Yes | ❌ No | ✅ Yes |
| **Speed** | Fast | Slower (browser ops) | Medium (parallel) |
| **Best for** | Articles, docs, blogs | SPAs, forms, pagination | Research synthesis |

`web_fetch` falls back to HTTP GET after a normal browser fetch fails, but not in stealthy mode. `web_batch_fetch` falls back to GET after failed browser fetches in all modes.

---

## Firecrawl Keyless fallback

When a local backend cannot do the job, the tools automatically retry through **Firecrawl Keyless** (1,000 free credits/month, no API key, no signup) before giving up. It is **fallback-only** — never the primary path — and is **opt-out-able** with `PI_WEB_FIRECRAWL_FALLBACK=0`. Requires the optional `firecrawl-cli` (`npm install -g firecrawl-cli`); if it is absent the tools simply surface the original local error. Agents should call `web_search`/`web_fetch`/`web_browse` first and call `firecrawl_*` directly only after the corresponding local-first tool failed, or when the user explicitly asks for Firecrawl/cloud behavior.

| Tool | Falls back to Firecrawl when… |
|------|-------------------------------|
| `web_search` | SearXNG errors out **or** returns zero results |
| `web_fetch` | scrapling (incl. its HTTP-GET fallback) fails — anti-bot, heavy JS, PDFs |
| `web_browse` | agent-browser is missing or its batch fails (not on caller validation errors) |
| `web_batch_fetch` | (no fallback — Firecrawl batch scrape is not keyless) |

The three `firecrawl_*` tools are fallback-only explicit escape hatches for capabilities the local backends lack (`github`/`research`/`pdf` search categories, cloud rendering, natural-language interaction). They are not the first step for ordinary URL reading; `web_fetch` already performs Firecrawl fallback internally when local fetching fails.

**Graceful skip.** If the fallback itself cannot help — the CLI is missing, the IP is flagged as suspicious, the keyless quota is exhausted, or the fallback is disabled — the tool falls through to the original local-tool error so the user is never left worse off.

**Credit budgeting.** Search ≈ 2 credits / 10 results, scrape ≈ 1 credit / page, interact ≈ 2 credits/min (code-only) or ≈ 7 credits/min (AI prompt). Results report `creditsUsed` where the source provides it. The fallback stays conservative (small limits) against the 1,000 credits/month allowance.

**Privacy.** Firecrawl is a cloud service: when the fallback runs, the URL/query and page content leave the machine. Set `PI_WEB_FIRECRAWL_FALLBACK=0` to enforce a strict local-only, no-cloud-egress policy. The fallback is **keyless-only** — it never reads, stores, or sends an API key, and spawns the CLI under an isolated temporary `HOME`.

---
