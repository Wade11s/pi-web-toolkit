# Test Suite

Organised by module. Content-preview tests use committed fixtures, baselines, and generated snapshots; agent-browser tests cover parser behavior without launching a browser.

## Structure

```
test/
├── README.md                ← you are here
├── agent-browser/
│   └── test.ts              ← agent-browser batch JSON parser tests
├── content-preview/         ← extractPreview tests
│   ├── README.md
│   ├── test.ts
│   ├── fixtures/            ← raw scrapling output (cached, never hand-edited)
│   ├── baselines/           ← approved regression outputs
│   └── snapshots/           ← latest outputs + summary report
```

## Conventions

- **Fixture naming**: `{site-type}.md` — all lowercase, kebab-case.
- **Snapshot naming**: matches fixture name (`{name}.txt`).
- **Summary report**: `snapshots/summary.md` — human-readable table of all results.
- **No hand-editing fixtures** — they are scraped output. If a site changes, delete the fixture and re-run the test.
- **Snapshots are committed generated artifacts** — they show the latest test output and make review diffs visible alongside approved baselines.
