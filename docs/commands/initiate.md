# initiate command

[Home](README.md) / [Commands](README.md) / [initiate](initiate.md)

## Purpose

- Create a baseline adventurer record for a user (initiate a character). Sets an initial level, XP, GP, and TP.

## Location

- Implementation: `src/commands/initiate.ts`
- DB table used: `charlog` (INSERT)

## Slash command signature

- Name: `/initiate`
- Description: "Create an adventurer record for a user"
- Options:
  - `user` (user, required) — Discord user to initiate (defaults to you when invoked as self)
  - `name` (string, required) — Adventurer's name (validated)
- Default permissions: KickMembers (mod+)

## Behavior / Contract

## Inputs

- Interaction: `ChatInputCommandInteraction` from Discord.js.
- `name` is validated against the regex: /^[a-zA-Z0-9'\- ]+$/ (letters, numbers, spaces, apostrophes, hyphens allowed).

## Outputs / Side effects

- Creates a row in `charlog` with baseline values: Level 3 / 900 XP / 80 GP (8000 CP) / 0 TP.
- If a record for the target user already exists, replies ephemerally with a message indicating an active adventurer exists.
- Replies with an embed greeting the new character on success.

## Data shapes

- Inserts into `charlog` columns: `userId`, `name`, `level`, `xp`, `cp`, `tp`.

## Key helpers / code notes

- Uses a simple regex to validate character names and a direct `INSERT INTO charlog` call to create the baseline record.
- No role assignments or fund adjustments are performed here.

## Validation and errors

- Name validation rejects characters outside the allowed set and returns an ephemeral message.
- Duplicate active record check uses `SELECT 1 FROM charlog WHERE userId = ?` and denies creation if found.

## Localization keys used

- `initiate.userGreeting`
- `initiate.title`
- `initiate.description`
- `initiate.footer`

## SQL / DB effects

- INSERT INTO `charlog` with baseline values: [userId, name, 3, 900, 8000, 0]

## Edge cases & notes for maintainers

- The command enforces a strict name character set; consider allowing diacritics or other punctuation if players need them.
- There is no confirmation step; to avoid accidental creates you could add a confirmation or require a mod override.

## Examples

- `/initiate user:@Newbie name:"Bran the Bold"`

## Testing suggestions

- Test name validation rejects bad inputs and accepts valid ones.
- Test duplicate prevention by creating an initial row and asserting the command errors.

## How to improve later

- Add optional starter bundles, role grants, or fund deductions when initiating.

## Where to look next

- `src/db/index.ts` and the `retire` command which removes or archives adventurers.

Maintainer contact

- Author: see git history for `src/commands/initiate.ts`.

  ***

[Home](README.md) / [Commands](README.md) / [initiate](initiate.md)

This document was generated from the implementation at `src/commands/initiate.ts`. Keep it updated if the code changes.
