import assert from "node:assert/strict";
import test from "node:test";

import { buildModelMessages } from "../lib/dashboard-context.ts";

test("buildModelMessages injects the full dashboard HTML only once per session", () => {
  const systemPrompt = "You are Qwen3.6 Plus (free), a large language model from qwen.";
  const dashboardHtml =
    "<html><body><section id=\"dashboard\">FULL_DASHBOARD_HTML</section></body></html>";

  const first = buildModelMessages({
    systemPrompt,
    dashboardHtml,
    history: [],
    userMessage: "Какая общая выручка?",
    htmlInjected: false,
  });

  assert.equal(first.htmlInjected, true);
  assert.equal(first.messages[0]?.role, "system");
  assert.match(first.messages[1]?.content ?? "", /FULL_DASHBOARD_HTML/);
  assert.match(first.messages[1]?.content ?? "", /Какая общая выручка\?/);

  const second = buildModelMessages({
    systemPrompt,
    dashboardHtml,
    history: [...first.messages],
    userMessage: "А что по рекламе?",
    htmlInjected: true,
  });

  assert.equal(second.htmlInjected, true);
  assert.equal(
    second.messages.filter((message) => message.role === "system").length,
    1,
  );
  assert.equal(second.messages.at(-1)?.role, "user");
  assert.doesNotMatch(second.messages.at(-1)?.content ?? "", /FULL_DASHBOARD_HTML/);
  assert.equal(second.messages.at(-1)?.content, "А что по рекламе?");
});

test("buildModelMessages preserves an existing system prompt", () => {
  const systemPrompt = "You are Qwen3.6 Plus (free), a large language model from qwen.";
  const result = buildModelMessages({
    systemPrompt,
    dashboardHtml: "<html><body>FULL_DASHBOARD_HTML</body></html>",
    history: [{ role: "system", content: systemPrompt }],
    userMessage: "Покажи остатки",
    htmlInjected: false,
  });

  assert.equal(
    result.messages.filter((message) => message.role === "system").length,
    1,
  );
});
