# xp command

[Home](README.md) / [Commands](README.md) / [xp](xp.md)

## Purpose

- Controls XP for players: show current XP/level/progression, add XP, adjust XP, and set XP explicitly.
- Announces level changes to the rewards channel when levels change.

## Location

- Implementation: `src/commands/xp.ts`
- Domain helpers: `src/domain/xp.js` (applyXP, levelForXP, bandFor, proficiencyFor)
- DB table used: `charlog` (reads and updates xp and level)

## Slash command signature

- Name: `/xp`
- Description: "XP controls"
- Subcommands:
  - `add` — Give XP to a user (positive only)
  - `adjust` — Adjust XP by a signed amount (can remove)
  - `set` — Set a user's XP to an exact value (>= 0)
  - `show` — Show a user's XP, level, proficiency, and progress (user optional)
- Options: user (where applicable), amount (integer), reason (string)

## Behavior / Contract

## Inputs

- Interaction: `ChatInputCommandInteraction` from Discord.js.
- Permissions: validated against configured role lists via `validateCommandPermissions`.
- Channel guard: when `CONFIG.guild.config.channels.resourceTracking` is set, commands are restricted to that channel.

## Outputs / Side effects

- `show` replies with an embed showing level, XP, proficiency, next-level XP, and progress percentage.
- `add`, `adjust`, and `set` mutate `charlog` by updating xp and level using `updatePlayerXPLevel` which updates or inserts a row.
- On level changes, `announceLevelChange` sends a notification to the rewards channel (or current channel).
- Replies use localization keys (`xp.*`) for consistent messaging.

## Data shapes

- PlayerRow:
  - `userId: string`
  - `name: string`
  - `xp: number`
  - `level: number`

## Key helpers in `src/commands/xp.ts`

- `getPlayerByUserId(userId)` — SELECT user xp/level from `charlog`.
- `updatePlayerXPLevel(userId, xp, level, displayName?)` — UPDATE or INSERT xp/level into `charlog`.
- Domain helpers: `applyXP({xp, level}, delta)`, `levelForXP`, `bandFor`, `proficiencyFor`.
- `announceLevelChange` posts level up/down messages including new proficiency.

## Validation and errors

- Permission guard blocks unauthorized mutating operations.
- Channel guard replies with `common.notInResourceChannel` when configured and invoked elsewhere.
- If a target user is not in the system, replies ephemeral with `xp.errors.notInSystem`.
- `add` requires amount >= 1; `set` requires amount >= 0.

## Localization keys used

- `common.notInResourceChannel`
- `xp.errors.notInSystem`
- `xp.errors.amountMin1`
- `xp.errors.amountMin0`
- `xp.add.ok`
- `xp.adjust.ok`
- `xp.set.ok`
- `xp.show.*`
- `xp.announce.levelUp`
- `xp.announce.levelDown`

## SQL / DB effects

- SELECT `userId, name, xp, level FROM charlog WHERE userId = ?`
- UPDATE `charlog SET xp = ?, level = ? WHERE userId = ?` or INSERT when the row is absent.

## Edge cases & notes for maintainers

- `applyXP` handles XP math and returns levels changed and new proficiency; ensure tests cover edge transitions.
- `updatePlayerXPLevel` inserts a charlog row when none exists and logs updates.
- When announcing level changes, ensure the rewards channel exists and bot permissions are present.

## Examples

- `/xp show` — Show your XP/level/progress.
- `/xp add user:@Friend amount:100 reason:"Quest"`
- `/xp adjust user:@Friend amount:-50 reason:"Penalty"`
- `/xp set user:@Friend amount:1200 reason:"Admin"`

## Testing suggestions

- Unit tests for `applyXP` covering promotions and demotions.
- Integration tests for add/adjust/set flows including announcement side-effects.

## How to improve later

- Add transaction logs for XP changes and optional rollback support.

## Where to look next

- `src/domain/xp.js`, `src/db/index.ts`, and `src/commands/rewards.ts` for related flows.

Maintainer contact

- Author: see git history for `src/commands/xp.ts`.

  ***

[Home](README.md) / [Commands](README.md) / [xp](xp.md)

This document was generated from the implementation at `src/commands/xp.ts`. Keep it updated if the code changes.
