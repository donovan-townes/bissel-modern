# charinfo command

[Home](README.md) / [Commands](README.md) / [charinfo](charinfo.md)

## Purpose

- Show a user's character summary (name, level, XP, tickets, GP). Used for quick lookups during play or moderation.

## Location

- Implementation: `src/commands/charinfo.ts`
- DB table used: `charlog` (selects name, level, xp, tp, cp)

## Slash command signature

- Name: `/charinfo`
- Description: "Show your character info (or mention a user)"
- Options:
  - `user` (user, optional) — Target user; defaults to the invoking user.

## Behavior / Contract

## Inputs

- Interaction: `ChatInputCommandInteraction` from Discord.js.

## Outputs / Side effects

- On missing character row replies ephemeral with a simple not-found message.
- On success replies with an embed showing:
  - Character name (title)
  - OOC Owner (mention)
  - Level, XP, GT (tickets), and GP (formatted)
- No DB mutation is performed by this command.

## Data shapes

- Selected columns from `charlog`:
  - `name: string`
  - `level: number`
  - `xp: number`
  - `tp: number`
  - `cp: number` (stored as integer copper)

## Key helpers / code notes

- Builds an `EmbedBuilder` with fields for Level, Experience, Golden Tickets (GT), and GP.
- GP is computed as `(cp / 100).toFixed(2)` and GT as `(tp).toFixed(1)`.
- Uses `getDb().get(...)` to fetch the row.

## Validation and errors

- If the target user has no `charlog` row the command replies ephemeral: `No active character found for <user>`.

## Localization keys used

- (none in this file; message text is currently inlined)

## SQL / DB effects

- Executes: `SELECT name, level, xp, tp, cp FROM charlog WHERE userId = ?`
- No writes.

## Edge cases & notes for maintainers

- Avatar and display names are used directly from the Discord `User`/`Member` objects for visual display.
- The command inlines the not-found text; consider localizing it to `lib/i18n` if parity is desired with other commands.
- Numeric formatting is straightforward; consider zero-padding or locale-aware formatting if necessary.

## Examples

- Slash usage (as a user):
  - `/charinfo` — Shows your character info.
  - `/charinfo user:@Ally` — Shows Ally's character info.

## Testing suggestions

- Unit test: mock `getDb()` and return a test row; assert that `interaction.reply` is called with an embed containing expected fields.
- Integration test: seed `charlog`, call `execute()` with an interaction stub and verify display behavior.

## How to improve later

- Move inline messages to localization keys.
- Add optional flags to show historical stats or recent transactions.

## Where to look next

- Related commands: `gp`, `xp`, `charinfo` helpers in `src/commands/` and `src/db`.

Maintainer contact

- Author: see git history for `src/commands/charinfo.ts`.

  ***

[Home](/docs/README.md) / [Commands](README.md) / [charinfo](charinfo.md)

This document was generated from the implementation at `src/commands/charinfo.ts`. Keep it updated if the code changes.
