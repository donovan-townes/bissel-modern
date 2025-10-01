
# bissel-modern Development Log

High-level log of major steps taken while building this project.  
This is not a detailed changelog; it’s a *narrative of progress* for future developers and my future self.

---

## WPT-01 • Foundation & Repo Hygiene — **DONE**

### MO-01.1 — New repo & scaffold

- Repo initialized (`bissel-modern`), ESLint/Prettier, `.env.example`, README/RUNBOOK stubs.
- DoD: `npm run dev` boots and the bot starts.

### MO-01.2 — Config & secrets

- Adopted a typed config module for IDs/toggles (`src/config/app.config.ts`).
- Secrets remain in `.env`. (Dev guild deploys only.)

### MO-01.3 — Personality lift

- Moved all user-facing copy into namespaced JSON files:
    `config/strings/en/{common,errors,commands,lfg,dm,charlog}.json`
- Implemented `t(key, params)` helper with param interpolation and random-pick arrays for “personality.”
- Smoke tested via `npm run strings:smoke`; in-guild verified with `/strings` (ephemeral).
- Registrar hardened: guild-only during dev; accidentally created global commands were cleared.

### Rationale / design notes

- **Separation of concerns:** IDs/toggles in TS config, copy in JSON.
- **Future-proof:** Easy to add more topics or a second language later; can add per-guild overrides with a small deep-merge if ever needed.
- **Draft-friendly:** Editing JSON keys is safe and easy to draft/adjust lines without code changes.

### How to edit copy later (3 steps)

1. Open `config/strings/en/<topic>.json`.
2. Find the key (e.g., `"errors": { "permission": { "guild_member_only": "…" }}`) and change the string.
3. Restart the bot (or use a future `/strings reload`) to see it take effect.
*Example:*:

```json
// config/strings/en/errors.json
{
  "errors": {
    "permission": {
      "guild_member_only": "This is for Guild Members only."
    }
  }
}

```

### Proof of completion

- Console shows `Loaded 1 slash commands.`
- In test guild, `/strings` returns expected lines from JSON.

---

## WPT-02 • Discord.js v14 Core — **Next up**

### MO-02.1 — v14 client & intents

- Status: partially complete (router is in; client booting).
- Add `/health` heartbeat (uptime + ok).
- Confirm intents for `Guilds`, `GuildMessages`, `MessageContent`.
- Add basic process error traps (unhandled/uncaught) + ready log.

### MO-02.2 — Slash registrar

- Status: done. Guild-scoped upsert with `-list` and `-clear-global` tools.

### MO-02.3 — Prefix bridge

- Status: pending.
- Map `!stats` and `!addxp` to the same handlers as the slash versions (shared function pattern).

## Completed Work

> Typescript scaffolding + dev/prod scripts
> docs started
> bot boots with interaction + message gateway intents
> updated config setup, using app.config over config.json
> dotenv for secrets
> verified bot connects to Discord
> integrated strings for channel names, role names, prefixes, level curve
> implemented `/strings` command to dump current strings for testing
> implemented slash command registrar (guild-scoped to dev for now)
> updated scripts for clearing global commands and registering guild commands

---
