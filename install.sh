#!/usr/bin/env bash
set -Eeuo pipefail

VERSION="0.3.3"
USER_AGENT="pi-web-toolkit-installer/${VERSION} (+https://github.com/Wade11s/pi-web-toolkit)"
PUBLIC_INSTANCES_URL="https://searx.space/data/instances.json"
LOCAL_SEARXNG_CONTAINER="pi-web-toolkit-searxng"
DEFAULT_SEARXNG_PORT="8080"

YES=0
DOCTOR=0
LOCAL_INSTALL=0
DEPS_ONLY=0
EXTENSION_ONLY=0
AGENT_BROWSER_WITH_DEPS=0
SEARXNG_URL_ARG=""
AUTO_SEARXNG=""
FIRECRAWL_CHOICE=""
FIRECRAWL_RUNNER="installed"
SEARXNG_PORT="$DEFAULT_SEARXNG_PORT"

CONFIG_FILE="${PI_WEB_TOOLKIT_CONFIG:-${XDG_CONFIG_HOME:-$HOME/.config}/pi-web-toolkit/config.json}"
CONFIG_DIR="$(dirname "$CONFIG_FILE")"
SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" >/dev/null 2>&1 && pwd -P || pwd)"
CONFIG_CORE="${PI_WEB_TOOLKIT_CONFIG_CORE:-$SCRIPT_DIR/extensions/utils/config-core.cjs}"
CONFIG_CORE_URL="${PI_WEB_TOOLKIT_CONFIG_CORE_URL:-https://raw.githubusercontent.com/Wade11s/pi-web-toolkit/main/extensions/utils/config-core.cjs}"
if [ ! -f "$CONFIG_CORE" ] && [ -f "$(pwd)/extensions/utils/config-core.cjs" ]; then
  CONFIG_CORE="$(pwd)/extensions/utils/config-core.cjs"
fi
CONFIG_CORE_FETCHED=""

SELECTED_SEARXNG_URL=""
SCRAPLING_BIN=""
AGENT_BROWSER_BIN=""
FIRECRAWL_BIN=""
FIRECRAWL_FALLBACK=""
SEARXNG_SOURCE=""
FAIL_COUNT=0

usage() {
  cat <<'USAGE'
pi-web-toolkit installer

Usage:
  install.sh [options]

Options:
  --yes, -y                       Accept safe non-interactive defaults
  --doctor                        Verify readiness without changing anything
  --searxng-url URL               Use and verify an existing SearXNG endpoint
  --auto-searxng public           Explicitly auto-select a verified public endpoint
  --auto-searxng local-docker     Explicitly start/reuse isolated local Docker SearXNG
  --searxng-port PORT             Local Docker SearXNG port (default: 8080)
  --with-firecrawl                Install/enable optional Firecrawl keyless fallback CLI
  --no-firecrawl                  Skip/disable optional Firecrawl fallback
  --firecrawl-runner installed|npx|bunx
                                  Explicit Firecrawl runner (default: installed)
  --agent-browser-with-deps       Use agent-browser install --with-deps (Linux)
  --local                         Install the pi package from the current checkout
  --deps-only                     Install dependencies/config only, skip pi install
  --extension-only                Install the pi package only, skip dependency install
  --config PATH                   Toolkit config path (also exported as PI_WEB_TOOLKIT_CONFIG)
  --help, -h                      Show this help

Examples:
  curl -fsSL https://raw.githubusercontent.com/Wade11s/pi-web-toolkit/main/install.sh | bash
  ./install.sh --yes --searxng-url https://searxng.example --no-firecrawl
  ./install.sh --doctor
USAGE
}

