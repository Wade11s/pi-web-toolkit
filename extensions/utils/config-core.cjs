/**
 * Toolkit config core
 *
 * CommonJS module shared by runtime TypeScript wrappers and the shell
 * bootstrap installer. It owns config schema, defaults, precedence,
 * validation, and write behavior.
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const DEFAULT_SEARXNG_URL = "http://localhost:8080";
const COMMAND_DEFAULTS = {
  scrapling: "scrapling",
  agentBrowser: "agent-browser",
  firecrawl: "firecrawl",
};
const COMMAND_ENV_VARS = {
  scrapling: "SCRAPLING_BIN",
  agentBrowser: "AGENT_BROWSER_BIN",
  firecrawl: "FIRECRAWL_BIN",
};
const FIRECRAWL_RUNNERS = ["installed", "npx", "bunx"];

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFirecrawlRunner(value) {
  return FIRECRAWL_RUNNERS.includes(value);
}

function normalizeUrl(url) {
  return url.replace(/\/+$/, "");
}

function getDefaultToolkitConfigPath(env = process.env, homeDir = os.homedir()) {
  const configHome = typeof env.XDG_CONFIG_HOME === "string" && env.XDG_CONFIG_HOME.trim()
    ? env.XDG_CONFIG_HOME.trim()
    : path.join(homeDir, ".config");
  return path.join(configHome, "pi-web-toolkit", "config.json");
}

function getToolkitConfigPath(env = process.env, homeDir = os.homedir()) {
  const configured = typeof env.PI_WEB_TOOLKIT_CONFIG === "string" ? env.PI_WEB_TOOLKIT_CONFIG.trim() : "";
  return configured || getDefaultToolkitConfigPath(env, homeDir);
}

function validateOptionalString(value, key) {
  if (value !== undefined && typeof value !== "string") {
    throw new Error(`${key} must be a string`);
  }
}

function validateToolkitConfig(value) {
  if (!isRecord(value)) {
    throw new Error("expected a JSON object");
  }

  validateOptionalString(value.searxngUrl, "searxngUrl");

  if (value.firecrawlFallback !== undefined && typeof value.firecrawlFallback !== "boolean") {
    throw new Error("firecrawlFallback must be a boolean");
  }

  if (value.firecrawlRunner !== undefined) {
    if (typeof value.firecrawlRunner !== "string" || !isFirecrawlRunner(value.firecrawlRunner)) {
      throw new Error("firecrawlRunner must be one of: installed, npx, bunx");
    }
  }

  if (value.commands !== undefined) {
    if (!isRecord(value.commands)) {
      throw new Error("commands must be an object");
    }
    validateOptionalString(value.commands.scrapling, "commands.scrapling");
    validateOptionalString(value.commands.agentBrowser, "commands.agentBrowser");
    validateOptionalString(value.commands.firecrawl, "commands.firecrawl");
  }
}

function parseConfigFile(filePath, required = false) {
  if (!fs.existsSync(filePath)) {
    if (required) {
      throw new Error(`Toolkit config file not found: ${filePath}`);
    }
    return {};
  }

  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    throw new Error(`Unable to read toolkit config at ${filePath}: ${err.message || String(err)}`);
  }

  try {
    const parsed = JSON.parse(raw);
    validateToolkitConfig(parsed);
    return parsed;
  } catch (err) {
    throw new Error(`Invalid toolkit config at ${filePath}: ${err.message || String(err)}`);
  }
}

function readToolkitConfig(options = {}) {
  const env = options.env || process.env;
  const configPath = options.configPath || getToolkitConfigPath(env);
  const required = options.required !== undefined
    ? options.required
    : Boolean(typeof env.PI_WEB_TOOLKIT_CONFIG === "string" && env.PI_WEB_TOOLKIT_CONFIG.trim());
  return parseConfigFile(configPath, required);
}

function parseFirecrawlFallbackEnv(value) {
  const v = String(value).trim().toLowerCase();
  return !(v === "0" || v === "false" || v === "no" || v === "off");
}

function configRequiredForResolution(env, options = {}) {
  if (options.required !== undefined) return options.required;
  return Boolean((typeof env.PI_WEB_TOOLKIT_CONFIG === "string" && env.PI_WEB_TOOLKIT_CONFIG.trim()) || options.configPath);
}

function readConfigForResolution(env, options = {}) {
  const configPath = options.configPath || getToolkitConfigPath(env);
  const required = configRequiredForResolution(env, options);
  return {
    configPath,
    config: parseConfigFile(configPath, required),
  };
}

function resolveSearxngUrl(options = {}) {
  const env = options.env || process.env;
  const envUrl = typeof env.SEARXNG_URL === "string" ? env.SEARXNG_URL.trim() : "";
  if (envUrl) return normalizeUrl(envUrl);

  const { config } = readConfigForResolution(env, options);
  const cfgUrl = typeof config.searxngUrl === "string" ? config.searxngUrl.trim() : "";
  return cfgUrl ? normalizeUrl(cfgUrl) : DEFAULT_SEARXNG_URL;
}

function resolveToolkitCommand(name, options = {}) {
  if (!(name in COMMAND_DEFAULTS)) {
    throw new Error("Command name must be one of: scrapling, agentBrowser, firecrawl");
  }
  const env = options.env || process.env;
  const envCommand = typeof env[COMMAND_ENV_VARS[name]] === "string" ? env[COMMAND_ENV_VARS[name]].trim() : "";
  if (envCommand) return envCommand;

  const { config } = readConfigForResolution(env, options);
  const cfgCommand = config.commands && typeof config.commands[name] === "string" ? config.commands[name].trim() : "";
  return cfgCommand || COMMAND_DEFAULTS[name];
}

function resolveFirecrawlFallback(options = {}) {
  const env = options.env || process.env;
  if (env.PI_WEB_FIRECRAWL_FALLBACK !== undefined) {
    return parseFirecrawlFallbackEnv(env.PI_WEB_FIRECRAWL_FALLBACK);
  }

  const { config } = readConfigForResolution(env, options);
  return config.firecrawlFallback !== undefined ? config.firecrawlFallback : true;
}

function resolveFirecrawlRunner(options = {}) {
  const env = options.env || process.env;
  const envRunner = typeof env.PI_WEB_FIRECRAWL_RUNNER === "string" ? env.PI_WEB_FIRECRAWL_RUNNER.trim().toLowerCase() : "";
  if (envRunner) {
    if (!isFirecrawlRunner(envRunner)) {
      throw new Error("PI_WEB_FIRECRAWL_RUNNER must be one of: installed, npx, bunx");
    }
    return envRunner;
  }

  const { config } = readConfigForResolution(env, options);
  return config.firecrawlRunner || "installed";
}

function resolveToolkitConfig(options = {}) {
  const env = options.env || process.env;
  const { configPath, config } = readConfigForResolution(env, options);
  const commands = {};
  for (const name of Object.keys(COMMAND_DEFAULTS)) {
    commands[name] = resolveToolkitCommand(name, { ...options, env, required: false });
  }

  return {
    configPath,
    config,
    searxngUrl: resolveSearxngUrl({ ...options, env, required: false }),
    commands,
    firecrawlFallback: resolveFirecrawlFallback({ ...options, env, required: false }),
    firecrawlRunner: resolveFirecrawlRunner({ ...options, env, required: false }),
  };
}

function ensureCommandObject(cfg) {
  cfg.commands = isRecord(cfg.commands) ? { ...cfg.commands } : {};
  return cfg.commands;
}

function writeToolkitConfig(filePath, input = {}) {
  const cfg = parseConfigFile(filePath, false);

  if (typeof input.searxngUrl === "string" && input.searxngUrl.trim()) {
    cfg.searxngUrl = normalizeUrl(input.searxngUrl.trim());
  }

  const commands = ensureCommandObject(cfg);
  const inputCommands = isRecord(input.commands) ? input.commands : {};
  for (const name of Object.keys(COMMAND_DEFAULTS)) {
    const command = typeof inputCommands[name] === "string" ? inputCommands[name].trim() : "";
    if (command) commands[name] = command;
  }

  if (input.firecrawlFallback === false) {
    cfg.firecrawlFallback = false;
    delete cfg.firecrawlRunner;
    delete commands.firecrawl;
  } else if (input.firecrawlFallback === true) {
    cfg.firecrawlFallback = true;
    cfg.firecrawlRunner = input.firecrawlRunner || "installed";
    if (!isFirecrawlRunner(cfg.firecrawlRunner)) {
      throw new Error("firecrawlRunner must be one of: installed, npx, bunx");
    }
    if (cfg.firecrawlRunner !== "installed") {
      delete commands.firecrawl;
    }
  } else if (input.firecrawlRunner !== undefined) {
    cfg.firecrawlRunner = input.firecrawlRunner;
    if (!isFirecrawlRunner(cfg.firecrawlRunner)) {
      throw new Error("firecrawlRunner must be one of: installed, npx, bunx");
    }
    if (cfg.firecrawlRunner !== "installed") {
      delete commands.firecrawl;
    }
  }

  validateToolkitConfig(cfg);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(cfg, null, 2)}\n`);
  return cfg;
}

function getDottedValue(obj, dottedPath) {
  let cur = obj;
  for (const part of dottedPath.split(".")) {
    if (!isRecord(cur) || !(part in cur)) return undefined;
    cur = cur[part];
  }
  return cur;
}

function printValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "object") process.stdout.write(`${JSON.stringify(value)}\n`);
  else process.stdout.write(`${String(value)}\n`);
  return true;
}

function cliMain(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;
  try {
    switch (command) {
      case "validate": {
        const file = args[0] || getToolkitConfigPath(process.env);
        parseConfigFile(file, false);
        return 0;
      }
      case "raw-get": {
        const [file, dottedPath] = args;
        if (!file || !dottedPath) throw new Error("Usage: config-core raw-get <file> <dotted-path>");
        const value = getDottedValue(parseConfigFile(file, false), dottedPath);
        return printValue(value) ? 0 : 1;
      }
      case "resolve": {
        const [file, key, commandName] = args;
        if (!file || !key) throw new Error("Usage: config-core resolve <file> <searxng-url|firecrawl-enabled|firecrawl-runner|command> [name]");
        const required = Boolean(typeof process.env.PI_WEB_TOOLKIT_CONFIG === "string" && process.env.PI_WEB_TOOLKIT_CONFIG.trim());
        const options = { env: process.env, configPath: file, required };
        if (key === "searxng-url") return printValue(resolveSearxngUrl(options)) ? 0 : 1;
        if (key === "firecrawl-enabled") return printValue(resolveFirecrawlFallback(options) ? "true" : "false") ? 0 : 1;
        if (key === "firecrawl-runner") return printValue(resolveFirecrawlRunner(options)) ? 0 : 1;
        if (key === "command") {
          return printValue(resolveToolkitCommand(commandName, options)) ? 0 : 1;
        }
        throw new Error(`Unknown resolve key: ${key}`);
      }
      case "write": {
        const [file, updateJson] = args;
        if (!file || !updateJson) throw new Error("Usage: config-core write <file> <update-json>");
        let update;
        try {
          update = JSON.parse(updateJson);
        } catch (err) {
          throw new Error(`Invalid update JSON: ${err.message || String(err)}`);
        }
        writeToolkitConfig(file, update);
        return 0;
      }
      default:
        throw new Error("Usage: config-core <validate|raw-get|resolve|write> ...");
    }
  } catch (err) {
    process.stderr.write(`${err.message || String(err)}\n`);
    return 1;
  }
}

module.exports = {
  DEFAULT_SEARXNG_URL,
  COMMAND_DEFAULTS,
  COMMAND_ENV_VARS,
  FIRECRAWL_RUNNERS,
  getDefaultToolkitConfigPath,
  getToolkitConfigPath,
  validateToolkitConfig,
  parseConfigFile,
  readToolkitConfig,
  resolveToolkitConfig,
  resolveSearxngUrl,
  resolveToolkitCommand,
  resolveFirecrawlFallback,
  resolveFirecrawlRunner,
  writeToolkitConfig,
  normalizeUrl,
  cliMain,
};

if (require.main === module) {
  process.exitCode = cliMain();
}
