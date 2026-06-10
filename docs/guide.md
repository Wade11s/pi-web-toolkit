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