log() { printf '%s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*" >&2; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

status() {
  local state="$1"
  local label="$2"
  printf '%-8s %s\n' "$state" "$label"
  if [ "$state" = "FAIL" ]; then
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

is_interactive() {
  [ "$YES" -eq 0 ] && [ -r /dev/tty ] && [ -w /dev/tty ]
}

read_tty() {
  local __var="$1"
  if ! IFS= read -r "$__var" < /dev/tty; then
    printf -v "$__var" '%s' ""
  fi
}

confirm() {
  local prompt="$1"
  local default="${2:-n}"
  local suffix="[y/N]"
  if [ "$default" = "y" ]; then suffix="[Y/n]"; fi
  if ! is_interactive; then
    [ "$default" = "y" ]
    return
  fi
  local answer
  printf '%s %s ' "$prompt" "$suffix"
  read_tty answer
  if [ -z "$answer" ]; then answer="$default"; fi
  case "$answer" in
    y|Y|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

normalize_url() {
  printf '%s' "$1" | sed 's#/*$##'
}

command_path() {
  command -v "$1" 2>/dev/null || true
}

resolve_executable_path() {
  local command_name="$1"
  local found
  found="$(command_path "$command_name")"
  if [ -n "$found" ]; then
    printf '%s' "$found"
    return 0
  fi
  if [ -x "$HOME/.local/bin/$command_name" ]; then
    printf '%s' "$HOME/.local/bin/$command_name"
    return 0
  fi
  return 1
}

ensure_config_core() {
  if [ -f "$CONFIG_CORE" ]; then return 0; fi
  if [ -n "$CONFIG_CORE_FETCHED" ] && [ -f "$CONFIG_CORE_FETCHED" ]; then
    CONFIG_CORE="$CONFIG_CORE_FETCHED"
    return 0
  fi
  if command -v curl >/dev/null 2>&1; then
    local fetched
    fetched="$(mktemp)"
    if curl -fsSL -A "$USER_AGENT" "$CONFIG_CORE_URL" -o "$fetched" 2>/dev/null; then
      CONFIG_CORE_FETCHED="$fetched"
      CONFIG_CORE="$fetched"
      return 0
    fi
    rm -f "$fetched"
  fi
  die "Toolkit config core not found: $CONFIG_CORE. Run from a checkout or set PI_WEB_TOOLKIT_CONFIG_CORE."
}

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --yes|-y) YES=1; shift ;;
      --doctor) DOCTOR=1; shift ;;
      --local) LOCAL_INSTALL=1; shift ;;
      --deps-only) DEPS_ONLY=1; shift ;;
      --extension-only) EXTENSION_ONLY=1; shift ;;
      --agent-browser-with-deps) AGENT_BROWSER_WITH_DEPS=1; shift ;;
      --searxng-url)
        [ "$#" -ge 2 ] || die "--searxng-url requires a URL"
        SEARXNG_URL_ARG="$2"; shift 2 ;;
      --auto-searxng)
        [ "$#" -ge 2 ] || die "--auto-searxng requires public or local-docker"
        AUTO_SEARXNG="$2"
        case "$AUTO_SEARXNG" in public|local-docker) ;; *) die "--auto-searxng must be public or local-docker" ;; esac
        shift 2 ;;
      --searxng-port)
        [ "$#" -ge 2 ] || die "--searxng-port requires a port"
        SEARXNG_PORT="$2"; shift 2 ;;
      --with-firecrawl) FIRECRAWL_CHOICE="with"; shift ;;
      --no-firecrawl) FIRECRAWL_CHOICE="no"; shift ;;
      --firecrawl-runner)
        [ "$#" -ge 2 ] || die "--firecrawl-runner requires installed, npx, or bunx"
        FIRECRAWL_RUNNER="$2"
        case "$FIRECRAWL_RUNNER" in installed|npx|bunx) ;; *) die "--firecrawl-runner must be installed, npx, or bunx" ;; esac
        shift 2 ;;
      --config)
        [ "$#" -ge 2 ] || die "--config requires a path"
        CONFIG_FILE="$2"
        export PI_WEB_TOOLKIT_CONFIG="$CONFIG_FILE"
        CONFIG_DIR="$(dirname "$CONFIG_FILE")"
        shift 2 ;;
      --help|-h) usage; exit 0 ;;
      *) die "Unknown option: $1" ;;
    esac
  done

  if [ "$DEPS_ONLY" -eq 1 ] && [ "$EXTENSION_ONLY" -eq 1 ]; then
    die "--deps-only and --extension-only cannot be combined"
  fi
}

config_get() {
  local dotted_path="$1"
  [ -f "$CONFIG_FILE" ] || return 1
  ensure_config_core
  node "$CONFIG_CORE" raw-get "$CONFIG_FILE" "$dotted_path"
}

