# Repository Guidelines

## Project Structure & Module Organization

```
pi-web-toolkit/
├── extensions/              # Source code (TypeScript)
│   ├── index.ts             # Unified extension entry point — registers all tools
│   ├── web_search.ts        # SearXNG search tool
│   ├── web_fetch.ts         # Single-page fetch via scrapling
│   ├── web_browse.ts        # Interactive browser automation via agent-browser
│   ├── web_batch_fetch.ts   # Parallel multi-page fetching
│   └── utils/
│       └── scrapling.ts     # scrapling CLI wrapper
├── docs/                    # Documentation
│   ├── tools.md             # Full parameter specs and usage examples
│   └── guide.md             # Decision tree and tool comparison
├── package.json
├── README.md
└── LICENSE
```

All tools are registered from `extensions/index.ts`. Each tool lives in its own file and exports a default registration function.

## Build, Test, and Development Commands

This is a pi extension package; it is loaded directly by the pi agent runtime and does not require a build step.

```bash
# Install peer dependencies locally for type-checking
npm install

# Test the extension in a local pi environment
pi install ./

# Verify scrapling dependency
scrapling doctor

# Verify agent-browser dependency
agent-browser doctor
```

There is no test suite currently. Manual verification against a running pi instance is the primary validation method.

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

There is no automated test suite at this time. When adding or modifying a tool:

1. Install the extension locally with `pi install ./`
2. Exercise the tool through the pi agent interface
3. Verify happy paths and common error cases (timeouts, missing CLI dependencies, network failures)
4. Ensure output truncation and temp-file fallback behavior works for large results

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

- `web_search` is always the **first step** in web research
- Prefer `web_fetch` for static pages; use `web_browse` only when interaction is required
- Use `web_batch_fetch` for 2–5 pages at once; never exceed 10 URLs in a single call
- All tools respect `AbortSignal` for cancellation and truncate large outputs automatically
- External CLI dependencies (`scrapling`, `agent-browser`) must be installed separately by the end user

## Agent skills

### Issue tracker

GitHub (`Wade11s/pi-web-toolkit`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo. See `docs/agents/domain.md`.
