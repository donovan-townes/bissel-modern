# Contributing

Thanks for considering contributing! This file is a short checklist for new contributors and a minimal PR checklist.

## Getting started (local dev)

1. Clone the repo and install deps:

```bash
git clone https://github.com/donovan-townes/bissel-modern.git
cd bissel-modern
npm install
cp .env.example .env
```

1. Ensure required env vars are present in `.env` (see `docs/CONFIG.md` and `.env.example`).

1. Initialize the database if needed:

```bash
npm run db:init
```

1. Start the bot in dev mode:

```bash
npm run dev
```

## How to add a command

- Create a file under `src/commands/` following the style of existing commands.
- Add or update user-facing strings under `config/strings/en/` as needed.
- Add a developer-facing doc in `docs/commands/<command>.md` following the existing template.
- Run the registrar to test in your dev guild (`npm run deploy:dev`) after setting `DEV_GUILD_ID` in `.env`.

## PR checklist

- [ ] Code follows existing patterns (no large API changes without discussion)
- [ ] Strings updated and reviewed for tone in `config/strings/en`
- [ ] `docs/commands/<command>.md` created/updated
- [ ] Lint passes (`npm run lint`) and formatting applied (`npm run format`)

## Notes

- Keep changes small and focused. If you want to introduce a new feature, open an issue first to discuss design and scope.

## Using t() in commands (strings guide)

When you add new command responses, use the `t()` helper to load localized strings. Examples and best practices:

- Call pattern in a command handler:

```ts
// inside an interaction handler
ix.reply({ content: t("buy.purchaseSuccess", { item: "Sword", amount: 10 }) });
```

- Recommended string template in JSON (`config/strings/en/buy.json`):

```json
"purchaseSuccess": "You bought {item} for {amount} GP."
```

- Use arrays for flavor variants:

```json
"purchaseSuccess": [
  "You bought {item} for {amount} GP.",
  "Purchase complete — {item} for {amount} GP."
]
```

- Placeholder tips:

- Keep placeholder names simple (`{item}`, `{amount}`, `{user}`).
- For nested objects use dotted placeholders like `{user.name}` and pass nested objects to `t()`.
- If you see literal `{placeholder}` in output, double-check the `t()` params in the command.
