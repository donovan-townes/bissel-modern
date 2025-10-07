# gp command

[Home](README.md) / [Commands](README.md) / [gp](gp.md)

## Purpose

- Manage users' gold (GP). Supports showing, adding, adjusting, and setting GP values. Internally stores amounts as copper (CP).

## Location

- Implementation: `src/commands/gp.ts`
- DB table used: `charlog` (reads and upserts cp and basic identity fields)

## Slash command signature

- Name: `/gp`
- Description: "Manage a user's gold (GP). Stored internally as copper (CP)."
- Subcommands:
  - `show` — Show GP for a user (user optional; defaults to caller)
  - `add` — Give GP to a user (requires target user and positive amount)
  - `adjust` — Adjust a user's GP by a signed decimal (can remove)
  - `set` — Set a user's GP to an exact value
- Common options for mutating subcommands:
  - `user` (user, required) — Target user
  - `amount` (number, required where applicable) — GP amount (positive for add, signed for adjust)
  - `reason` (string, optional) — Audit reason (max length 200)

## Behavior / Contract

## Inputs

- Interaction: `ChatInputCommandInteraction` from Discord.js.
- Permissions are validated against roles configured in `CONFIG.guild.config.roles` using `validateCommandPermissions`.

## Outputs / Side effects

- `show` replies with an embed showing GP and CP (stored) for the target user.
- Mutating subcommands (`add`, `adjust`, `set`) update `charlog.cp` via `upsertPlayerCP` which performs an INSERT ... ON CONFLICT and sets cp (and optionally name) accordingly.
- Replies are localized with `t('gp.*')` keys and include mention, name, amounts, and an optional reason line.

## Data shapes

- PlayerRow:
  - `userId: string`
  - `name: string`
  - `xp: number`
  - `level: number`
  - `cp: number` (integer copper)
  - `tp: number`

## Key helpers in `src/commands/gp.ts`

- getPlayerByUserId(userId) — SELECT userId, name, xp, level, cp, tp FROM charlog WHERE userId = ?
- upsertPlayerCP(userId, nextCP, displayName?) — INSERT INTO charlog ... ON CONFLICT(userId) DO UPDATE SET cp = excluded.cp, name = COALESCE(excluded.name, charlog.name)
- toCp(amountGp) — converts GP to CP using Math.round(amountGp \* 100)
- toGpString(cp) — returns GP as a string with two decimals

## Validation and errors

- Permission guard: `validateCommandPermissions(ix, member, PERMS)` — will prevent unauthorized usage.
- Channel guard: If `CONFIG.guild.config.channels.resourceTracking` is configured the command only runs there; otherwise it rejects with `common.notInResourceChannel`.
- For `show`, `add`, `adjust`, `set`: If the target user is not in the system the command replies ephemeral with `gp.errors.notInSystem`.
- `add` enforces amount > 0 and will reject invalid amounts with `gp.errors.invalidAmount`.

## Localization keys used

- `common.notInResourceChannel`
- `gp.errors.notInSystem`
- `gp.errors.invalidAmount`
- `gp.add.ok`
- `gp.adjust.ok`
- `gp.set.ok`
- `gp.reasonFmt`

## SQL / DB effects

- Reads with `getPlayerByUserId` (SELECT)
- Writes with `upsertPlayerCP` which performs INSERT or UPDATE to set `cp` and optionally `name`.

## Edge cases & notes for maintainers

- `upsertPlayerCP` uses COALESCE to preserve existing name/level/xp/tp if not provided; cp is replaced with the provided value.
- Concurrency: upsert is atomic for the single statement, but callers still do a read then a write for some flows; consider stronger transactional patterns for complex workflows.
- The permission sets (add/adjust/set/show) are derived from `CONFIG.guild.config.roles` and filtered; ensure the app config defines these roles to avoid empty permission lists.

## Examples

- `/gp show user:@Friend`
- `/gp add user:@Friend amount:5.00 reason:"Quest reward"`
- `/gp adjust user:@Friend amount:-2.50 reason:"Repair"`
- `/gp set user:@Friend amount:100.00 reason:"Admin grant"`

## Testing suggestions

- Unit tests for `upsertPlayerCP` to ensure INSERT and UPDATE paths behave correctly.
- Permission tests to confirm `validateCommandPermissions` blocks or allows subcommands as configured.
- Integration tests: seed user rows and assert resulting cp values and localization messages.

## How to improve later

- Emit audit events when money changes occur to integrate with logging or external bookkeeping.
- Add pagination for `show` if you want to show historical transactions.

## Where to look next

- `src/commands/buy.ts`, `src/db/index.ts`, and `src/config/resolved.ts` for related patterns.

Maintainer contact

- Author: see git history for `src/commands/gp.ts`.

  ***

[Home](README.md) / [Commands](README.md) / [gp](gp.md)

This document was generated from the implementation at `src/commands/gp.ts`. Keep it updated if the code changes.
