import assert from "node:assert/strict";
import test from "node:test";

import { createClientId } from "../lib/client-id.ts";

test("createClientId uses crypto.randomUUID when available", () => {
  const id = createClientId("assistant", {
    randomUUID: () => "uuid-123",
  });

  assert.equal(id, "assistant-uuid-123");
});

test("createClientId falls back when crypto.randomUUID is unavailable", () => {
  const id = createClientId("assistant");

  assert.match(id, /^assistant-[a-z0-9]+-[a-z0-9]+$/i);
});
