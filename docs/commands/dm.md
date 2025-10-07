# dm command

[Home](README.md) / [Commands](README.md) / [dm](dm.md)

## Purpose

- Provide DM (Dungeon Master) availability controls: toggle your DM-available role or list current available DMs.

## Location

- Implementation: `src/commands/dm.ts`
- Reads guild configuration for a role id at `CONFIG.guild.config.features.lfg.roles.dmAvailable`.

## Slash command signature

- Name: `/dm`
- Description: "DM availability controls"
- Subcommands:
  - `toggle` — Toggle your “Available to DM” status (requires GM/Staff permissions by current code).
  - `list` — Show who is currently Available to DM.

## Behavior / Contract

## Inputs

- Interaction: `ChatInputCommandInteraction` from Discord.js.

## Outputs / Side effects

- `list`:
  - Replies with an embed listing members who have the DM-available role. Public reply.
  - If no role or no members, replies with localized empty message (`dm.list.empty`) or role-missing error.
- `toggle`:
  - Requires special permission (kick members or a role named `GM`, `GMs`, or `Staff`).
  - Adds or removes the configured DM role for the calling member and replies with localized success messages.

## Data shapes

- Role and Member objects from Discord.js are used; no DB rows are read/written by this command.

## Key helpers / code notes

- Reads `CFG.features?.lfg?.roles?.dmAvailable` from resolved config.
- Uses `guild.roles.cache.find` to find the role; uses `role.members` to enumerate current members.
- Uses `t('...')` localization for messages and `EmbedBuilder` for list output.

## Validation and errors

- If the command is used outside of a guild it replies with `dm.guildOnly` (ephemeral).
- If the configured role is missing it replies with `dm.roleMissing` (ephemeral).
- `toggle` will return `dm.toggle.notAllowed` if the user lacks the KickMembers permission or named staff roles.

## Localization keys used

- `dm.guildOnly`
- `dm.roleMissing`
- `dm.list.empty`
- `dm.toggle.notAllowed`
- `dm.toggle.enabled`
- `dm.toggle.disabled`

## SQL / DB effects

- None. The command does not touch the DB.

## Edge cases & notes for maintainers

- The permission model for `toggle` intentionally mirrors legacy behavior but is opinionated: it checks KickMembers or a role name match. To allow all users to toggle their availability, remove the permission checks.
- Role lookup uses role ID from config; if the role id is invalid the command will fail with a localized message.

## Examples

- `/dm list` — Shows currently available DMs.
- `/dm toggle` — Toggles your availability (requires permission under current rules).

## Testing suggestions

- Unit test: stub a guild with members and a role to confirm `list` replies with the expected embed formatting.
- Permission tests: assert `toggle` denies users without KickMembers or staff-role names.

## How to improve later

- Make toggle permission configurable via `app.config` so staff can decide who may toggle.
- Add audit logging when toggles happen.

## Where to look next

- LFG features in `src/features/lfg` and role configuration in `src/config`.

Maintainer contact

- Author: see git history for `src/commands/dm.ts`.

  ***

[Home](README.md) / [Commands](README.md) / [dm](dm.md)

This document was generated from the implementation at `src/commands/dm.ts`. Keep it updated if the code changes.