validate_config_if_present() {
  local missing_mode="${1:-optional}"
  if [ ! -f "$CONFIG_FILE" ]; then
    if [ "$missing_mode" = "required" ] && [ -n "${PI_WEB_TOOLKIT_CONFIG:-}" ]; then
      printf 'Toolkit config file not found: %s\n' "$CONFIG_FILE" >&2
      return 1
    fi
    return 0
  fi
  ensure_config_core
  node "$CONFIG_CORE" validate "$CONFIG_FILE"
}

runtime_searxng_url() {
  ensure_config_core
  node "$CONFIG_CORE" resolve "$CONFIG_FILE" searxng-url
}

runtime_firecrawl_enabled() {
  local enabled
  ensure_config_core
  enabled="$(node "$CONFIG_CORE" resolve "$CONFIG_FILE" firecrawl-enabled)" || return 1
  [ "$enabled" = "true" ]
}

runtime_command() {
  local key="$1"
  ensure_config_core
  node "$CONFIG_CORE" resolve "$CONFIG_FILE" command "$key"
}

runtime_firecrawl_runner() {
  ensure_config_core
  node "$CONFIG_CORE" resolve "$CONFIG_FILE" firecrawl-runner
}

command_is_available() {
  local cmd="$1"
  if [ -x "$cmd" ]; then return 0; fi
  command -v "$cmd" >/dev/null 2>&1
}

verify_json_results() {
  node -e 'let s=""; process.stdin.on("data", d => s += d); process.stdin.on("end", () => { try { const j = JSON.parse(s); process.exit(Array.isArray(j.results) ? 0 : 1); } catch { process.exit(1); } });'
}

verify_searxng_url() {
  local base
  base="$(normalize_url "$1")"
  local body
  if ! body="$(curl -fsSL -A "$USER_AGENT" --get "$base/search" --data-urlencode "q=pi-web-toolkit" --data "format=json" 2>/dev/null)"; then
    return 1
  fi
  printf '%s' "$body" | verify_json_results
}

port_has_http_service() {
  local base
  base="$(normalize_url "$1")"
  curl -fsSL -A "$USER_AGENT" --max-time 2 "$base/" >/dev/null 2>&1
}

check_node_required() {
  if ! command -v node >/dev/null 2>&1; then
    status FAIL "Node.js 22+ missing. Install Node.js 22+ before running this installer."
    return
  fi
  if node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)' >/dev/null 2>&1; then
    status OK "Node.js $(node -v)"
  else
    status FAIL "Node.js $(node -v) is too old; install Node.js 22+."
  fi
}

check_command_required() {
  local cmd="$1"
  local label="$2"
  local hint="$3"
  if command -v "$cmd" >/dev/null 2>&1; then
    local version=""
    case "$cmd" in
      npm|pi|uv) version="$($cmd --version 2>/dev/null | head -n 1 || true)" ;;
    esac
    if [ -n "$version" ]; then status OK "$label $version"; else status OK "$label"; fi
  else
    status FAIL "$label missing. $hint"
  fi
}

check_prerequisites() {
  FAIL_COUNT=0
  check_node_required
  check_command_required npm npm "Install npm with Node.js 22+."
  check_command_required pi pi "Install pi first: curl -fsSL https://pi.dev/install.sh | sh"
  check_command_required curl curl "Install curl with your OS package manager."
  check_command_required openssl OpenSSL "Install OpenSSL with your OS package manager."
  check_command_required uv uv "Install uv from https://docs.astral.sh/uv/ before installing Scrapling."
}

ensure_prerequisites_or_exit() {
  check_prerequisites
  if [ "$FAIL_COUNT" -ne 0 ]; then
    die "Missing required prerequisites; no system-level packages were installed."
  fi
}

select_existing_searxng_url() {
  local candidate="$1"
  local source="$2"
  candidate="$(normalize_url "$candidate")"
  log "Verifying SearXNG endpoint ($source): $candidate"
  if verify_searxng_url "$candidate"; then
    SELECTED_SEARXNG_URL="$candidate"
    SEARXNG_SOURCE="$source"
    return 0
  fi
  return 1
}

