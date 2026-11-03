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
  if (typeof input.id !== "string" || input.id.trim() === "") {
    throw new Error("Expense ID is required.");
  }
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

  const expense = {
    id: input.id,
    amount,
    category: input.category.trim(),
    note: input.note?.trim() ?? "",
    date: input.date,
  };

  return [...list, expense];
}

function findExpenseIndex(list, id) {
  if (typeof id !== "string" || id.trim().length < 8) {
    throw new Error("Expense ID must be at least 8 characters.");
  }
  const normalizedId = id.toLowerCase();
  const matches = list
    .map((expense, index) => ({ expense, index }))
    .filter(({ expense }) => expense.id.toLowerCase().startsWith(normalizedId));

  if (matches.length === 0) {
    throw new Error(`No expense found with ID ${id}.`);
  }
  if (matches.length > 1) {
    throw new Error(`Expense ID ${id} is ambiguous; use a longer ID.`);
  }
  return matches[0].index;
}

export function deleteExpense(list, id) {
  const index = findExpenseIndex(list, id);
  return list.filter((_, expenseIndex) => expenseIndex !== index);
}

export function editExpense(list, id, changes) {
  const index = findExpenseIndex(list, id);
  const current = list[index];
  const updated = { ...current };

  if (changes.amount !== undefined) {
    const amount = Number(changes.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Amount must be a positive number.");
    }
    updated.amount = amount;
  }
  if (changes.category !== undefined) {
    if (typeof changes.category !== "string" || changes.category.trim() === "") {
      throw new Error("Category is required.");
    }
    updated.category = changes.category.trim();
  }
  if (changes.note !== undefined) {
    if (typeof changes.note !== "string") {
      throw new Error("Note must be text.");
    }
    updated.note = changes.note.trim();
  }
  if (changes.date !== undefined) {
    if (typeof changes.date !== "string" || !isValidDate(changes.date)) {
      throw new Error("Date must be a valid calendar date in YYYY-MM-DD format.");
    }
    updated.date = changes.date;
  }
  if (Object.keys(changes).length === 0) {
    throw new Error("Provide at least one field to edit.");
  }

  return list.map((expense, expenseIndex) => (expenseIndex === index ? updated : expense));
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
