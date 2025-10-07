# Configuration (app.config.ts and resolved.ts)

This document explains how `src/config/app.config.ts` and `src/config/resolved.ts` work, and what you need to set to run the bot in your guild.

## app.config.ts (structure & defaults)

- `app.config.ts` declares TypeScript types describing the application configuration (roles, channels, features).
- It also exports `DEFAULT_CONFIG`, a safe default for a specific guild (Remnant). Do not put secrets here.
- Key shapes:
  - `AppConfig`: top-level, includes `defaultPrefix`, `env` and optional `guild` object.
  - `GuildConfig`: `name`, `roles`, `channels`, and `features`.
  - `CoreRoles`: `admin`, `moderator`, `dm`, `member` (each `RoleRef` with `id` or `name`).
  - `Features`: optional `lfg` feature config with channel and role ids.

Why this separation:

- `app.config.ts` contains _non-sensitive_ defaults and maps all the IDs your guild needs.
- The code expects `DEFAULT_CONFIG.guild` to be a valid config at runtime. If you want to run in a different guild, update `app.config.ts` or override fields at runtime.

## resolved.ts (runtime resolution & env validation)

- `resolved.ts` uses `dotenv` and `zod` to validate environment variables.
- Required environment variables (validated by `zod`):
  - `DISCORD_TOKEN` (required)
  - `GUILD_ID` (required)
  - `APP_ID` (required)
- Optional/with-defaults:
  - `DB_FILE` — default `./data/remnant.sqlite`
  - `GUILD_FUND_ID` — default `sys:fund:remnant`
  - `DEV_GUILD_ID` — optional

- The file exports `CONFIG` which merges `DEFAULT_CONFIG` with `secrets`, `db`, and `system` objects derived from environment variables.

How to override for a different guild or test environment

- For local dev you can set `DEV_GUILD_ID` in `.env` and the registrar will deploy to the dev guild.
- For production, set `GUILD_ID`, `APP_ID`, and `DISCORD_TOKEN`, then run the registrar with `--prod` to upload commands to the configured guild.

Important notes

- `DEFAULT_CONFIG` may include IDs specific to the original Remnant guild. Audit these values before deploying to another guild; replace role/channel ids with your own.
- Keep secrets in `.env` only and never commit them.

Where this config is consumed

- `src/core/bot.ts` and commands read `CONFIG` to gate behavior (channel guards, role ids, feature toggles).
- Many commands assume `CONFIG.guild.config.channels.resourceTracking` exists when enforcing channel-only behavior.
