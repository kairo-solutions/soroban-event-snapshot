import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const cliPath = fileURLToPath(new URL("../src/cli.js", import.meta.url));

test("prints usage without requiring endpoint options", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage:/);
  assert.equal(result.stderr, "");
});

test("reports missing required arguments as a command-line error", () => {
  const result = spawnSync(process.execPath, [cliPath], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing required option: --rpc-url/);
});
