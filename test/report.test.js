import test from "node:test";
import assert from "node:assert/strict";
import { createSummary, toCsv } from "../src/report.js";

const expenses = [
  { id: "one00000", amount: 2500, category: "food", note: "lunch", date: "2026-11-03" },
  { id: "two00000", amount: 1200, category: "transport", note: "bus", date: "2026-11-04" },
  { id: "three000", amount: 900, category: "food", note: "", date: "2026-10-28" },
];

test("createSummary calculates total, category totals, and biggest expense", () => {
  const summary = createSummary(expenses);
  assert.equal(summary.total, 4600);
  assert.deepEqual(summary.categoryTotals, [
    { category: "food", amount: 3400 },
    { category: "transport", amount: 1200 },
  ]);
  assert.equal(summary.biggest.id, "one00000");
});

test("createSummary filters by month", () => {
  const summary = createSummary(expenses, { month: "2026-11" });
  assert.equal(summary.total, 3700);
  assert.equal(summary.biggest.id, "one00000");
  assert.equal(summary.month, "2026-11");
});

test("createSummary returns an empty result for a month with no spending", () => {
  const summary = createSummary(expenses, { month: "2026-09" });
  assert.equal(summary.total, 0);
  assert.deepEqual(summary.categoryTotals, []);
  assert.equal(summary.biggest, null);
});

test("createSummary reports the 80 percent budget threshold", () => {
  const summary = createSummary(expenses, { budget: 5000 });
  assert.deepEqual(summary.warnings, [{ threshold: 80 }]);
});

test("createSummary reports both thresholds at 100 percent or more", () => {
  const summary = createSummary(expenses, { budget: 4000 });
  assert.deepEqual(summary.warnings, [{ threshold: 80 }, { threshold: 100 }]);
});

test("createSummary rejects invalid months and budgets", () => {
  assert.throws(() => createSummary(expenses, { month: "2026-00" }), /YYYY-MM/);
  assert.throws(() => createSummary(expenses, { budget: 0 }), /positive number/);
});

test("toCsv writes the header and ordinary values", () => {
  assert.equal(
    toCsv([expenses[0]]),
    "id,date,category,amount,note\r\none00000,2026-11-03,food,2500,lunch\r\n",
  );
});

test("toCsv quotes and escapes commas and double quotes", () => {
  const csv = toCsv([{
    ...expenses[0],
    category: "food, groceries",
    note: 'said "hello"',
  }]);
  assert.equal(
    csv,
    'id,date,category,amount,note\r\none00000,2026-11-03,"food, groceries",2500,"said ""hello"""\r\n',
  );
});

test("toCsv quotes embedded newlines", () => {
  const csv = toCsv([{ ...expenses[0], note: "first line\nsecond line" }]);
  assert.equal(
    csv,
    'id,date,category,amount,note\r\none00000,2026-11-03,food,2500,"first line\nsecond line"\r\n',
  );
});
