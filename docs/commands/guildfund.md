# guildfund command

[Home](README.md) / [Commands](README.md) / [guildfund](guildfund.md)

## Purpose

- Show the Adventurers Guild fund balance (represented by a special `charlog` record identified by `CONFIG.system.fundId`).

## Location

- Implementation: `src/commands/guildfund.ts`
- DB table used: `charlog` (reads the fund record by `userId` = `CONFIG.system.fundId`)

## Slash command signature

- Name: `/guildfund`
- Description: "Show the Adventurers Guild fund balance"
- Default permissions: KickMembers (restricted to staff by default)

## Behavior / Contract

## Inputs

- Interaction: `ChatInputCommandInteraction` from Discord.js.

## Outputs / Side effects

- Reads the fund record and replies with an embed containing GP and GT values.
- No DB mutation performed by this command.

## Data shapes

- Expected `charlog` columns used:
  - `name: string`
  - `cp: number` (stored copper)
  - `tp: number` (stored tickets)

## Key helpers / code notes

- Reads the fund record by `FUND_ID = CONFIG.system.fundId`.
- GP is formatted by dividing `cp` by 100 and using `toFixed(2)`.
- GT is derived from `tp` divided by 2 in the implementation (business rule in code).

## Validation and errors

- If the fund record is missing the command replies with `guildfund.errors.notFound` (localized).

## Localization keys used

- `guildfund.errors.notFound`
- `guildfund.title`
- `guildfund.footer`

## SQL / DB effects

- SELECT `name, level, xp, cp, tp FROM charlog WHERE userId = ?` with `FUND_ID`.

## Edge cases & notes for maintainers

- The GT calculation divides `tp` by 2 for display; confirm this business rule remains valid if ticket semantics change.
- Permissions are set to KickMembers by the slash builder; adjust as needed in `app.config`.

## Examples

- `/guildfund` — Shows fund GP and GT.

## Testing suggestions

- Integration test: seed a fund `charlog` row and assert the reply embed contains correct GP and GT.

## How to improve later

- Add a history of fund transactions or an audit view.

## Where to look next

- `src/commands/gp.ts` and `data/migrations` for `charlog` schema.

Maintainer contact

- Author: see git history for `src/commands/guildfund.ts`.

  ***

[Home](README.md) / [Commands](README.md) / [guildfund](guildfund.md)

This document was generated from the implementation at `src/commands/guildfund.ts`. Keep it updated if the code changes.
