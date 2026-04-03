import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("next config disables dev indicators", () => {
  const filePath = path.join(process.cwd(), "next.config.ts");
  const source = fs.readFileSync(filePath, "utf8");

  assert.match(source, /devIndicators:\s*false/);
});
