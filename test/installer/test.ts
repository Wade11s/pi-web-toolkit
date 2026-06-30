/**
 * Bootstrap installer behavior tests.
 *
 * These tests execute install.sh through its public CLI with stubbed external
 * commands. They avoid real network, package-manager, Docker, and pi changes.
 */

import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = new URL("../..", import.meta.url).pathname;
const INSTALLER = join(ROOT, "install.sh");

interface Fixture {
  dir: string;
  bin: string;
  home: string;
  config: string;
  log: string;
  env: NodeJS.ProcessEnv;
}

function makeFixture(curlMode: "basic" | "public" | "local-docker" = "basic"): Fixture {
  const dir = mkdtempSync(join(tmpdir(), "pi-web-toolkit-installer-test-"));
  const bin = join(dir, "bin");
  const home = join(dir, "home");
  const config = join(home, ".config", "pi-web-toolkit", "config.json");
  const log = join(dir, "commands.log");
  mkdirSync(bin, { recursive: true });
  mkdirSync(join(home, ".config", "pi-web-toolkit"), { recursive: true });
  writeFileSync(log, "");

  writeStub(bin, "npm", `#!/usr/bin/env bash
if [[ "$1" == "--version" ]]; then echo "10.9.8"; exit 0; fi
echo "npm $*" >> "$PI_WEB_TOOLKIT_TEST_LOG"
exit 0
`);
  writeStub(bin, "pi", `#!/usr/bin/env bash
if [[ "$1" == "--version" ]]; then echo "0.80.2"; exit 0; fi
if [[ "$1" == "list" ]]; then echo "npm:pi-web-toolkit"; exit 0; fi
echo "pi $*" >> "$PI_WEB_TOOLKIT_TEST_LOG"
exit 0
`);
  writeStub(bin, "uv", `#!/usr/bin/env bash
if [[ "$1" == "--version" ]]; then echo "uv 0.5.0"; exit 0; fi
echo "uv $*" >> "$PI_WEB_TOOLKIT_TEST_LOG"
exit 0
`);
  writeStub(bin, "scrapling", `#!/usr/bin/env bash
if [[ "$1" == "--help" ]]; then echo "scrapling help"; exit 0; fi
echo "scrapling $*" >> "$PI_WEB_TOOLKIT_TEST_LOG"
exit 0
`);
  writeStub(bin, "agent-browser", `#!/usr/bin/env bash
if [[ "$1" == "doctor" ]]; then echo "agent-browser ok"; exit 0; fi
echo "agent-browser $*" >> "$PI_WEB_TOOLKIT_TEST_LOG"
exit 0
`);
  writeStub(bin, "openssl", `#!/usr/bin/env bash
echo "testsecret"
`);
  writeStub(bin, "npx", `#!/usr/bin/env bash
if [[ "$1" == "--version" ]]; then echo "10.9.8"; exit 0; fi
echo "npx $*" >> "$PI_WEB_TOOLKIT_TEST_LOG"
exit 0
`);
  writeStub(bin, "bunx", `#!/usr/bin/env bash
if [[ "$1" == "--version" ]]; then echo "1.1.0"; exit 0; fi
echo "bunx $*" >> "$PI_WEB_TOOLKIT_TEST_LOG"
exit 0
`);
  writeCurlStub(bin, curlMode);
  if (curlMode === "local-docker") {
    writeStub(bin, "docker", `#!/usr/bin/env bash
echo "docker $*" >> "$PI_WEB_TOOLKIT_TEST_LOG"
if [[ "$*" == *"run"* ]]; then touch "$DOCKER_MARKER"; fi
if [[ "$1" == "ps" ]]; then exit 0; fi
exit 0
`);
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    HOME: home,
    XDG_CONFIG_HOME: join(home, ".config"),
    PI_WEB_TOOLKIT_CONFIG: config,
    PI_WEB_TOOLKIT_TEST_LOG: log,
    DOCKER_MARKER: join(dir, "docker.started"),
  };

  return { dir, bin, home, config, log, env };
}

