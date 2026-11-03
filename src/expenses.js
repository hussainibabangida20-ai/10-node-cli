function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function isValidMonth(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function addExpense(list, input) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number.");
  }

  if (typeof input.category !== "string" || input.category.trim() === "") {
    throw new Error("Category is required.");
  }

  if (typeof input.date !== "string" || !isValidDate(input.date)) {
    throw new Error("Date must be a valid calendar date in YYYY-MM-DD format.");
  }
  if (input.note !== undefined && typeof input.note !== "string") {
    throw new Error("Note must be text.");
  }

  const id = list.reduce((largest, expense) => Math.max(largest, expense.id), 0) + 1;
  const expense = {
    id,
    amount,
    category: input.category.trim(),
    note: input.note?.trim() ?? "",
    date: input.date,
  };

  return [...list, expense];
}

export function listExpenses(list, filters = {}) {
  if (filters.category !== undefined) {
    if (typeof filters.category !== "string" || filters.category.trim() === "") {
      throw new Error("Category filter must be non-empty text.");
    }
  }
  if (filters.month !== undefined && (typeof filters.month !== "string" || !isValidMonth(filters.month))) {
    throw new Error("Month must be in YYYY-MM format.");
  }

  return list.filter((expense) => {
    const matchesCategory =
      filters.category === undefined ||
      expense.category.toLowerCase() === filters.category.toLowerCase();
    const matchesMonth =
      filters.month === undefined || expense.date.startsWith(filters.month);
    return matchesCategory && matchesMonth;
  });
}
