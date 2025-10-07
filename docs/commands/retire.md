# retire command

[Home](README.md) / [Commands](README.md) / [retire](retire.md)

## Purpose

- Retire (delete) an adventurer record for a user. Supports self-retire and moderator-initiated retirements for other users.
- Confirms intent via a modal dialog to avoid accidental deletions.

## Location

- Implementation: `src/commands/retire.ts`
- DB tables referenced: `adventurers` (legacy) or `charlog` (current)

## Slash command signature

- Name: `/retire`
- Description: "Retire your adventurer or another adventurer (Mod+ only)."
- Options:
  - `user` (user, optional) — Target user to retire (if omitted or same as caller, performs self-retire)
- Default permissions: SendMessages (note: the executor performs additional moderator checks before allowing retire of others)

## Behavior / Contract

## Inputs

- Interaction: `ChatInputCommandInteraction` from Discord.js.
- Uses a modal flow: `interaction.showModal(...)` and a separate `handleModal` function listens for `ModalSubmitInteraction` with custom id `retire-confirm-<userId>`.

## Outputs / Side effects

- Shows a modal that asks the user to type `RETIRE` to confirm.
- On successful modal submission the code:
  - Detects whether the DB uses legacy `adventurers` table or modern `charlog` table.
  - Reads the target row; if none found replies ephemeral with `retire.noAdventurer`.
  - Deletes the adventurer record from the appropriate table.
  - Attempts best-effort role cleanup in the guild: removes `Guild Member` role and adds `uninitiated` role if present.
  - Replies with an embed summarizing the retired character (level, XP, GP, GT) and a localized message `retire.userNotice`.

## Data shapes

- Row fields read from DB: `name`, `level`, `xp`, `cp` (stored copper), `tp`.

## Key helpers / code notes

- Uses `getDb()` to query sqlite_master for table existence and adapt to either legacy or current schema.
- Modal custom id format: `retire-confirm-<userId>` — `handleModal` parses this to find the target.
- Name and numeric fields are safely checked for undefined when formatting the reply embed.

## Validation and errors

- If retiring another user, executor must have moderator-like permissions: KickMembers or any role id that is present in `CONFIG.guild.config.roles` values. If not authorized, replies ephemeral with an error.
- Modal input must equal `RETIRE`; otherwise it replies ephemeral with `retire.cancelled`.
- If no adventurer/charlog row exists for the target, replies ephemeral with `retire.noAdventurer`.

## Localization keys used

- `retire.confirmLabel`
- `retire.cancelled`
- `retire.noAdventurer`
- `retire.userNotice`
- `retire.title`
- `retire.description`
- `retire.footer`

## SQL / DB effects

- Reads schema tables via: `SELECT name FROM sqlite_master WHERE type='table'`.
- Reads adventurer/charlog row via either `SELECT * FROM adventurers WHERE user_id = ?` or `SELECT * FROM charlog WHERE userId = ?`.
- Deletes row via `DELETE FROM adventurers WHERE user_id = ?` or `DELETE FROM charlog WHERE userId = ?`.

## Edge cases & notes for maintainers

- The command supports both legacy and modern schemas — useful during migrations, but consider simplifying once old tables are removed.
- Role changes are best-effort (`.catch(() => {})`); ensure the bot has ManageRoles permission if role cleanup is required.
- Modal handling: ensure the bot registers or routes `ModalSubmitInteraction` events to `handleModal` (the code expects an external listener to call `handleModal`).

## Examples

- `/retire` — Starts a modal to retire your own adventurer.
- `/retire user:@OldPlayer` — Starts a modal to retire `@OldPlayer` (mod permission required to complete retirement).

## Testing suggestions

- Test modal flow: show modal, submit wrong text, confirm it rejects; submit `RETIRE` and confirm deletion.
- Test permission paths: ensure unauthorized attempts to retire others are denied.
- Test both legacy `adventurers` and modern `charlog` table paths.

## How to improve later

- Add an audit log table to store retire actions instead of permanent DELETE.
- Emit an event when a retire happens for external tooling to react.

## Where to look next

- `src/db/index.ts` for DB helpers and `src/config/resolved.ts` for role config.

Maintainer contact

- Author: see git history for `src/commands/retire.ts`.

  ***

[Home](README.md) / [Commands](README.md) / [retire](retire.md)

This document was generated from the implementation at `src/commands/retire.ts`. Keep it updated if the code changes.