function writeStub(bin: string, name: string, body: string): void {
  const file = join(bin, name);
  writeFileSync(file, body);
  chmodSync(file, 0o755);
}

function writeCurlStub(bin: string, mode: "basic" | "public" | "local-docker"): void {
  const publicJson = JSON.stringify({
    instances: {
      "https://public.example/": {
        analytics: false,
        main: true,
        network_type: "normal",
        http: { status_code: 200, error: null },
        generator: "searxng",
        uptime: { uptimeMonth: 99.9, uptimeYear: 99.8 },
        timing: { search: { success_percentage: 100, all: { median: 0.2 } } },
      },
    },
  });

  writeStub(bin, "curl", `#!/usr/bin/env bash
args="$*"
if [[ "$args" == *"searx.space/data/instances.json"* ]]; then
  cat <<'JSON'
${publicJson}
JSON
  exit 0
fi
if [[ "$args" == *"127.0.0.1:9876/search"* ]]; then
  if [[ -f "$DOCKER_MARKER" ]]; then echo '{"query":"test","results":[]}'; exit 0; fi
  exit 7
fi
if [[ "$args" == *"127.0.0.1:9876/"* ]]; then exit 7; fi
if [[ ("${mode}" == "public" || "${mode}" == "local-docker") && "$args" == *"localhost:8080/search"* ]]; then exit 7; fi
if [[ ("${mode}" == "public" || "${mode}" == "local-docker") && "$args" == *"127.0.0.1:8080/search"* ]]; then exit 7; fi
if [[ "$args" == *"/search"* ]]; then echo '{"query":"test","results":[]}'; exit 0; fi
if [[ "${mode}" == "local-docker" ]]; then exit 7; fi
echo '{}'
exit 0
`);
}

