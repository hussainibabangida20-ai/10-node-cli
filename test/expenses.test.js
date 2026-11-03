import test from "node:test";
import assert from "node:assert/strict";
import { addExpense, listExpenses } from "../src/expenses.js";

const validInput = {
  id: "expense-0001",
  amount: "2500",
  category: " food ",
  note: " lunch ",
  date: "2026-11-03",
};

const expenses = [
  { id: "one00000", amount: 2500, category: "food", note: "lunch", date: "2026-11-03" },
  { id: "two00000", amount: 1200, category: "transport", note: "bus", date: "2026-11-04" },
  { id: "three000", amount: 900, category: "food", note: "", date: "2026-10-28" },
];

test("addExpense creates a normalized expense without mutating the input list", () => {
  const original = [];
  const result = addExpense(original, validInput);
  assert.deepEqual(original, []);
  assert.deepEqual(result, [{
    id: "expense-0001",
    amount: 2500,
    category: "food",
    note: "lunch",
    date: "2026-11-03",
  }]);
});

test("addExpense rejects missing IDs", () => {
  assert.throws(() => addExpense([], { ...validInput, id: "" }), /ID is required/);
});

test("addExpense rejects non-positive amounts", () => {
  assert.throws(() => addExpense([], { ...validInput, amount: "0" }), /positive number/);
});

test("addExpense rejects non-numeric amounts", () => {
  assert.throws(() => addExpense([], { ...validInput, amount: "many" }), /positive number/);
});

test("addExpense rejects empty categories", () => {
  assert.throws(() => addExpense([], { ...validInput, category: "  " }), /Category is required/);
});

test("addExpense rejects impossible calendar dates", () => {
  assert.throws(() => addExpense([], { ...validInput, date: "2026-02-30" }), /valid calendar date/);
});

test("addExpense rejects non-text notes", () => {
  assert.throws(() => addExpense([], { ...validInput, note: 123 }), /Note must be text/);
});

test("listExpenses returns all expenses without filters", () => {
  assert.deepEqual(listExpenses(expenses), expenses);
});

test("listExpenses filters category without case sensitivity", () => {
  assert.deepEqual(listExpenses(expenses, { category: "FOOD" }), [expenses[0], expenses[2]]);
});

test("listExpenses filters by month", () => {
  assert.deepEqual(listExpenses(expenses, { month: "2026-11" }), [expenses[0], expenses[1]]);
});

test("listExpenses applies category and month filters together", () => {
  assert.deepEqual(listExpenses(expenses, { category: "food", month: "2026-11" }), [expenses[0]]);
});

test("listExpenses rejects invalid month filters", () => {
  assert.throws(() => listExpenses(expenses, { month: "2026-13" }), /YYYY-MM/);
});
