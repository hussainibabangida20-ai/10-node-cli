import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const dataDirectory = join(directory, "..", "data");
const dataFile = join(dataDirectory, "expenses.json");
const settingsFile = join(dataDirectory, "settings.json");

async function loadJson(file, fallback, description) {
  await mkdir(dataDirectory, { recursive: true });

  let contents;
  try {
    contents = await readFile(file, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    await writeFile(file, `${JSON.stringify(fallback, null, 2)}\n`, "utf8");
    return fallback;
  }

  let value;
  try {
    value = JSON.parse(contents);
  } catch (error) {
    throw new Error(`Could not parse ${file}: ${error.message}`);
  }
  if (description === "expense data" && !Array.isArray(value)) {
    throw new Error(`Expense data in ${file} must be a JSON array.`);
  }
  if (description === "settings" && (value === null || Array.isArray(value) || typeof value !== "object")) {
    throw new Error(`Settings in ${file} must be a JSON object.`);
  }
  return value;
}

export async function load() {
  return loadJson(dataFile, [], "expense data");
}

export async function save(expenses) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(expenses, null, 2)}\n`, "utf8");
}

export async function loadSettings() {
  return loadJson(settingsFile, {}, "settings");
}

export async function saveSettings(settings) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(settingsFile, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}
