# Test Suite

Organised by module. Content-preview tests use committed fixtures, baselines, and generated snapshots; CLI-wrapper and installer tests avoid real network, browser, Docker, package-manager, and pi mutations.

## Structure

```
test/
├── README.md                ← you are here
├── agent-browser/
│   └── test.ts              ← agent-browser batch JSON parser tests
├── config/
│   └── test.ts              ← toolkit config precedence and validation tests
├── content-preview/         ← extractPreview tests
│   ├── README.md
│   ├── test.ts
│   ├── fixtures/            ← raw scrapling output (cached, never hand-edited)
│   ├── baselines/           ← approved regression outputs
│   └── snapshots/           ← latest outputs + summary report
├── firecrawl/
│   └── test.ts              ← Firecrawl CLI wrapper pure-function tests
├── installer/
│   └── test.ts              ← install.sh behavior tests with stubbed commands
├── tool-routing/
│   └── test.ts              ← prompt-routing contract tests
└── web-search/
    └── test.ts              ← SearXNG-first fallback behavior tests
```

## Conventions

- **Fixture naming**: `{site-type}.md` — all lowercase, kebab-case.
- **Snapshot naming**: matches fixture name (`{name}.txt`).
- **Summary report**: `snapshots/summary.md` — human-readable table of all results.
- **No hand-editing fixtures** — they are scraped output. If a site changes, delete the fixture and re-run the test.
- **Snapshots are committed generated artifacts** — they show the latest test output and make review diffs visible alongside approved baselines.
- **Installer tests** must run through `install.sh`'s public CLI and stub external commands instead of invoking real package managers, Docker, network endpoints, or `pi install`.
