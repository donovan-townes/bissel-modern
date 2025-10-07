# Commands documentation index

This folder contains documentation for each slash command implemented under `src/commands/`.
Each file follows the common structure used by the team: Purpose, Location, Slash command signature, Behavior / Contract (Inputs / Outputs), Data shapes, Key helpers, Validation / errors, Localization keys, SQL / DB effects, Edge cases & notes for maintainers, Examples, Testing suggestions, and Where to look next.

## Quick navigation

- [buy](buy.md) — Record a purchase and deduct GP from a character.
- [sell](sell.md) — Record a sale and add GP to a character.
- [gp](gp.md) — Manage a user's GP (show/add/adjust/set).
- [gt](gt.md) — Manage Golden Tickets (GT / TP).
- [rewards](rewards.md) — Batch/custom DM/staff rewards and award resources.
- [xp](xp.md) — XP management: show/add/adjust/set.
- [lfg](lfg.md) — Looking-for-Group: roles, board posting, purge.
- [charinfo](charinfo.md) — Show a character summary.
- [dm](dm.md) — Toggle/list DM availability.
- [guildfund](guildfund.md) — Show the Adventurers Guild fund.
- [initiate](initiate.md) — Create an adventurer record.
- [retire](retire.md) — Retire an adventurer (modal confirmation).
- [health](health.md) — Bot health probes (uptime, DB, version).

> Tip: If you're browsing on GitHub, use the links above to jump directly to a command file. Each doc references the implementing source file in `src/commands/` so you can quickly cross-reference code while reading.

## How to contribute a new command doc

1. Create `docs/commands/<command>.md` following the existing structure (copy any existing file as a template).
2. Add a link to this `README.md` under the Quick navigation list (alphabetical order helps).
3. If you change command behavior, update both the source file and this documentation file in the same PR.
4. Prefer using existing localization keys rather than hard-coding user-visible strings in the docs; call out any inlined text in the "Edge cases & notes" section.

## Doc checklist (use when authoring)

- [ ] Purpose and location specified
- [ ] Slash signature accurate (options, types, defaults)
- [ ] Inputs / Outputs clearly described
- [ ] DB effects and SQL snippets listed where applicable
- [ ] Localization keys referenced
- [ ] Examples for common usage included
- [ ] Testing suggestions added (unit + integration)
- [ ] Cross-reference to related commands

---

### Authored by

Donovan Townes

[github.com/donovantownes](https://github.com/donovantownes)

discord: `@z8phyr_`
