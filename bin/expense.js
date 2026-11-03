#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { parseArgs } from "../src/args.js";
import { isCsvRecordComplete, parseCsvRecord } from "../src/csv.js";
import {
  addExpense,
  deleteExpense,
  editExpense,
  listExpenses,
} from "../src/expenses.js";
import { createSummary, toCsv } from "../src/report.js";
import { load, loadSettings, save, saveSettings } from "../src/store.js";

const usage = `Usage:
  node bin/expense.js add --amount 2500 --category food --note "lunch" [--date YYYY-MM-DD]
  node bin/expense.js list [--category food] [--month YYYY-MM]
  node bin/expense.js edit --id <id> [--amount 3000] [--category food] [--note "dinner"] [--date YYYY-MM-DD]
  node bin/expense.js delete --id <id>
  node bin/expense.js summary [--month YYYY-MM]
  node bin/expense.js budget --set 50000
  node bin/expense.js export --format csv --out expenses.csv
  node bin/expense.js import --file bank.csv  (CSV headers: date,category,amount; note optional)
  node bin/expense.js help`;

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
});

function colorize(text, color, enabled) {
  return enabled ? `\u001b[${color}m${text}\u001b[0m` : text;
}

async function importCsv(file, expenses) {
  const lines = createInterface({
    input: createReadStream(file, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  let header;
  let record = "";
  let recordStartLine = 0;
  let lineNumber = 0;
  let imported = 0;
  const skipped = [];
  let updated = expenses;

  for await (const line of lines) {
    lineNumber += 1;
    if (record === "") {
      recordStartLine = lineNumber;
    } else {
      record += "\n";
    }
    record += line;
    if (!isCsvRecordComplete(record)) {
      continue;
    }

    let fields;
    try {
      fields = parseCsvRecord(record);
    } catch (error) {
      if (header === undefined) {
        throw new Error(`Invalid CSV header at line ${recordStartLine}: ${error.message}`);
      }
      skipped.push({ line: recordStartLine, reason: error.message });
      record = "";
      continue;
    }

    if (header === undefined) {
      header = fields.map((field) => field.trim().replace(/^\uFEFF/, "").toLowerCase());
      if (new Set(header).size !== header.length || header.some((name) => name === "")) {
        throw new Error("CSV header names must be non-empty and unique.");
      }
      for (const required of ["date", "category", "amount"]) {
        if (!header.includes(required)) {
          throw new Error(`CSV header must include date, category, and amount columns (missing ${required}).`);
        }
      }
      record = "";
      continue;
    }

    try {
      if (fields.length !== header.length) {
        throw new Error(`expected ${header.length} columns but found ${fields.length}`);
      }
      const row = Object.fromEntries(header.map((name, index) => [name, fields[index]]));
      const validatedExpense = addExpense([], {
        id: randomUUID(),
        date: row.date,
        category: row.category,
        amount: row.amount,
        note: row.note ?? "",
      })[0];
      updated.push(validatedExpense);
      imported += 1;
    } catch (error) {
      skipped.push({ line: recordStartLine, reason: error.message });
    }
    record = "";
  }

  if (record !== "") {
    if (header === undefined) {
      throw new Error(`Invalid CSV header at line ${recordStartLine}: unterminated quoted field.`);
    }
    skipped.push({ line: recordStartLine, reason: "unterminated quoted field" });
  }
  if (header === undefined) {
    throw new Error("CSV file is empty.");
  }

  return { expenses: updated, imported, skipped };
}

function printExpenses(expenses, useColor) {
  if (expenses.length === 0) {
    console.log("No expenses found.");
    return;
  }

  console.table(
    expenses.map(({ id, date, category, amount, note }) => ({
      ID: colorize(id.slice(0, 8), "36", useColor),
      Date: date,
      Category: colorize(category, "33", useColor),
      Amount: colorize(currency.format(amount), "32", useColor),
      Note: note,
    })),
  );
}

function printSummary(summary, useColor) {
  console.log(colorize(`Summary${summary.month ? ` for ${summary.month}` : ""}`, "1;36", useColor));
  console.log(`Total spent: ${colorize(currency.format(summary.total), "32", useColor)}`);

  if (summary.categoryTotals.length === 0) {
    console.log("No expenses found.");
  } else {
    const largest = summary.categoryTotals[0].amount;
    console.log("\nSpending by category:");
    for (const { category, amount } of summary.categoryTotals) {
      const barLength = Math.max(1, Math.round((amount / largest) * 20));
      console.log(`${category.padEnd(16)} ${colorize("█".repeat(barLength), "34", useColor)} ${currency.format(amount)}`);
    }
  }

  console.log(
    summary.biggest
      ? `\nBiggest expense: ${currency.format(summary.biggest.amount)} (${summary.biggest.category}, ${summary.biggest.date}, ID ${summary.biggest.id.slice(0, 8)})`
      : "\nBiggest expense: none",
  );
  for (const warning of summary.warnings) {
    console.log(
      colorize(warning.threshold === 100
        ? "WARNING: Spending has reached or exceeded 100% of the budget."
        : "WARNING: Spending has reached 80% of the budget.", "31;1", useColor),
    );
  }
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const { command, options } = parsed;
  const useColor = process.stdout.isTTY && !parsed.noColor;
  if (command === "help" || command === undefined) {
    console.log(usage);
    return;
  }
  if (!["add", "list", "delete", "edit", "summary", "budget", "export", "import"].includes(command)) {
    throw new Error(`Unknown command: ${command}\n\n${usage}`);
  }

  if (command === "budget") {
    const amount = Number(options.set);
    if (options.set === undefined || !Number.isFinite(amount) || amount <= 0) {
      throw new Error("Budget must be set to a positive number.");
    }
    const settings = await loadSettings();
    settings.budget = amount;
    await saveSettings(settings);
    console.log(colorize(`Budget set to ${currency.format(amount)}.`, "32", useColor));
    return;
  }

  if (command === "import") {
    if (!options.file) {
      throw new Error("Import requires --file <path>.");
    }
    const result = await importCsv(options.file, await load());
    await save(result.expenses);
    console.log(colorize(`Imported ${result.imported} expense(s).`, "32", useColor));
    for (const item of result.skipped) {
      console.error(`Skipped line ${item.line}: ${item.reason}`);
    }
    return;
  }

  if (command === "export") {
    if (options.format !== "csv" || !options.out) {
      throw new Error("Export requires --format csv and --out <path>.");
    }
  }

  const expenses = await load();
  if (command === "export") {
    await writeFile(options.out, toCsv(expenses), "utf8");
    console.log(colorize(`Exported ${expenses.length} expense(s) to ${options.out}.`, "32", useColor));
  } else if (command === "add") {
    const input = {
      ...options,
      id: randomUUID(),
      date: options.date ?? new Date().toISOString().slice(0, 10),
    };
    const updatedExpenses = addExpense(expenses, input);
    await save(updatedExpenses);
    const added = updatedExpenses[updatedExpenses.length - 1];
    console.log(colorize(`Added expense ${added.id.slice(0, 8)}: ${currency.format(added.amount)} for ${added.category}.`, "32", useColor));
  } else if (command === "list") {
    printExpenses(listExpenses(expenses, options), useColor);
  } else if (command === "delete") {
    if (options.id === undefined) {
      throw new Error("Delete requires --id <id>.");
    }
    const updatedExpenses = deleteExpense(expenses, options.id);
    await save(updatedExpenses);
    console.log(colorize(`Deleted expense ${options.id.slice(0, 8)}.`, "32", useColor));
  } else if (command === "edit") {
    if (options.id === undefined) {
      throw new Error("Edit requires --id <id>.");
    }
    const { id, ...changes } = options;
    const updatedExpenses = editExpense(expenses, id, changes);
    await save(updatedExpenses);
    console.log(colorize(`Updated expense ${id.slice(0, 8)}.`, "32", useColor));
  } else if (command === "summary") {
    const settings = await loadSettings();
    printSummary(createSummary(expenses, {
      month: options.month,
      budget: settings.budget,
    }), useColor);
  }
}

function handleError(error) {
  const failure = error instanceof Error ? error : new Error(String(error));
  if (process.env.DEBUG === "1") {
    console.error(failure.stack ?? failure.message);
  } else {
    const message = failure.code === "ENOENT"
      ? `File not found: ${failure.path ?? "requested path"}`
      : failure.message || "An unexpected error occurred.";
    console.error(`Error: ${message}`);
  }
  process.exitCode = 1;
}

await main().catch(handleError);
