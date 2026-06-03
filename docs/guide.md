# Usage Guide

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

---

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
