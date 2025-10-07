# bissel-modern (renamed to Quil)

> A modern rewrite of the Bissel Discord bot for Remnant D&D Discord Server.  
> Rebuilt on the latest Discord.js with updated configs, typed personality strings, and long-term maintainability in mind.

[![Docs](https://img.shields.io/badge/docs-commands-blue)](./docs/README.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Discord](https://img.shields.io/discord/752203580208632330?color=blue&label=discord)](https://discord.gg/w5UCzyDXzb)

---

## 🎌 Quick Start (local development)

Requirements

- Node.js LTS (v20 recommended)
- npm v9+

```powershell
git clone https://github.com/donovan-townes/bissel-modern.git
cd bissel-modern
# use npm ci for reproducible installs on CI/servers
npm ci

# copy env example and edit
cp .env.example .env

# initialize database (creates data/remnant.sqlite)
npm run db:init

# register slash commands to your dev guild (see docs/RUNBOOK.md)
npm run deploy:dev

# start in dev (tsx watcher)
npm run dev
```

If successful, the console should log a ready message for the bot (e.g. "Ready! Logged in as <bot#tag>").

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

---

## 🗺️ Roadmap

- WPT-01 (Foundation) — _in progress_
  - Repo scaffolded with Node + ESLint/Prettier
  - Centralized config
  - Personality strings migrated

- WPT-02 (Core Features) — _up next_
  - Command handling
  - Event handling
  - Role assignment
  - Leveling system
  - Logging

## ©️ License

MIT License
