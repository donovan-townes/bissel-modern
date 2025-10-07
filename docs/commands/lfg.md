# lfg command

[Home](README.md) / [Commands](README.md) / [lfg](lfg.md)

## Purpose

- Provide Looking-For-Group (LFG) controls: manage a user's LFG tiers, sync LFG roles, preview/post the LFG board, and purge old entries.

## Location

- Implementation: `src/commands/lfg.ts`
- DB tables / modules used: `db/lfg.js` helpers and domain `domain/lfg.js` for business logic.

## Slash command signature

- Name: `/lfg`
- Description: "Looking-For-Group controls (roles + board)"
- Subcommands:
  - `toggle` — Toggle LFG for a tier (auto = determine from level)
  - `add` — Add LFG for a tier
  - `remove` — Remove LFG for a tier (or `all`)
  - `status` — Show your LFG status and wait time
  - `list` — Preview the LFG board; optionally post/update the sticky board (mods/admins)
  - `purge` — Remove LFG entries older than N days (mods/admins)
- Options vary by subcommand (e.g., `tier`, `post` boolean, `days`, `scope`)

## Behavior / Contract

## Inputs

- Interaction: `ChatInputCommandInteraction` from Discord.js.
- Uses domain helpers (`setTier`, `aggregateList`, `buildLfgEmbed`) and DB helpers (`getLfgEntry`, `upsertLfgEntry`, `deleteLfgEntry`, `listAllLfg`, `purgeLfgBefore`).

## Outputs / Side effects

- Mutating subcommands (`toggle`, `add`, `remove`, `purge`) update LFG entries in the DB and sync Discord roles for the user.
- `list` replies with an embed preview and may post/update a sticky board message in a configured channel (requires mod/admin permission to post).
- `status` replies ephemerally with the user's current tiers and waiting time.
- `purge` removes old entries and attempts to remove LFG roles from affected users.

## Data shapes

- LfgEntry (domain type) contains: `userId`, `guildId`, `name`, `startedAt`, per-tier counts (low, mid, high, epic, pbp), and `updatedAt`.

## Key helpers / code notes

- `ensureEntry` creates a new default LFG entry if none exists for the user.
- `resolveAutoTier` determines a default tier from `charlog.xp` via `levelForXP`.
- `syncRolesFor` assigns/removes base + tier roles based on entry state.
- `refreshBoard` builds the aggregated LFG embed and posts/edits a sticky message in the configured board channel.

## Validation and errors

- Tier parsing validates allowed values: `auto`, `all`, `low`, `mid`, `high`, `epic`, `pbp` and returns `lfg.errors.unknownTier` on bad input.
- `toggle` with `auto` will fail if the user's level can't be determined (no charlog row) with `lfg.errors.couldNotDetermineLevel`.
- `add`/`toggle` prevents duplicate tier adds with `lfg.errors.alreadyInTier`.
- Posting the board and purging entries are gated to configured moderator/admin roles or guild admin permission.

## Localization keys used

- `lfg.errors.unknownTier`
- `lfg.errors.couldNotDetermineLevel`
- `lfg.toggle.*`
- `lfg.add.success`
- `lfg.remove.*`
- `lfg.status.*`
- `lfg.list.cannotPost`
- `lfg.list.posted`
- `lfg.purge.*`

## SQL / DB effects

- Reads and writes via `db/lfg.js` helpers (`getLfgEntry`, `upsertLfgEntry`, `deleteLfgEntry`, `listAllLfg`, `purgeLfgBefore`).
- Reads `charlog` for XP/name when resolving tiers.

## Edge cases & notes for maintainers

- Role sync is best-effort: role add/remove operations are wrapped with `.catch(() => {})` to avoid throwing on missing permissions; ensure the bot has ManageRoles if role sync is desired.
- Board posting expects a configured channel ID; if missing, refreshBoard silently no-ops.
- Purge tries to remove roles for affected users but ignores any failures.

## Examples

- `/lfg toggle tier:auto` — Toggles LFG with the tier derived from the user's level.
- `/lfg add tier:high` — Adds the user to High tier LFG.
- `/lfg list post:true` — Shows a preview and posts the board if the caller has permission.
- `/lfg purge days:30 scope:all` — Removes entries older than 30 days (mods/admins only).

## Testing suggestions

- Unit tests for `parseTier`, `resolveAutoTier`, and `syncRolesFor`.
- Integration tests that exercise the board posting flow (requires a test guild/channel) and the purge flow.

## How to improve later

- Report counts and wait times per tier on the board embed for better routing.
- Add webhook or event emission when the board changes for external tooling.

## Where to look next

- `src/db/lfg.js` and `src/domain/lfg.js` for core logic and data models.

Maintainer contact

- Author: see git history for `src/commands/lfg.ts`.

  ***

[Home](README.md) / [Commands](README.md) / [lfg](lfg.md)

This document was generated from the implementation at `src/commands/lfg.ts`. Keep it updated if the code changes.