discover_public_searxng() {
  local raw candidates verified
  raw="$(curl -fsSL -A "$USER_AGENT" "$PUBLIC_INSTANCES_URL")" || return 1
  candidates="$(mktemp)"
  verified="$(mktemp)"
  printf '%s' "$raw" | node -e '
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(0, "utf8"));
const rows = [];
for (const [url, meta] of Object.entries(data.instances || {})) {
  if (meta.main !== true) continue;
  if (meta.network_type !== "normal") continue;
  if (!meta.http || meta.http.status_code !== 200 || meta.http.error) continue;
  if (meta.generator !== "searxng") continue;
  const uptime = meta.uptime || {};
  const timing = meta.timing || {};
  const search = timing.search || {};
  const all = search.all || {};
  const month = Number(uptime.uptimeMonth || 0);
  const year = Number(uptime.uptimeYear || 0);
  const success = Number(search.success_percentage || 0);
  const median = Number(all.median || 999);
  if (month < 95 || success < 80) continue;
  const analyticsPenalty = meta.analytics ? 0.5 : 0;
  const score = (month / 100) * 2 + (year / 100) + (success / 100) * 2 - Math.min(median, 10) / 10 - analyticsPenalty;
  rows.push({ score, url, month, year, success, median, analytics: Boolean(meta.analytics) });
}
rows.sort((a, b) => b.score - a.score);
for (const row of rows.slice(0, 20)) {
  console.log([row.score.toFixed(3), row.url, row.month, row.year, row.success, row.median, row.analytics].join("\t"));
}
' > "$candidates"

  local checked=0 found=0
  while IFS=$'\t' read -r score url month year success median analytics; do
    [ -n "$url" ] || continue
    checked=$((checked + 1))
    if verify_searxng_url "$url"; then
      printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$url" "$month" "$year" "$success" "$median" "$analytics" >> "$verified"
      found=$((found + 1))
      [ "$found" -ge 5 ] && break
    fi
    [ "$checked" -ge 20 ] && break
    sleep 1
  done < "$candidates"

  if [ "$found" -eq 0 ]; then
    rm -f "$candidates" "$verified"
    return 1
  fi

  if [ "$AUTO_SEARXNG" = "public" ] || ! is_interactive; then
    IFS=$'\t' read -r url month year success median analytics < "$verified"
    SELECTED_SEARXNG_URL="$(normalize_url "$url")"
    SEARXNG_SOURCE="public SearXNG endpoint from searx.space"
    log "Selected public SearXNG endpoint: $SELECTED_SEARXNG_URL (uptime month ${month}%, year ${year}%, median ${median}s)"
    rm -f "$candidates" "$verified"
    return 0
  fi

  log "Found JSON-capable public SearXNG endpoints (queries leave your machine):"
  local i=1
  while IFS=$'\t' read -r url month year success median analytics; do
    printf '  [%s] %s\n      uptime: month %s%%, year %s%%; search success: %s%%; median: %ss; analytics: %s\n' "$i" "$url" "$month" "$year" "$success" "$median" "$analytics"
    i=$((i + 1))
  done < "$verified"
  printf 'Choose endpoint [1-%s], or press Enter to use [1]: ' "$found"
  local choice
  read_tty choice
  [ -n "$choice" ] || choice="1"
  case "$choice" in ''|*[!0-9]*) rm -f "$candidates" "$verified"; return 1 ;; esac
  if [ "$choice" -lt 1 ] || [ "$choice" -gt "$found" ]; then rm -f "$candidates" "$verified"; return 1; fi
  url="$(sed -n "${choice}p" "$verified" | cut -f1)"
  SELECTED_SEARXNG_URL="$(normalize_url "$url")"
  SEARXNG_SOURCE="public SearXNG endpoint from searx.space"
  rm -f "$candidates" "$verified"
  return 0
}