function runInstaller(fixture: Fixture, args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync("bash", [INSTALLER, ...args], {
    env: fixture.env,
    cwd: ROOT,
    encoding: "utf8",
  });
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function testDoctorModeIsNonMutatingAndReportsReady(): void {
  const f = makeFixture("basic");
  const existing = {
    searxngUrl: "https://configured.example",
    firecrawlFallback: false,
    commands: {
      scrapling: join(f.bin, "scrapling"),
      agentBrowser: join(f.bin, "agent-browser"),
    },
  };
  writeFileSync(f.config, JSON.stringify(existing, null, 2));

  const result = runInstaller(f, ["--doctor"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /OK\s+Node\.js/);
  assert.match(result.stdout, /OK\s+SearXNG/);
  assert.match(result.stdout, /OK\s+scrapling/);
  assert.match(result.stdout, /OK\s+agent-browser/);
  assert.match(result.stdout, /SKIP\s+Firecrawl/);
  assert.deepEqual(readJson(f.config), existing);
}

function testCustomEndpointInstallWritesToolkitConfig(): void {
  const f = makeFixture("basic");
  const result = runInstaller(f, ["--yes", "--local", "--searxng-url", "https://custom.example/", "--no-firecrawl"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const cfg = readJson(f.config);
  assert.equal(cfg.searxngUrl, "https://custom.example");
  assert.equal(cfg.firecrawlFallback, false);
  assert.equal(cfg.commands.scrapling, join(f.bin, "scrapling"));
  assert.equal(cfg.commands.agentBrowser, join(f.bin, "agent-browser"));
  assert.match(readFileSync(f.log, "utf8"), /pi install \./);
  assert.match(result.stdout, /Restart pi/);
}

function testPublicEndpointAutoSelectionRequiresExplicitFlag(): void {
  const f = makeFixture("public");
  const result = runInstaller(f, ["--yes", "--local", "--auto-searxng", "public", "--no-firecrawl"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const cfg = readJson(f.config);
  assert.equal(cfg.searxngUrl, "https://public.example");
  assert.match(result.stdout, /public SearXNG endpoint/i);
}

function testLocalDockerSearxngUsesIsolatedOwnership(): void {
  const f = makeFixture("local-docker");
  const result = runInstaller(f, ["--yes", "--local", "--auto-searxng", "local-docker", "--searxng-port", "9876", "--no-firecrawl"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const cfg = readJson(f.config);
  assert.equal(cfg.searxngUrl, "http://127.0.0.1:9876");
  const log = readFileSync(f.log, "utf8");
  assert.match(log, /docker run/);
  assert.match(log, /--name pi-web-toolkit-searxng/);
  assert.match(log, /pi-web-toolkit\/searxng\/settings\.yml/);
}

function testFirecrawlInstalledRunnerWritesConfiguredCommand(): void {
  const f = makeFixture("basic");
  writeStub(f.bin, "firecrawl", `#!/usr/bin/env bash
if [[ "$1" == "--help" ]]; then echo "firecrawl help"; exit 0; fi
echo "firecrawl $*" >> "$PI_WEB_TOOLKIT_TEST_LOG"
exit 0
`);
  const result = runInstaller(f, ["--yes", "--local", "--searxng-url", "https://custom.example/", "--with-firecrawl", "--firecrawl-runner", "installed"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const cfg = readJson(f.config);
  assert.equal(cfg.firecrawlFallback, true);
  assert.equal(cfg.firecrawlRunner, "installed");
  assert.equal(cfg.commands.firecrawl, join(f.bin, "firecrawl"));
  assert.match(result.stdout, /Firecrawl fallback: enabled \(installed:/);
}

function testFirecrawlNpxRunnerWritesConfigWithoutGlobalInstall(): void {
  const f = makeFixture("basic");
  const result = runInstaller(f, ["--yes", "--local", "--searxng-url", "https://custom.example/", "--with-firecrawl", "--firecrawl-runner", "npx"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const cfg = readJson(f.config);
  assert.equal(cfg.firecrawlFallback, true);
  assert.equal(cfg.firecrawlRunner, "npx");
  assert.equal(cfg.commands.firecrawl, undefined);
  const log = readFileSync(f.log, "utf8");
  assert.doesNotMatch(log, /npm install -g firecrawl-cli/);
  assert.match(result.stdout, /Firecrawl fallback: enabled \(npx\)/);
}

function testFirecrawlBunxRunnerWritesConfigWithoutGlobalInstall(): void {
  const f = makeFixture("basic");
  const result = runInstaller(f, ["--yes", "--local", "--searxng-url", "https://custom.example/", "--with-firecrawl", "--firecrawl-runner", "bunx"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const cfg = readJson(f.config);
  assert.equal(cfg.firecrawlFallback, true);
  assert.equal(cfg.firecrawlRunner, "bunx");
  assert.equal(cfg.commands.firecrawl, undefined);
  const log = readFileSync(f.log, "utf8");
  assert.doesNotMatch(log, /npm install -g firecrawl-cli/);
  assert.match(result.stdout, /Firecrawl fallback: enabled \(bunx\)/);
}

function testDoctorReportsConfiguredFirecrawlRunner(): void {
  const f = makeFixture("basic");
  writeFileSync(f.config, JSON.stringify({
    searxngUrl: "https://configured.example",
    firecrawlFallback: true,
    firecrawlRunner: "npx",
    commands: {
      scrapling: join(f.bin, "scrapling"),
      agentBrowser: join(f.bin, "agent-browser"),
    },
  }, null, 2));

  const result = runInstaller(f, ["--doctor"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /OK\s+Firecrawl runner npx/);
}

testDoctorModeIsNonMutatingAndReportsReady();
testCustomEndpointInstallWritesToolkitConfig();
testPublicEndpointAutoSelectionRequiresExplicitFlag();
testLocalDockerSearxngUsesIsolatedOwnership();
testFirecrawlInstalledRunnerWritesConfiguredCommand();
testFirecrawlNpxRunnerWritesConfigWithoutGlobalInstall();
testFirecrawlBunxRunnerWritesConfigWithoutGlobalInstall();
testDoctorReportsConfiguredFirecrawlRunner();

console.log("bootstrap installer tests passed");
