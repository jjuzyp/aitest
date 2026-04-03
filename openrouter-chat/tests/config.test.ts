import assert from "node:assert/strict";
import test from "node:test";

import { readConfig } from "../lib/config.ts";

test("readConfig rejects missing OPENROUTER_API_KEY", () => {
  assert.throws(
    () => readConfig({ OPENROUTER_API_KEY: "   " }),
    /OPENROUTER_API_KEY/,
  );
});

test("readConfig exposes default dashboard html path", () => {
  const config = readConfig({ OPENROUTER_API_KEY: "test-key" });

  assert.match(config.DASHBOARD_HTML_PATH, /HTMLDASH[\\/]WB Dashboard\.html$/);
});

test("readConfig prefers explicit dashboard html path override", () => {
  const config = readConfig({
    OPENROUTER_API_KEY: "test-key",
    DASHBOARD_HTML_PATH: "/srv/wbdash/HTMLDASH/WB Dashboard.html",
  });

  assert.equal(
    config.DASHBOARD_HTML_PATH,
    "/srv/wbdash/HTMLDASH/WB Dashboard.html",
  );
});
