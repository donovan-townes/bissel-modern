# health command

[Home](README.md) / [Commands](README.md) / [health](health.md)

## Purpose

- Provide a quick bot health and uptime check for operators and maintainers. Returns uptime, WS ping, DB probe status, version, environment, and guild context.

## Location

- Implementation: `src/commands/health.ts`
- Probes: `getDb()` used for a lightweight DB probe.

## Slash command signature

- Name: `/health`
- Description: "Show bot health/uptime and basic checks"
- Default permissions: ManageRoles (restricted by builder)

## Behavior / Contract

## Inputs

- Interaction: `ChatInputCommandInteraction` from Discord.js.

## Outputs / Side effects

- Replies ephemerally with a summary text block that includes:
  - Uptime (h m s)
  - WebSocket ping in ms
  - DB probe: `ok` or `error`
  - Version (from package.json) and optional COMMIT_SHA from env
  - Node environment (NODE_ENV) and guild context
- Performs a non-destructive DB `SELECT 1` to check connectivity; logs error to console on failure.

## Data shapes

- None persistent; uses in-memory values from `interaction.client` and basic DB probe.

## Key helpers / code notes

- Reads package.json version using an import and `process.env.COMMIT_SHA` for commit metadata.
- `ms()` utility converts milliseconds to `Xh Ym Zs` string.

## Validation and errors

- DB probe may mark DB status as `error` if the `SELECT 1` check fails; the command still returns results with DB status included.

## Localization keys used

- (none; replies are assembled inline)

## SQL / DB effects

- Executes: `SELECT 1` as a connectivity probe.

## Edge cases & notes for maintainers

- The command imports `package.json` at runtime; ensure bundling or runtime import works with your deployment.
- DB check is a lightweight probe; if you need heavier health checks (migrations, WAL status), expand accordingly.

## Examples

- `/health` — Returns ephemeral diagnostics to the caller.

## Testing suggestions

- Simulate DB error to confirm the command marks DB as `error` and still replies.

## How to improve later

- Add more probes (cache, external API). Provide structured JSON output for monitoring.

## Where to look next

- `src/db/index.ts` and deployment packaging scripts for versioning.

Maintainer contact

- Author: see git history for `src/commands/health.ts`.

  ***

[Home](README.md) / [Commands](README.md) / [health](health.md)

This document was generated from the implementation at `src/commands/health.ts`. Keep it updated if the code changes.
