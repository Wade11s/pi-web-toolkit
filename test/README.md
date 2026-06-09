# Test Suite

Organised by module. Each subdirectory owns its own fixtures, test script, and snapshots.

## Structure

```
test/
├── README.md                ← you are here
├── content-preview/         ← extractPreview tests
│   ├── README.md
│   ├── test.ts
│   ├── fixtures/            ← raw scrapling output (cached, never hand-edited)
│   └── snapshots/           ← extractPreview results + summary report
├── output-sink/             ← (future) writeWithFallback tests
│   ├── test.ts
│   └── snapshots/
└── cli-runner/              ← (future) runCLI tests
    ├── test.ts
    └── snapshots/
```

## Conventions

- **Fixture naming**: `{site-type}.md` — all lowercase, kebab-case.
- **Snapshot naming**: matches fixture name (`{name}.txt`).
- **Summary report**: `snapshots/summary.md` — human-readable table of all results.
- **No hand-editing fixtures** — they are scraped output. If a site changes, delete the fixture and re-run the test.
- **Snapshots are `.gitignore`-friendly** — they are generated artifacts. Fixtures are the only committed test data.
