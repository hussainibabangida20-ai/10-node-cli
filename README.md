# Node.js Expense Tracker

A dependency-free expense tracker CLI for Node.js 20+ using ES modules.

## Setup

```sh
npm test
node bin/expense.js help
```

Expenses and settings are stored under `data/`, created automatically as needed.

## Usage

### Add an expense

```sh
node bin/expense.js add --amount 2500 --category food --note "lunch"
node bin/expense.js add --amount 2500 --category food --date 2026-11-03
```

Amount must be positive, category is required, and date defaults to today.

### List expenses

```sh
node bin/expense.js list
node bin/expense.js list --category food
node bin/expense.js list --month 2026-11
node bin/expense.js list --category food --month 2026-11
```

Categories are matched without regard to case. Table IDs are shortened to eight
characters.

### Edit an expense

Use the shortened ID shown by `list`. Supply one or more changed fields:

```sh
node bin/expense.js edit --id <8-character-id> --amount 3000
node bin/expense.js edit --id <8-character-id> --category dining --note "Dinner"
```

If a shortened ID is ambiguous, use a longer prefix.

### Delete an expense

```sh
node bin/expense.js delete --id <8-character-id>
```

### Show a summary

```sh
node bin/expense.js summary
node bin/expense.js summary --month 2026-11
```

The summary shows spending totals, category bars, the biggest single expense,
and budget warnings when a budget is configured.

### Set a budget

```sh
node bin/expense.js budget --set 50000
```

The budget is stored in `data/settings.json`. Summary warnings appear at 80% and
100% of the configured amount.

### Export CSV

```sh
node bin/expense.js export --format csv --out expenses.csv
```

Exports the expenses with the columns `id,date,category,amount,note`, escaping
commas, quotes, and newlines according to CSV rules.

### Import CSV

```sh
node bin/expense.js import --file sample-bank.csv
```

CSV must have `date`, `category`, and `amount` headers. `note` is optional.
Invalid rows are skipped and reported with their source line numbers. Import
uses a stream so the full source file is not read into memory at once, which
helps with large bank exports.

### Help and color

```sh
node bin/expense.js help
node bin/expense.js list --no-color
```

ANSI colors are enabled only when output is a TTY. `--no-color` disables them.
For stack traces when an error occurs, set `DEBUG=1`.

## Install the `expense` command with `npm link`

From the project directory, run:

```sh
npm link
```

Then run `expense` from any folder:

```sh
expense add --amount 2500 --category food --note "lunch"
```

The `bin` entry in `package.json` maps the command name `expense` to
`bin/expense.js`. The `#!/usr/bin/env node` shebang tells the operating system
to run that file with Node.js. `npm link` creates a global link/shim for the
package's declared executable, so the command can be found on your PATH.

To unlink it later, run `npm unlink -g node-cli-expense-tracker`.

## Tests

Tests use Node's built-in `node:test` runner and `node:assert/strict`; no
additional test packages are required:

```sh
npm test
```
