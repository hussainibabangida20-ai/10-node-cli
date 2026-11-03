import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const dataDirectory = join(directory, "..", "data");
const dataFile = join(dataDirectory, "expenses.json");

export async function load() {
  await mkdir(dataDirectory, { recursive: true });

  let contents;
  try {
    contents = await readFile(dataFile, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    await writeFile(dataFile, "[]\n", "utf8");
    return [];
  }

  let expenses;
  try {
    expenses = JSON.parse(contents);
  } catch (error) {
    throw new Error(`Could not parse ${dataFile}: ${error.message}`);
  }
  if (!Array.isArray(expenses)) {
    throw new Error(`Expense data in ${dataFile} must be a JSON array.`);
  }
  return expenses;
}

export async function save(expenses) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(expenses, null, 2)}\n`, "utf8");
}
