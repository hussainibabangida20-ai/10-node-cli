#!/usr/bin/env node

import { parseArgs } from "../src/args.js";
import { addExpense, listExpenses } from "../src/expenses.js";
import { load, save } from "../src/store.js";

const usage = `Usage:
  node bin/expense.js add --amount 2500 --category food --note "lunch" [--date YYYY-MM-DD]
  node bin/expense.js list [--category food] [--month YYYY-MM]
  node bin/expense.js help`;

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
});

function printExpenses(expenses) {
  if (expenses.length === 0) {
    console.log("No expenses found.");
    return;
  }

  console.table(
    expenses.map(({ id, date, category, amount, note }) => ({
      ID: id,
      Date: date,
      Category: category,
      Amount: currency.format(amount),
      Note: note,
    })),
  );
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Error: ${error.message}\n\n${usage}`);
    process.exitCode = 1;
    return;
  }

  const { command, options } = parsed;
  if (command === "help" || command === undefined) {
    console.log(usage);
    return;
  }
  if (command !== "add" && command !== "list") {
    console.error(`Error: Unknown command: ${command}\n\n${usage}`);
    process.exitCode = 1;
    return;
  }

  try {
    const expenses = await load();
    if (command === "add") {
      const input = {
        ...options,
        date: options.date ?? new Date().toISOString().slice(0, 10),
      };
      const updatedExpenses = addExpense(expenses, input);
      await save(updatedExpenses);
      const added = updatedExpenses[updatedExpenses.length - 1];
      console.log(`Added expense #${added.id}: ${currency.format(added.amount)} for ${added.category}.`);
    } else if (command === "list") {
      printExpenses(listExpenses(expenses, options));
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

await main();
