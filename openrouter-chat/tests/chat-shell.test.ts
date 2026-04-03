import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("chat shell source contains only core chat surfaces", () => {
  const filePath = path.join(process.cwd(), "components", "chat-shell.tsx");
  const source = fs.readFileSync(filePath, "utf8");

  assert.match(source, /chat-input/);
  assert.match(source, /messages/);
  assert.match(source, /response\.body\.getReader/);
  assert.doesNotMatch(source, /sidebar/i);
  assert.doesNotMatch(source, /placeholder=/);
  assert.match(source, /thinking-dots/);
  assert.match(source, /setInterval/);
  assert.match(source, /pendingSince/);
});

test("chat shell tears down the current session on page leave", () => {
  const filePath = path.join(process.cwd(), "components", "chat-shell.tsx");
  const source = fs.readFileSync(filePath, "utf8");

  assert.match(source, /pagehide/);
  assert.match(source, /sendBeacon|keepalive/);
  assert.match(source, /DELETE/);
});
