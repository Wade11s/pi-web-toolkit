/**
 * Browser action language tests.
 *
 * These tests exercise the action-language seam that web_browse uses to plan
 * local agent-browser commands, human-readable steps, and Firecrawl prompts.
 */

import assert from "node:assert/strict";
import { planBrowserActions } from "../../extensions/utils/browser-action-language";

function testPlansLocalAndCloudActions(): void {
  const plan = planBrowserActions({
    url: "https://example.com",
    actions: [
      { type: "click", selector: "#menu" },
      { type: "fill", selector: "#q", value: "pi web toolkit" },
    ],
    selector: "main",
  });

  assert.deepEqual(plan.steps, [
    "open https://example.com",
    "click #menu",
    "fill #q \"pi web toolkit\"",
    "get text main",
    "get title",
    "get url",
  ]);
  assert.deepEqual(plan.localCommands, [
    ["open", "https://example.com"],
    ["click", "#menu"],
    ["fill", "#q", "pi web toolkit"],
    ["get", "text", "main", "--json"],
    ["get", "title", "--json"],
    ["get", "url", "--json"],
  ]);
  assert.equal(
    plan.cloudPrompt,
    'Perform these actions in order: click the element "#menu"; type "pi web toolkit" into "#q". Then return the text content of the element matching "main".',
  );
}

function testPlansRemainingSupportedLocalActions(): void {
  const plan = planBrowserActions({
    url: "https://example.com",
    actions: [
      { type: "type", selector: "#q", value: "hello" },
      { type: "press", selector: "#q", key: "Enter" },
      { type: "wait", ms: 250 },
      { type: "wait_selector", selector: ".result" },
      { type: "wait_selector", selector: ".gone", state: "hidden" },
      { type: "scroll", direction: "up", amount: 300 },
      { type: "scroll", direction: "bottom" },
    ],
  });

  assert.deepEqual(plan.localCommands.slice(0, 7), [
    ["open", "https://example.com"],
    ["type", "#q", "hello"],
    ["focus", "#q"],
    ["press", "Enter"],
    ["wait", "250"],
    ["wait", ".result"],
    ["eval", plan.localCommands[6][1]],
  ]);
  assert.match(plan.localCommands[6][1], /state = "hidden"/);
  assert.match(plan.localCommands[6][1], /selector = "\.gone"/);
  assert.deepEqual(plan.localCommands.slice(7), [
    ["scroll", "up", "300"],
    ["eval", "window.scrollTo(0, document.body.scrollHeight)"],
    ["snapshot", "-i", "--json"],
    ["get", "title", "--json"],
    ["get", "url", "--json"],
  ]);
  assert.deepEqual(plan.steps.slice(-3), ["snapshot", "get title", "get url"]);
  assert.equal(
    plan.cloudPrompt,
    'Perform these actions in order: type "hello" into "#q"; press Enter; wait briefly; wait for ".result" to appear; wait for ".gone" to appear; scroll up; scroll bottom. Then return the main textual content of the page.',
  );
}

function testValidationFailures(): void {
  assert.throws(
    () => planBrowserActions({ url: "https://example.com", actions: [{ type: "click" }] }),
    /Action "click" requires non-empty selector/,
  );
  assert.throws(
    () => planBrowserActions({ url: "https://example.com", actions: [{ type: "wait", ms: -1 }] }),
    /Action "wait" requires non-negative integer ms/,
  );
  assert.throws(
    () => planBrowserActions({ url: "https://example.com", actions: [{ type: "press" }] }),
    /Action "press" requires non-empty key/,
  );
}

testPlansLocalAndCloudActions();
testPlansRemainingSupportedLocalActions();
testValidationFailures();

console.log("browser action language tests passed");
