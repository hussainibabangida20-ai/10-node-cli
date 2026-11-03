#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { parseArgs } from "../src/args.js";
import {
  addExpense,
  deleteExpense,
  editExpense,
  listExpenses,
} from "../src/expenses.js";
import { createSummary } from "../src/report.js";
import { load, loadSettings, save, saveSettings } from "../src/store.js";

const usage = `Usage:
  node bin/expense.js add --amount 2500 --category food --note "lunch" [--date YYYY-MM-DD]
  node bin/expense.js list [--category food] [--month YYYY-MM]
  node bin/expense.js edit --id <id> [--amount 3000] [--category food] [--note "dinner"] [--date YYYY-MM-DD]
  node bin/expense.js delete --id <id>
  node bin/expense.js summary [--month YYYY-MM]
  node bin/expense.js budget --set 50000
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
      ID: id.slice(0, 8),
      Date: date,
      Category: category,
      Amount: currency.format(amount),
      Note: note,
    })),
  );
}

function printSummary(summary) {
  console.log(`Summary${summary.month ? ` for ${summary.month}` : ""}`);
  console.log(`Total spent: ${currency.format(summary.total)}`);

  if (summary.categoryTotals.length === 0) {
    console.log("No expenses found.");
  } else {
    const largest = summary.categoryTotals[0].amount;
    console.log("\nSpending by category:");
    for (const { category, amount } of summary.categoryTotals) {
      const barLength = Math.max(1, Math.round((amount / largest) * 20));
      console.log(`${category.padEnd(16)} ${"█".repeat(barLength)} ${currency.format(amount)}`);
    }
  }

  console.log(
    summary.biggest
      ? `\nBiggest expense: ${currency.format(summary.biggest.amount)} (${summary.biggest.category}, ${summary.biggest.date}, ID ${summary.biggest.id.slice(0, 8)})`
      : "\nBiggest expense: none",
  );
  for (const warning of summary.warnings) {
    console.log(
      warning.threshold === 100
        ? "WARNING: Spending has reached or exceeded 100% of the budget."
        : "WARNING: Spending has reached 80% of the budget.",
    );
  }
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
  if (!["add", "list", "delete", "edit", "summary", "budget"].includes(command)) {
    console.error(`Error: Unknown command: ${command}\n\n${usage}`);
    process.exitCode = 1;
    return;
  }

  try {
    if (command === "budget") {
      const amount = Number(options.set);
      if (options.set === undefined || !Number.isFinite(amount) || amount <= 0) {
        throw new Error("Budget must be set to a positive number.");
      }
      const settings = await loadSettings();
      settings.budget = amount;
      await saveSettings(settings);
      console.log(`Budget set to ${currency.format(amount)}.`);
      return;
    }

    const expenses = await load();
    if (command === "add") {
      const input = {
        ...options,
        id: randomUUID(),
        date: options.date ?? new Date().toISOString().slice(0, 10),
      };
      const updatedExpenses = addExpense(expenses, input);
      await save(updatedExpenses);
      const added = updatedExpenses[updatedExpenses.length - 1];
      console.log(`Added expense ${added.id.slice(0, 8)}: ${currency.format(added.amount)} for ${added.category}.`);
    } else if (command === "list") {
      printExpenses(listExpenses(expenses, options));
    } else if (command === "delete") {
      if (options.id === undefined) {
        throw new Error("Delete requires --id <id>.");
      }
      const updatedExpenses = deleteExpense(expenses, options.id);
      await save(updatedExpenses);
      console.log(`Deleted expense ${options.id.slice(0, 8)}.`);
    } else if (command === "edit") {
      if (options.id === undefined) {
        throw new Error("Edit requires --id <id>.");
      }
      const { id, ...changes } = options;
      const updatedExpenses = editExpense(expenses, id, changes);
      await save(updatedExpenses);
      console.log(`Updated expense ${id.slice(0, 8)}.`);
    } else if (command === "summary") {
      const settings = await loadSettings();
      printSummary(createSummary(expenses, {
        month: options.month,
        budget: settings.budget,
      }));
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

await main();
