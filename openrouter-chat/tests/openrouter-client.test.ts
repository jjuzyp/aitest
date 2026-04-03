import assert from "node:assert/strict";
import test from "node:test";

import {
  getChunkErrorMessage,
  getChunkText,
} from "../lib/openrouter-client.ts";

test("OpenRouter chunk helpers read text deltas and mid-stream errors", () => {
  assert.equal(
    getChunkText({
      choices: [{ delta: { content: "Hello" } }],
    }),
    "Hello",
  );

  assert.equal(
    getChunkErrorMessage({
      error: { message: "Provider disconnected unexpectedly" },
      choices: [{ finish_reason: "error" }],
    }),
    "Provider disconnected unexpectedly",
  );

  assert.equal(getChunkText({ choices: [{ delta: {} }] }), "");
  assert.equal(getChunkErrorMessage({ choices: [{ delta: {} }] }), null);
});
