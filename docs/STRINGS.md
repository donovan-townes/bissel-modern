# STRINGS

This document explains how to edit user-facing strings and how the string system is implemented.

## Overview

All user-facing copy lives in `config/strings/en/`. Files are split by topic (for example `errors.json`, `lfg.json`, `buy.json`) so editors can find and update strings without touching code.

The runtime provides a helper `t(key, params)` to resolve localized strings by key. The implementation supports nested keys, placeholder interpolation, and random selection when a key maps to an array of variants.

## Editing strings (authoring workflow)

- Edit the appropriate JSON file under `config/strings/en/`.
- Keep related keys together and prefer short, descriptive keys (e.g., `lfg.errors.notOnBoard`).
- Use placeholders for dynamic values: `{item}`, `{amount}`, `{user}`, `{user.name}`, etc.
- When you need variation for flavor, make the value an array of strings — the loader will pick a random element.

Example JSON snippet:

```json
{
  "buy": {
    "purchaseSuccess": [
      "Purchase complete — {item} for {amount} GP.",
      "Bought {item} for {amount} GP. May it serve you well."
    ]
  }
}
```

Basic steps to test edits locally:

1. Save the JSON file.
1. Restart the bot (or call the live reload helper if you implement a `/strings reload` command).
1. Use the `/strings` smoke command or the relevant bot command to verify the text.

## Implementation (how the string system works)

The implementation lives in `src/lib/i18n.ts`. Key behaviors:

- Loader paths:
  - The loader looks for strings in `config/strings/en` (source layout) and `dist/config/strings/en` (compiled layout). It picks the first existing directory under the project root.
- Catalog and caching:
  - On first use the loader reads all `*.json` files and builds a single in-memory `catalog` object. This catalog is cached for subsequent `t()` calls.
- Deep merge:
  - JSON files are deep-merged into a single dictionary. This allows splitting strings by topic and merging nested keys safely.
- Key lookup and resolution:
  - `t(key, params)` resolves a dotted key (e.g., `lfg.add.success`) against the merged catalog.
  - If the key is missing, `t()` returns the key string itself — a helpful visual marker for missing translations.
- Array values (variants):
  - If the resolved value is an array, the implementation picks a random element and applies placeholder formatting.
- Placeholder formatting:
  - Placeholders use `{name}` or nested `{user.name}` syntax. The formatter replaces placeholders using the supplied `params` object. If a placeholder value is missing, the placeholder is left in the string (e.g., `{amount}`), making the missing parameter visible.
- Reloading:
  - `reloadStrings()` clears the cached catalog so subsequent `t()` calls reload JSON from disk. This is useful for development or if you add a live reload command.

Minimal behavior summary (pseudocode):

```ts
// loadOnFirstUse()
files = readJsonFiles(dir);
catalog = deepMerge(files);

function t(key, params) {
  node = getFromCatalog(catalog, key);
  if (!node) return key;
  if (Array.isArray(node)) pick = random(node);
  result = formatPlaceholders(pickOrNode, params);
  return result;
}

function reloadStrings() {
  catalog = null;
}
```

## Gotchas and recommendations

- Run tools from the project root. The loader uses `process.cwd()` to resolve `config/strings/en` or `dist/config/strings/en`.
- When running a built app (`npm run build`), ensure the build step copies `config/strings/en` into `dist/` if you expect the production binary to find the strings at runtime.
- Because the loader deep-merges files, avoid duplicate nested keys across topic files unless you intentionally want to override parts of the namespace.
- Placeholder values are naive string replacements — pass strings or numbers, not complex objects, unless the template expects nested keys like `{user.name}`.
- If you see raw `{placeholder}` in output, check that the command supplies the matching param name in its `t()` call.

## Testing and tools

- There's a smoke script at `src/scripts/strings-smoke.ts` which calls `t()` on a few example keys. Run it to quickly verify the current catalog output:

```bash
node ./src/scripts/strings-smoke.ts
```

- You can also test in-guild with the `/strings` command which echoes selected localized lines.

## Examples

- Random variant selection (from JSON array):

```json
"purchaseSuccess": [
  "You bought {item} for {amount} GP.",
  "Purchase successful — {item} spent {amount} GP."
]
```

`t('purchaseSuccess', { item: 'Sword', amount: 10 })` picks one of the array items and formats it.

- Nested placeholders:

```ts
t("welcome", { user: { name: "Ava" } });
// template: "Welcome, {user.name}!"
```
