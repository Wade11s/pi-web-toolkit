# Repository Guidelines

## Project Structure & Module Organization

```
pi-web-toolkit/
├── extensions/              # Source code (TypeScript)
│   ├── index.ts             # Unified extension entry point — registers all tools
│   ├── web_search.ts        # SearXNG search tool (+ Firecrawl fallback)
│   ├── web_fetch.ts         # Single-page fetch via scrapling (+ Firecrawl fallback)
│   ├── web_browse.ts        # Interactive browser automation via agent-browser (+ Firecrawl fallback)
│   ├── web_batch_fetch.ts   # Parallel multi-page fetching
│   ├── firecrawl_search.ts  # Firecrawl keyless search escape hatch
│   ├── firecrawl_scrape.ts  # Firecrawl keyless single-page fetch escape hatch
│   ├── firecrawl_interact.ts # Firecrawl keyless natural-language interaction escape hatch
│   └── utils/
│       ├── agent-browser.ts # agent-browser CLI execution adapter and parser
│       ├── browser-action-language.ts # Shared web_browse action semantics and planning
│       ├── config.ts        # TypeScript wrapper for toolkit config semantics
│       ├── config-core.cjs  # Shared config schema/defaults/precedence/write CLI for runtime + installer
│       ├── cli-runner.ts    # Shared external CLI process runner
│       ├── content-preview.ts # Structural preview extraction
│       ├── firecrawl.ts     # Firecrawl Keyless seam: search/scrape/interact + fallback decisions
│       ├── page-extraction.ts # Shared Scrapling page reads, previews, and output fallback
│       ├── output-sink.ts   # Truncation and temp-file fallback
│       ├── render-helpers.ts # Shared TUI formatting helpers
│       └── scrapling.ts     # scrapling CLI wrapper
├── docs/                    # Documentation
│   ├── tools.md             # Full parameter specs and usage examples
│   ├── guide.md             # Decision tree and tool comparison
│   └── agents/              # Issue tracker, triage and domain guidance
├── test/                    # Automated regression tests
├── package.json
├── README.md
└── LICENSE
```

All tools are registered from `extensions/index.ts`. Each tool lives in its own file and exports a default registration function.

## Build, Test, and Development Commands

This is a pi extension package; it is loaded directly by the pi agent runtime and does not require a build step.

```bash
# Install local development and peer dependencies
npm install

# Test the extension in a local pi environment
pi install ./

# Run automated tests and type-checking
npm test
npm run typecheck

# Verify scrapling dependency
scrapling --help

# Verify agent-browser dependency
agent-browser doctor
```

The automated suite covers content-preview behavior, page extraction, Firecrawl Keyless behavior, browser action semantics, presentation-helper structure, and agent-browser output parsing. Manual verification against a running pi instance is still required for end-to-end tool behavior.

## Coding Style & Naming Conventions

- **Indentation**: 2 spaces
- **Quotes**: Double quotes for strings
- **Semicolons**: Required
- **Language**: TypeScript with explicit types; avoid `any`
- **Tool names**: `snake_case` (e.g., `web_search`, `web_batch_fetch`)
- **Schemas**: Export as `PascalCase + ParamsSchema` (e.g., `WebSearchParamsSchema`)
- **Types**: Export input types as `PascalCase + Input` (e.g., `WebSearchInput`)
- **Registration**: Default export function that accepts `ExtensionAPI` and calls `pi.registerTool(...)`
- **Comments**: Start each file with a JSDoc block describing the tool’s purpose and requirements

## Testing Guidelines

When adding or modifying a tool:

1. Run `npm test` and `npm run typecheck`
2. Install the extension locally with `pi install ./`
3. Exercise the tool through the pi agent interface
4. Verify happy paths and common error cases (timeouts, missing CLI dependencies, network failures)
5. Ensure output truncation and temp-file fallback behavior works for large results

## Commit & Pull Request Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>
```

Common types: `feat`, `fix`, `chore`, `docs`.

Examples:
- `feat: add stealthy mode to web_fetch`
- `fix: handle empty result sets in web_search`
- `chore: bump version to 0.1.2`

Pull requests should:
- Include a clear description of the change
- Reference any related issues
- Keep changes scoped to a single tool or concern
- Update `docs/tools.md` if parameters or behavior change
- Update `CHANGELOG.md` only when cutting a new release (bumping version)

### Commit Message Template

When a single change touches multiple dimensions (logic, UI, docs, meta), use a scoped title and categorize the body:

```
<type>(<scope>): <short description>

Core:
- <execute-level change>
- <schema / API change>
- <backend logic change>

UI:
- <renderCall / renderResult change>
- <TUX / visual change>
- <keybinding or interaction change>

Docs:
- <README / tools.md / guide.md change>

Meta:
- <CI / build / repo governance change>
```

Allowed categories: `Core`, `UI`, `Docs`, `Meta`. Omit empty categories.

Example:
```
feat(web_search): auto-paginate up to 3 pages and redesign TUI

Core:
- Increase max results from 50 to 60, default from 10 to 20
- Auto-paginate up to 3 SearXNG pages with URL deduplication
- Always write full output to temp file (not only when truncated)

UI:
- Collapsed: top 3 by score as 'Title [engine]'
- Expanded (Ctrl+O): top 10 cards with title|engine|score, URL,
  and 120-char snippet preview
- Full output path rendered in accent color

Docs:
- Sync README and tools.md with new limits and pagination behavior
- Sync guide.md: web_batch_fetch page limit 2-10 → 2-15

Meta:
- Add CHANGELOG update policy to AGENTS.md
```

## Agent-Specific Instructions

- `web_search` is the first discovery step when the user has not already provided source URLs
- Prefer `web_fetch` for pages that need no interaction; use `web_browse` when interaction is required
- Use `web_batch_fetch` for 2–5 pages at once; never exceed its 15-URL schema limit
- All tools respect `AbortSignal` for cancellation and truncate large outputs automatically
- External CLI dependencies (`scrapling`, `agent-browser`) must be installed separately by the end user

## Agent skills

### Issue tracker

GitHub (`Wade11s/pi-web-toolkit`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo. See `docs/agents/domain.md`.
