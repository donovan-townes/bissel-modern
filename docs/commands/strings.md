# strings command

[Home](README.md) / [Commands](README.md) / [strings](strings.md)

## Purpose

- Simple utility to exercise the i18n `t()` strings and confirm smoke outputs for localization.

## Location

- Implementation: `src/commands/strings.ts`

## Slash command signature

- Name: `/strings`
- Description: "Show i18n smoke values"

## Behavior / Contract

## Inputs

- Interaction: `ChatInputCommandInteraction` from Discord.js.

## Outputs / Side effects

- Assembles a few localized lines using `t(...)` and replies ephemerally with joined lines for verification.
- No DB or permission effects.

## Data shapes

- None.

## Key helpers / code notes

- Uses `t('errors.invalid.random')`, `t('errors.permission.guild_member_only')`, and `t('lfg.added', {...})` as smoke checks.

## Validation and errors

- None.

## Localization keys used

- `errors.invalid.random`
- `errors.permission.guild_member_only`
- `lfg.added`

## SQL / DB effects

- None.

## Edge cases & notes for maintainers

- Useful for CI smoke checks during localization changes.

## Examples

- `/strings` — Returns ephemeral i18n samples to the caller.

## Testing suggestions

- Run after localization changes to verify keys resolve without runtime errors.

## How to improve later

- Add flags to output specific keys or locales for targeted testing.

## Where to look next

- `src/lib/i18n.js` for implementation details of `t()`.

Maintainer contact

- Author: see git history for `src/commands/strings.ts`.

  ***

[Home](README.md) / [Commands](README.md) / [strings](strings.md)

This document was generated from the implementation at `src/commands/strings.ts`. Keep it updated if the code changes.
