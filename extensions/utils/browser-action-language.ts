/**
 * Browser action language — shared web_browse action semantics
 *
 * Owns the meaning of browser actions across validation, human-readable step
 * planning, local agent-browser command planning, and Firecrawl interact prompt
 * planning. Local browser execution and cloud interaction are adapters that
 * consume this plan.
 */

export interface BrowserAction {
  type: "click" | "fill" | "type" | "press" | "wait" | "wait_selector" | "scroll";
  selector?: string;
  value?: string;
  key?: string;
  ms?: number;
  direction?: "down" | "up" | "bottom" | "top";
  amount?: number;
  state?: "attached" | "visible" | "hidden";
}

export interface BrowserActionPlanInput {
  url: string;
  actions: BrowserAction[];
  selector?: string;
}

export interface BrowserActionPlan {
  actionCount: number;
  steps: string[];
  localCommands: string[][];
  cloudPrompt: string;
}

function requireString(action: BrowserAction, field: "selector" | "value" | "key"): string {
  const value = action[field] as string | undefined;
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Action "${action.type}" requires non-empty ${field}`);
  }
  return value;
}

function requireInteger(action: BrowserAction, field: "ms" | "amount"): number {
  const value = action[field] as number | undefined;
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`Action "${action.type}" requires non-negative integer ${field}`);
  }
  return value as number;
}

function waitForSelectorScript(selector: string, state: "attached" | "visible" | "hidden"): string {
  const selectorLiteral = JSON.stringify(selector);
  const stateLiteral = JSON.stringify(state);
  return `await new Promise((resolve, reject) => {
    const selector = ${selectorLiteral};
    const state = ${stateLiteral};
    const deadline = Date.now() + 30000;
    const isVisible = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
    const check = () => {
      const el = document.querySelector(selector);
      const ok = state === "attached" ? !!el : state === "hidden" ? !isVisible(el) : isVisible(el);
      if (ok) return resolve(true);
      if (Date.now() > deadline) return reject(new Error(\`Timed out waiting for ${state} selector: ${selector}\`));
      setTimeout(check, 100);
    };
    check();
  })`;
}

function actionStep(action: BrowserAction): string {
  switch (action.type) {
    case "click":
      return `click ${requireString(action, "selector")}`;
    case "fill":
      return `fill ${requireString(action, "selector")} "${requireString(action, "value")}"`;
    case "type":
      return `type ${requireString(action, "selector")} "${requireString(action, "value")}"`;
    case "press":
      return action.selector
        ? `focus ${action.selector} + press ${requireString(action, "key")}`
        : `press ${requireString(action, "key")}`;
    case "wait":
      return `wait ${requireInteger(action, "ms")}ms`;
    case "wait_selector":
      return `wait for ${requireString(action, "selector")} (${action.state ?? "visible"})`;
    case "scroll": {
      const dir = action.direction ?? "down";
      if (dir === "top" || dir === "bottom") return `scroll to ${dir}`;
      return `scroll ${dir}${action.amount ? ` ${action.amount}px` : ""}`;
    }
    default:
      throw new Error(`Unsupported browser action: ${(action as BrowserAction).type}`);
  }
}

function localCommandsForAction(action: BrowserAction): string[][] {
  switch (action.type) {
    case "click":
      return [["click", requireString(action, "selector")]];
    case "fill":
      return [["fill", requireString(action, "selector"), requireString(action, "value")]];
    case "type":
      return [["type", requireString(action, "selector"), requireString(action, "value")]];
    case "press": {
      const commands: string[][] = [];
      if (action.selector) commands.push(["focus", action.selector]);
      commands.push(["press", requireString(action, "key")]);
      return commands;
    }
    case "wait":
      return [["wait", String(requireInteger(action, "ms"))]];
    case "wait_selector": {
      const state = action.state ?? "visible";
      const waitSelector = requireString(action, "selector");
      if (state === "visible") return [["wait", waitSelector]];
      return [["eval", waitForSelectorScript(waitSelector, state)]];
    }
    case "scroll": {
      const dir = action.direction ?? "down";
      if (dir === "top") return [["eval", "window.scrollTo(0, 0)"]];
      if (dir === "bottom") return [["eval", "window.scrollTo(0, document.body.scrollHeight)"]];
      return [["scroll", dir, String(action.amount ?? 500)]];
    }
    default:
      throw new Error(`Unsupported browser action: ${(action as BrowserAction).type}`);
  }
}

function cloudInstructionForAction(action: BrowserAction): string {
  switch (action.type) {
    case "click":
      return `click the element "${requireString(action, "selector")}"`;
    case "fill":
    case "type":
      return `type "${requireString(action, "value")}" into "${requireString(action, "selector")}"`;
    case "press":
      return `press ${requireString(action, "key")}`;
    case "scroll":
      return `scroll ${action.direction ?? "down"}`;
    case "wait":
      requireInteger(action, "ms");
      return "wait briefly";
    case "wait_selector":
      return `wait for "${requireString(action, "selector")}" to appear`;
    default:
      throw new Error(`Unsupported browser action: ${(action as BrowserAction).type}`);
  }
}

export function planBrowserActions(input: BrowserActionPlanInput): BrowserActionPlan {
  const steps: string[] = [`open ${input.url}`];
  const localCommands: string[][] = [["open", input.url]];
  const cloudInstructions: string[] = [];

  for (const action of input.actions) {
    steps.push(actionStep(action));
    localCommands.push(...localCommandsForAction(action));
    cloudInstructions.push(cloudInstructionForAction(action));
  }

  if (input.selector) {
    steps.push(`get text ${input.selector}`);
    localCommands.push(["get", "text", input.selector, "--json"]);
  } else {
    steps.push("snapshot");
    localCommands.push(["snapshot", "-i", "--json"]);
  }
  steps.push("get title", "get url");
  localCommands.push(["get", "title", "--json"], ["get", "url", "--json"]);

  const actionText = cloudInstructions.length > 0
    ? `Perform these actions in order: ${cloudInstructions.join("; ")}. `
    : "";
  const extract = input.selector
    ? `Then return the text content of the element matching "${input.selector}".`
    : "Then return the main textual content of the page.";

  return {
    actionCount: input.actions.length,
    steps,
    localCommands,
    cloudPrompt: `${actionText}${extract}`,
  };
}