ensure_local_docker_searxng() {
  if ! command -v docker >/dev/null 2>&1; then
    die "Docker is required for --auto-searxng local-docker. Install/start Docker and retry."
  fi

  local base="http://127.0.0.1:${SEARXNG_PORT}"
  if verify_searxng_url "$base"; then
    SELECTED_SEARXNG_URL="$base"
    SEARXNG_SOURCE="existing local SearXNG endpoint"
    log "Using existing JSON-capable SearXNG at $base"
    return 0
  fi

  while port_has_http_service "$base"; do
    if ! is_interactive; then
      die "Port ${SEARXNG_PORT} is occupied by a non-SearXNG service. Pass --searxng-port with a free port."
    fi
    printf 'Port %s is occupied by a non-SearXNG service. Enter another port: ' "$SEARXNG_PORT"
    read_tty SEARXNG_PORT
    base="http://127.0.0.1:${SEARXNG_PORT}"
  done

  local searxng_config_dir="$CONFIG_DIR/searxng"
  mkdir -p "$searxng_config_dir"
  cat > "$searxng_config_dir/settings.yml" <<'YAML'
use_default_settings: true

search:
  formats:
    - html
    - json
YAML

  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -Fx "$LOCAL_SEARXNG_CONTAINER" >/dev/null; then
    log "Reusing Docker container: $LOCAL_SEARXNG_CONTAINER"
    docker start "$LOCAL_SEARXNG_CONTAINER" >/dev/null
  else
    log "Starting isolated local SearXNG Docker container: $LOCAL_SEARXNG_CONTAINER"
    docker run -d \
      --name "$LOCAL_SEARXNG_CONTAINER" \
      --restart unless-stopped \
      -p "127.0.0.1:${SEARXNG_PORT}:8080" \
      -e FORCE_OWNERSHIP=false \
      -e "SEARXNG_SECRET=$(openssl rand -hex 32)" \
      -v "$searxng_config_dir/settings.yml:/etc/searxng/settings.yml:ro" \
      docker.io/searxng/searxng:latest >/dev/null
  fi

  local attempt=1
  while [ "$attempt" -le 15 ]; do
    if verify_searxng_url "$base"; then
      SELECTED_SEARXNG_URL="$base"
      SEARXNG_SOURCE="installer-managed local Docker SearXNG"
      return 0
    fi
    sleep 1
    attempt=$((attempt + 1))
  done
  die "Local Docker SearXNG did not become ready at $base"
}

select_searxng() {
  if [ -n "$SEARXNG_URL_ARG" ]; then
    select_existing_searxng_url "$SEARXNG_URL_ARG" "--searxng-url" || die "SearXNG endpoint does not support JSON search: $SEARXNG_URL_ARG"
    return
  fi

  if [ -n "${SEARXNG_URL:-}" ]; then
    if select_existing_searxng_url "$SEARXNG_URL" "SEARXNG_URL"; then return; fi
    warn "SEARXNG_URL is set but did not verify: $SEARXNG_URL"
  fi

  local cfg_url=""
  cfg_url="$(config_get searxngUrl 2>/dev/null || true)"
  if [ -n "$cfg_url" ]; then
    if select_existing_searxng_url "$cfg_url" "toolkit config"; then return; fi
    warn "Configured SearXNG endpoint did not verify: $cfg_url"
  fi

  if select_existing_searxng_url "http://localhost:8080" "localhost default"; then return; fi
  if select_existing_searxng_url "http://127.0.0.1:8080" "localhost default"; then return; fi

  case "$AUTO_SEARXNG" in
    public)
      log "Discovering public SearXNG endpoints from searx.space..."
      discover_public_searxng || die "No verified public SearXNG endpoint found. Provide --searxng-url or use --auto-searxng local-docker."
      return ;;
    local-docker)
      ensure_local_docker_searxng
      return ;;
  esac

  if is_interactive; then
    log "No JSON-capable SearXNG endpoint was found."
    log "Options:"
    log "  1) Enter an existing SearXNG URL"
    log "  2) Choose a verified public SearXNG endpoint"
    log "  3) Start an isolated local Docker SearXNG instance"
    log "  4) Abort"
    printf 'Choose [1-4]: '
    local choice custom
    read_tty choice
    case "$choice" in
      1)
        printf 'SearXNG URL: '
        read_tty custom
        select_existing_searxng_url "$custom" "custom input" || die "SearXNG endpoint does not support JSON search: $custom" ;;
      2) discover_public_searxng || die "No verified public SearXNG endpoint found." ;;
      3) ensure_local_docker_searxng ;;
      *) die "SearXNG endpoint is required for web_search." ;;
    esac
    return
  fi

  die "No JSON-capable SearXNG endpoint found. Pass --searxng-url, --auto-searxng public, or --auto-searxng local-docker."
}

