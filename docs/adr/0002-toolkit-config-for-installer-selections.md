# Toolkit config for installer selections

The installer writes selected pi-web-toolkit runtime options, especially the SearXNG endpoint, Firecrawl fallback policy, Firecrawl runner, and discovered external CLI paths, to `${XDG_CONFIG_HOME:-~/.config}/pi-web-toolkit/config.json` instead of modifying shell profiles or relying only on transient environment variables. Environment variables keep highest precedence, but the toolkit config gives installer choices persistent effect after restarting pi without changing the user's shell startup files.

Toolkit config semantics live behind the shared config core (`extensions/utils/config-core.cjs`): schema, defaults, precedence, validation, and write/merge behavior are shared by runtime TypeScript helpers, installer writes, and doctor-mode reporting.
