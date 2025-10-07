# gt command

[Home](README.md) / [Commands](README.md) / [gt](gt.md)

## Purpose

- Manage a user's Golden Tickets (GT). GT are stored as `tp` in the DB (labeled GT in UI). Supports show, add, adjust, and set operations.

## Location

- Implementation: `src/commands/gt.ts`
- DB table used: `charlog` (reads/writes `tp`)

## Slash command signature

- Name: `/gt`
- Description: "Manage a user's Golden Tickets (GT)."
- Subcommands:
  - `show` — Show GT for a user (user optional; defaults to caller)
  - `add` — Give GT to a user (requires target user and amount >= 1)
  - `adjust` — Adjust GT by a signed value
  - `set` — Set a user's GT to an exact value
- Common options for mutating subcommands:
  - `user` (user, required) — Target user
  - `amount` (number, required) — GT amount
  - `reason` (string, optional) — Audit reason (max length 200)

## Behavior / Contract

## Inputs

- Interaction: `ChatInputCommandInteraction` from Discord.js.
- Permissions are validated via `validateCommandPermissions` and per-role configuration derived from `CONFIG.guild.config.roles`.

## Outputs / Side effects

- `show` replies with an embed showing GT values for the target user.
- Mutating subcommands call `upsertPlayerTP` which performs an INSERT ... ON CONFLICT and sets `tp` and optionally `name` accordingly.
- Replies are localized using `t('gt.*')` keys and include mention, name, amounts, and an optional reason line.

## Data shapes

- PlayerRow:
  - `userId: string`
  - `name: string`
  - `xp: number`
  - `level: number`
  - `cp: number`
  - `tp: number` (GT)

## Key helpers in `src/commands/gt.ts`

- getPlayerByUserId(userId) — SELECT ... FROM charlog WHERE userId = ?
- upsertPlayerTP(userId, nextTPUnits, displayName?) — INSERT/UPDATE to set `tp`.

## Validation and errors

- Permission guard via `validateCommandPermissions` will block unauthorized access to mutating subcommands.
- For `show`/mutations: if the target user is not present in the system the command replies ephemeral with `gt.notInSystem`.
- `add` enforces amount > 0.

## Localization keys used

- `gt.notInSystem`
- `gt.add.ok`
- `gt.adjust.ok`
- `gt.set.ok`
- `gt.reasonFmt`

## SQL / DB effects

- Reads via `getPlayerByUserId`
- Writes via `upsertPlayerTP` (INSERT/UPDATE setting `tp`)

## Edge cases & notes for maintainers

- The code allows decimal amounts in replies (`toFixed(2)`) even though GT are typically integer units; ensure UX consistency if GT must be integer.
- `upsertPlayerTP` uses COALESCE to preserve existing fields; `tp` is replaced with the provided value.

## Examples

- `/gt show user:@Friend`
- `/gt add user:@Friend amount:1 reason:"Session reward"`
- `/gt adjust user:@Friend amount:-1 reason:"Correction"`
- `/gt set user:@Friend amount:5 reason:"Award"`

## Testing suggestions

- Unit tests for `upsertPlayerTP` to verify insert and update paths.
- Permission tests to verify `validateCommandPermissions` behavior.

## How to improve later

- Normalize GT formatting (integers vs decimal display).

## Where to look next

- `src/commands/gp.ts` (similar upsert pattern), `src/db/index.ts` for DB helpers.

Maintainer contact

- Author: see git history for `src/commands/gt.ts`.

  ***

[Home](README.md) / [Commands](README.md) / [gt](gt.md)

This document was generated from the implementation at `src/commands/gt.ts`. Keep it updated if the code changes.
