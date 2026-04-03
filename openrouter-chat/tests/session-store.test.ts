import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { createSessionStore } from "../lib/session-store.ts";

test("session store persists sessions on disk", async (t) => {
  const rootDir = fs.mkdtempSync(
    path.join(process.cwd(), ".tmp-session-store-test-"),
  );

  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  const store = createSessionStore(rootDir);
  const session = await store.createSession("session-123");

  session.htmlInjected = true;
  session.updatedAt = "2026-04-03T00:00:01.000Z";
  session.uiMessages.push({
    id: "ui-1",
    role: "user",
    content: "Show me today's KPI deltas",
    createdAt: "2026-04-03T00:00:00.000Z",
  });
  session.modelMessages.push({
    role: "user",
    content: "Dashboard HTML plus user prompt",
  });

  await store.saveSession(session);

  const restoredStore = createSessionStore(rootDir);
  const restored = await restoredStore.getSession("session-123");

  assert.deepEqual(restored, session);
  assert.equal(
    fs.existsSync(path.join(rootDir, "session-123.json")),
    true,
  );
});

test("session store can delete persisted sessions", async (t) => {
  const rootDir = fs.mkdtempSync(
    path.join(process.cwd(), ".tmp-session-store-delete-test-"),
  );

  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  const store = createSessionStore(rootDir);
  await store.createSession("session-delete");

  assert.equal(
    fs.existsSync(path.join(rootDir, "session-delete.json")),
    true,
  );

  await store.deleteSession("session-delete");

  assert.equal(
    fs.existsSync(path.join(rootDir, "session-delete.json")),
    false,
  );
  assert.equal(await store.getSession("session-delete"), undefined);
});

test("session store normalizes legacy injectedDomains sessions into htmlInjected", async (t) => {
  const rootDir = fs.mkdtempSync(
    path.join(process.cwd(), ".tmp-session-store-legacy-test-"),
  );

  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  fs.writeFileSync(
    path.join(rootDir, "legacy-session.json"),
    JSON.stringify(
      {
        id: "legacy-session",
        createdAt: "2026-04-03T00:00:00.000Z",
        updatedAt: "2026-04-03T00:00:01.000Z",
        selectedDomain: "ads",
        injectedDomains: ["finance"],
        uiMessages: [],
        modelMessages: [],
      },
      null,
      2,
    ),
  );

  const store = createSessionStore(rootDir);
  const session = await store.getSession("legacy-session");

  assert.equal(session?.htmlInjected, true);
  assert.equal(session?.id, "legacy-session");
});
