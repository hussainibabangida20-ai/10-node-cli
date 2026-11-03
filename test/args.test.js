import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../src/args.js";

test("parseArgs reads command options", () => {
  assert.deepEqual(
    parseArgs(["add", "--amount", "2500", "--category", "food", "--note", "lunch"]),
    {
      command: "add",
      options: { amount: "2500", category: "food", note: "lunch" },
      noColor: false,
    },
  );
});

test("parseArgs accepts global no-color flag", () => {
  assert.deepEqual(parseArgs(["list", "--no-color"]), {
    command: "list",
    options: { noColor: true },
    noColor: true,
  });
});

test("parseArgs rejects unknown options", () => {
  assert.throws(() => parseArgs(["add", "--wat", "1"]), /Unknown option/);
});

test("parseArgs rejects options not supported by the command", () => {
  assert.throws(() => parseArgs(["list", "--amount", "1"]), /not valid for the list command/);
});

test("parseArgs requires an option value", () => {
  assert.throws(() => parseArgs(["add", "--amount"]), /requires a value/);
});

test("parseArgs rejects duplicate options", () => {
  assert.throws(() => parseArgs(["add", "--amount", "1", "--amount", "2"]), /more than once/);
});