ensure_scrapling() {
  if ! SCRAPLING_BIN="$(resolve_executable_path scrapling 2>/dev/null || true)" || [ -z "$SCRAPLING_BIN" ]; then
    log "Installing Scrapling with uv..."
    uv tool install "scrapling[all]"
    SCRAPLING_BIN="$(resolve_executable_path scrapling 2>/dev/null || true)"
  else
    log "Reusing Scrapling: $SCRAPLING_BIN"
  fi
  [ -n "$SCRAPLING_BIN" ] || die "Scrapling was installed but is not on PATH. Add ~/.local/bin to PATH or set SCRAPLING_BIN."
  "$SCRAPLING_BIN" install >/dev/null
  "$SCRAPLING_BIN" --help >/dev/null
}

ensure_agent_browser() {
  if ! AGENT_BROWSER_BIN="$(resolve_executable_path agent-browser 2>/dev/null || true)" || [ -z "$AGENT_BROWSER_BIN" ]; then
    log "Installing agent-browser with npm..."
    npm install -g agent-browser
    AGENT_BROWSER_BIN="$(resolve_executable_path agent-browser 2>/dev/null || true)"
  else
    log "Reusing agent-browser: $AGENT_BROWSER_BIN"
  fi
  [ -n "$AGENT_BROWSER_BIN" ] || die "agent-browser was installed but is not on PATH. Set AGENT_BROWSER_BIN or fix npm global PATH."
  if [ "$AGENT_BROWSER_WITH_DEPS" -eq 1 ]; then
    "$AGENT_BROWSER_BIN" install --with-deps >/dev/null
  else
    "$AGENT_BROWSER_BIN" install >/dev/null
  fi
  "$AGENT_BROWSER_BIN" doctor >/dev/null
}

ensure_firecrawl() {
  if [ -z "$FIRECRAWL_CHOICE" ]; then
    if is_interactive && confirm "Install optional Firecrawl fallback? Queries/URLs may leave your machine when fallback runs." "n"; then
      FIRECRAWL_CHOICE="with"
      if is_interactive; then
        log "Firecrawl runner options: installed (global CLI), npx, bunx."
        log "npx/bunx may run or download firecrawl-cli at fallback time."
        printf 'Firecrawl runner [installed/npx/bunx] (default: installed): '
        local runner_choice
        read_tty runner_choice
        if [ -n "$runner_choice" ]; then
          case "$runner_choice" in installed|npx|bunx) FIRECRAWL_RUNNER="$runner_choice" ;; *) die "Unknown Firecrawl runner: $runner_choice" ;; esac
        fi
      fi
    else
      FIRECRAWL_CHOICE="no"
    fi
  fi

  if [ "$FIRECRAWL_CHOICE" = "no" ]; then
    FIRECRAWL_FALLBACK="false"
    log "Skipping optional Firecrawl fallback."
    return
  fi

  FIRECRAWL_FALLBACK="true"
  case "$FIRECRAWL_RUNNER" in
    installed)
      if ! FIRECRAWL_BIN="$(resolve_executable_path firecrawl 2>/dev/null || true)" || [ -z "$FIRECRAWL_BIN" ]; then
        log "Installing firecrawl-cli with npm..."
        npm install -g firecrawl-cli
        FIRECRAWL_BIN="$(resolve_executable_path firecrawl 2>/dev/null || true)"
      else
        log "Reusing firecrawl: $FIRECRAWL_BIN"
      fi
      [ -n "$FIRECRAWL_BIN" ] || die "firecrawl-cli was installed but the firecrawl command was not found."
      "$FIRECRAWL_BIN" --help >/dev/null
      ;;
    npx)
      command_is_available npx || die "npx is required for --firecrawl-runner npx. Install npm/npx or use --firecrawl-runner installed."
      npx --version >/dev/null
      FIRECRAWL_BIN=""
      log "Using Firecrawl runner: npx (opt-in; may run/download firecrawl-cli at fallback time)."
      ;;
    bunx)
      command_is_available bunx || die "bunx is required for --firecrawl-runner bunx. Install Bun or use --firecrawl-runner installed."
      bunx --version >/dev/null
      FIRECRAWL_BIN=""
      log "Using Firecrawl runner: bunx (opt-in; may run/download firecrawl-cli at fallback time)."
      ;;
  esac
}

