const VALUE_OPTIONS = new Set(["amount", "category", "note", "date", "month"]);
const COMMAND_OPTIONS = {
  add: new Set(["amount", "category", "note", "date"]),
  list: new Set(["category", "month"]),
  help: new Set(),
};

export function parseArgs(argv) {
  const [command, ...args] = argv;
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }

    const name = argument.slice(2);
    if (!VALUE_OPTIONS.has(name)) {
      throw new Error(`Unknown option: ${argument}`);
    }
    if (command !== undefined && !COMMAND_OPTIONS[command]?.has(name)) {
      throw new Error(`Option ${argument} is not valid for the ${command} command.`);
    }
    if (options[name] !== undefined) {
      throw new Error(`Option ${argument} was provided more than once.`);
    }

    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Option ${argument} requires a value.`);
    }
    options[name] = value;
    index += 1;
  }

  return { command, options };
}
