# reward command

[Home](README.md) / [Commands](README.md) / [rewards](rewards.md)

## Purpose

- Award XP, GP, and GT to players. Supports explicit custom awards, DM self-claims, and staff awards.
- Centralizes business rules for rewards and applies XP/GP/GT deltas consistently.

## Location

- Implementation: `src/commands/rewards.ts`
- Domain helpers: `src/domain/rewards.js`, `src/domain/xp.js`
- DB table used: `charlog` (reads and writes snapshots via `saveSnapshot`)

## Slash command signature

- Name: `/reward`
- Description: "Award XP/GP/GT to players or claim DM/Staff rewards (config-driven)."
- Subcommands:
  - `custom` — Award explicit XP/GP/GT to up to 10 players (supports auto GT by level band)
  - `dm` — Claim DM reward for yourself (based on character level)
  - `staff` — Award staff reward to up to 5 tagged staffers
- Options vary by subcommand (user slots, xp, gp, gt, gt_auto, reason)

## Behavior / Contract

## Inputs

- Interaction: `ChatInputCommandInteraction` from Discord.js.
- Uses resolved config (`CONFIG.guild.config`) for role gates and channel IDs.

## Outputs / Side effects

- Validates caller permissions against configured role sets (custom/dm/staff) or admin/dev bypass.
- Reads player rows from `charlog`, computes deltas using domain helpers (`computeCustomReward`, `computeDmReward`, `computeStaffReward`), then applies deltas via `applyResourceDeltas` and persists using `saveSnapshot`.
- May announce level changes to the rewards channel (or current channel) via `announceLevelChange`.
- Replies with an embed summarizing applied deltas and includes optional reason footer.

## Data shapes

- PlayerRow:
  - `userId: string`
  - `name: string`
  - `xp: number`
  - `level: number`
  - `cp: number` (stored copper)
  - `tp: number` (stored tickets / half-points depending on domain)
- Domain reward delta shapes returned by `compute*` helpers and `applyResourceDeltas` results (contain new xp, level, cp, tp, levelsChanged).

## Key helpers / code notes

- `getPlayer(userId)` — SELECT from `charlog`.
- `saveSnapshot(userId, snap)` — INSERT or UPDATE charlog snapshot.
- Domain functions: `computeCustomReward`, `computeDmReward`, `computeStaffReward`, `computePlayerTpStep`, `applyResourceDeltas`.
- `announceLevelChange` posts a human-readable message to rewards channel when level changes.

## Validation and errors

- Permission gates: per-subcommand role lists in config, or admin/dev bypass in non-prod environments.
- `custom` requires at least one recipient and at least one non-zero input (unless `gt_auto` is used).
- If any recipient lacks a charlog row, the command replies ephemeral with `reward.errors.userNotInSystem`.
- Replies use localized keys (via `t(...)`) for content and embed formatting.

## Localization keys used

- `reward.errors.*`
- `reward.custom.*`
- `reward.dm.*`
- `reward.staff.*`
- `reward.common.*`

## SQL / DB effects

- Reads: `SELECT userId, name, xp, level, cp, tp FROM charlog WHERE userId = ?`
- Writes: `INSERT INTO charlog ...` or `UPDATE charlog SET xp = ?, level = ?, cp = ?, tp = ?` performed by `saveSnapshot`.

## Edge cases & notes for maintainers

- `tp` semantics: code treats GT/TP as possibly fractional or unit-based depending on domain; ensure domain helpers align with UI expectations.
- `announceLevelChange` chooses the rewards channel if configured; ensure the bot has send permissions.
- Dev bypass allows testers to run rewards in non-prod; remove or limit this in production.

## Examples

- `/reward custom user1:@A user2:@B xp:20 gp:5.00 gt:1 reason:"Quest"`
- `/reward dm reason:"Session"` — Claim DM reward for yourself.
- `/reward staff user1:@Staff1 user2:@Staff2 reason:"Thanks"`

## Testing suggestions

- Unit tests for domain reward calculations and `applyResourceDeltas` outputs.
- Integration tests that run `custom` and `staff` flows against a seeded `charlog` and assert DB changes and announcement behavior.

## How to improve later

- Emit structured audit events when rewards are applied for external bookkeeping.
- Add idempotency keys or transaction markers for bulk award operations to prevent double-apply.

## Where to look next

- `src/domain/rewards.js`, `src/domain/xp.js`, and `src/db/index.js`.

Maintainer contact

- Author: see git history for `src/commands/rewards.ts`.

  ***

[Home](README.md) / [Commands](README.md) / [rewards](rewards.md)

This document was generated from the implementation at `src/commands/rewards.ts`. Keep it updated if the code changes.