write_toolkit_config() {
  local update_json
  update_json="$(node - "$SELECTED_SEARXNG_URL" "$SCRAPLING_BIN" "$AGENT_BROWSER_BIN" "$FIRECRAWL_BIN" "$FIRECRAWL_FALLBACK" "$FIRECRAWL_RUNNER" <<'NODE'
const [searxngUrl, scrapling, agentBrowser, firecrawl, fallback, runner] = process.argv.slice(2);
const update = { commands: {} };
if (searxngUrl) update.searxngUrl = searxngUrl;
if (scrapling) update.commands.scrapling = scrapling;
if (agentBrowser) update.commands.agentBrowser = agentBrowser;
if (firecrawl) update.commands.firecrawl = firecrawl;
if (fallback === 'false') {
  update.firecrawlFallback = false;
} else if (fallback === 'true') {
  update.firecrawlFallback = true;
  update.firecrawlRunner = runner || 'installed';
}
console.log(JSON.stringify(update));
NODE
)"
  ensure_config_core
  node "$CONFIG_CORE" write "$CONFIG_FILE" "$update_json"
}

install_pi_package() {
  if [ "$DEPS_ONLY" -eq 1 ]; then
    log "Skipping pi package install (--deps-only)."
    return
  fi
  if [ "$LOCAL_INSTALL" -eq 1 ]; then
    log "Installing local pi package..."
    pi install ./
  else
    log "Installing pi package from npm..."
    pi install npm:pi-web-toolkit
  fi
}

run_final_verification() {
  log ""
  log "Final verification:"
  FAIL_COUNT=0
  check_node_required
  check_command_required npm npm "Install npm with Node.js 22+."
  check_command_required pi pi "Install pi first."
  if verify_searxng_url "$SELECTED_SEARXNG_URL"; then status OK "SearXNG $SELECTED_SEARXNG_URL"; else status FAIL "SearXNG $SELECTED_SEARXNG_URL"; fi
  if [ -n "$SCRAPLING_BIN" ] && "$SCRAPLING_BIN" --help >/dev/null 2>&1; then status OK "scrapling $SCRAPLING_BIN"; else status FAIL "scrapling"; fi
  if [ -n "$AGENT_BROWSER_BIN" ] && "$AGENT_BROWSER_BIN" doctor >/dev/null 2>&1; then status OK "agent-browser $AGENT_BROWSER_BIN"; else status FAIL "agent-browser"; fi
  if [ "$FIRECRAWL_FALLBACK" = "true" ]; then
    case "$FIRECRAWL_RUNNER" in
      installed)
        if [ -n "$FIRECRAWL_BIN" ] && "$FIRECRAWL_BIN" --help >/dev/null 2>&1; then status OK "Firecrawl runner installed ($FIRECRAWL_BIN)"; else status FAIL "Firecrawl enabled but installed CLI not ready"; fi ;;
      npx)
        if command_is_available npx; then status OK "Firecrawl runner npx"; else status FAIL "Firecrawl runner npx missing"; fi ;;
      bunx)
        if command_is_available bunx; then status OK "Firecrawl runner bunx"; else status FAIL "Firecrawl runner bunx missing"; fi ;;
    esac
  else
    status SKIP "Firecrawl optional fallback disabled"
  fi
  [ "$FAIL_COUNT" -eq 0 ] || die "Final verification failed."
}

