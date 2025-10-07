# bissel-modern

> A modern rewrite of the Bissel Discord bot for Remnant D&D Discord Server.  
> Rebuilt on the latest Discord.js with updated configs, typed personality strings, and long-term maintainability in mind.

---

## 🚀 Quick Start

```bash
git clone https://github.com/donovan-townes/bissel-modern.git

cd bissel-modern
npm install

cp .env.example .env

npm run dev
```

If successful, the bot should log:

```bash
bootstrapped
```

### Required environment variables

Before running the bot, ensure you have the following variables in your `.env` (see `.env.example`):

- `DISCORD_TOKEN` — your bot token (required)
- `APP_ID` — Discord Application ID (required for registrar)
- `GUILD_ID` — Production guild id (required for production registrar operations)
- `DEV_GUILD_ID` — Optional: use for quick dev uploads of slash commands

For more details on configuration and what each variable does, see `docs/CONFIG.md`.

---

## 📚 Documentation

- [Docs Overview](./docs/README.md)
- [Runbook](./docs/RUNBOOK.md)
- [Devlog](./docs/DEVLOG.md)

---

## 🛠️ Tech Stack

- Node.js (LTS)
- Discord.js (latest)
- ESLint + Prettier
- dotenv for secrets
