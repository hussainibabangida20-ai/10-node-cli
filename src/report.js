function isValidMonth(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(expenses) {
  const rows = [
    ["id", "date", "category", "amount", "note"],
    ...expenses.map(({ id, date, category, amount, note }) => [
      id,
      date,
      category,
      amount,
      note,
    ]),
  ];
  return `${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}\r\n`;
}

export function createSummary(expenses, { month, budget } = {}) {
  if (month !== undefined && (typeof month !== "string" || !isValidMonth(month))) {
    throw new Error("Month must be in YYYY-MM format.");
  }

  const filtered = month === undefined
    ? expenses
    : expenses.filter((expense) => expense.date.startsWith(month));
  const categories = new Map();
  let total = 0;

  for (const expense of filtered) {
    total += expense.amount;
    categories.set(expense.category, (categories.get(expense.category) ?? 0) + expense.amount);
  }

  const categoryTotals = [...categories.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((left, right) => right.amount - left.amount || left.category.localeCompare(right.category));
  const biggest = filtered.reduce(
    (largest, expense) => (largest === null || expense.amount > largest.amount ? expense : largest),
    null,
  );
  const warnings = [];

  if (budget !== undefined) {
    if (!Number.isFinite(budget) || budget <= 0) {
      throw new Error("Budget must be a positive number.");
    }
    if (total >= budget * 0.8) {
      warnings.push({ threshold: 80 });
    }
    if (total >= budget) {
      warnings.push({ threshold: 100 });
    }
  }

  return { month: month ?? null, total, categoryTotals, biggest, warnings };
}