run_doctor() {
  log "pi-web-toolkit doctor"
  FAIL_COUNT=0
  check_node_required
  check_command_required npm npm "Install npm with Node.js 22+."
  check_command_required pi pi "Install pi first."
  check_command_required curl curl "Install curl with your OS package manager."
  check_command_required openssl OpenSSL "Install OpenSSL with your OS package manager."
  check_command_required uv uv "Install uv before installing Scrapling."

  local config_error=""
  if config_error="$(validate_config_if_present required 2>&1)"; then
    if [ -f "$CONFIG_FILE" ]; then status OK "toolkit config $CONFIG_FILE"; else status SKIP "toolkit config not found; defaults/env will be used"; fi
  else
    if printf '%s' "$config_error" | grep -q 'Toolkit config file not found'; then
      status FAIL "toolkit config missing: $CONFIG_FILE"
    else
      status FAIL "toolkit config invalid: $CONFIG_FILE"
    fi
    [ -z "$config_error" ] || printf '%s\n' "$config_error" >&2
    exit 1
  fi

  local searxng
  searxng="$(runtime_searxng_url)"
  if verify_searxng_url "$searxng"; then status OK "SearXNG $searxng"; else status FAIL "SearXNG $searxng did not return JSON results"; fi

  local scrapling agent_browser firecrawl firecrawl_runner
  scrapling="$(runtime_command scrapling SCRAPLING_BIN scrapling)"
  if command_is_available "$scrapling" && "$scrapling" --help >/dev/null 2>&1; then status OK "scrapling $scrapling"; else status FAIL "scrapling missing or not working"; fi

  agent_browser="$(runtime_command agentBrowser AGENT_BROWSER_BIN agent-browser)"
  if command_is_available "$agent_browser" && "$agent_browser" doctor >/dev/null 2>&1; then status OK "agent-browser $agent_browser"; else status FAIL "agent-browser missing or doctor failed"; fi

  if runtime_firecrawl_enabled; then
    firecrawl_runner="$(runtime_firecrawl_runner)"
    case "$firecrawl_runner" in
      installed)
        firecrawl="$(runtime_command firecrawl FIRECRAWL_BIN firecrawl)"
        if command_is_available "$firecrawl" && "$firecrawl" --help >/dev/null 2>&1; then status OK "Firecrawl runner installed ($firecrawl)"; else status SKIP "Firecrawl runner installed but firecrawl CLI is not installed"; fi ;;
      npx)
        if command_is_available npx; then status OK "Firecrawl runner npx"; else status SKIP "Firecrawl runner npx missing; install npm/npx or choose installed/bunx"; fi ;;
      bunx)
        if command_is_available bunx; then status OK "Firecrawl runner bunx"; else status SKIP "Firecrawl runner bunx missing; install Bun or choose installed/npx"; fi ;;
    esac
  else
    status SKIP "Firecrawl optional fallback disabled"
  fi

  if pi list 2>/dev/null | grep -q 'pi-web-toolkit'; then
    status OK "pi-web-toolkit package installed"
  else
    status WARN "pi-web-toolkit package not listed by pi"
  fi

  [ "$FAIL_COUNT" -eq 0 ] || exit 1
}

run_install() {
  validate_config_if_present || die "Fix or remove invalid toolkit config before installing: $CONFIG_FILE"

  if [ "$EXTENSION_ONLY" -eq 0 ]; then
    ensure_prerequisites_or_exit
    select_searxng
    ensure_scrapling
    ensure_agent_browser
    ensure_firecrawl
    write_toolkit_config
  else
    log "Skipping dependency setup (--extension-only)."
  fi

  install_pi_package

  if [ "$EXTENSION_ONLY" -eq 0 ]; then
    run_final_verification
  fi

  log ""
  log "pi-web-toolkit installation summary"
  log "  Toolkit config: $CONFIG_FILE"
  if [ -n "$SELECTED_SEARXNG_URL" ]; then log "  SearXNG endpoint: $SELECTED_SEARXNG_URL ($SEARXNG_SOURCE)"; fi
  if [ -n "$SCRAPLING_BIN" ]; then log "  Scrapling: $SCRAPLING_BIN"; fi
  if [ -n "$AGENT_BROWSER_BIN" ]; then log "  agent-browser: $AGENT_BROWSER_BIN"; fi
  if [ "$FIRECRAWL_FALLBACK" = "true" ]; then
    if [ "$FIRECRAWL_RUNNER" = "installed" ]; then log "  Firecrawl fallback: enabled (installed: $FIRECRAWL_BIN)"; else log "  Firecrawl fallback: enabled ($FIRECRAWL_RUNNER)"; fi
  else
    log "  Firecrawl fallback: disabled/skipped"
  fi
  log ""
  log "Next step: Restart pi. If pi-web-toolkit was already loaded and only config changed, /reload may also work."
}

parse_args "$@"
if [ "$DOCTOR" -eq 1 ]; then
  run_doctor
else
  run_install
fi
