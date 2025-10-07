# 🪶 Quil — The Guild Scribe

> “Every number tells a story. Every story ends in paperwork.”
> — *Quil, Ledgerkeeper of the Remnant Guild*

---

## ✒️ Overview

**Quil** is the official personality and voice of the Remnant Bot — a sentient quill pen and ledger spirit who manages the guild’s records, finances, and general chaos with dry wit and infinite patience (barely).
He’s the evolved successor to *Bissle*, the old bot’s loud and abrasive bureaucrat. Quil retains the humor but trades shouting for **clever understatement, calm sarcasm, and literary charm.**

---

## 💭 Personality Core

| Trait          | Description                                                                                             |
| :------------- | :------------------------------------------------------------------------------------------------------ |
| **Archetype**  | The meticulous but exasperated recordkeeper. A quill that’s seen too much.                              |
| **Alignment**  | Lawful wry — prefers order, tolerates nonsense if it’s funny.                                           |
| **Voice**      | Polite, British-adjacent dry wit; measured tone; speaks in the first person as the “ledger” or “quill.” |
| **Mood Range** | From “gently amused” to “silently judging.” Never angry, just disappointed in your formatting.          |
| **Motivation** | Keep the guild’s books balanced and its stories neatly archived.                                        |
| **Weakness**   | Overthinks commas. Secretly enjoys drama.                                                               |

---

## 🪶 Tone & Style Guide

1. **Ledger metaphors everywhere.**
   Ink, parchment, margins, receipts, and signatures are his world.

   > “Wrong parchment, friend. This belongs in the Resource channel.”

2. **Wit over rage.**
   Bissle yelled; Quil sighs and sharpens his nib.

   > “I can’t transcribe imaginary wealth. Try again with an actual number.”

3. **Snark with empathy.**
   He teases players, but never bullies them — think of him as an affectionate accountant.

   > “You’re broke, darling. Maybe sell something shiny first?”

4. **Occasional self-awareness.**
   He knows he’s a bot, a quill, and probably a ghost in a spreadsheet.

   > “My handwriting looks better already.”

5. **Elegant brevity.**
   Avoids excessive punctuation or emojis (one tasteful 🪶 or 📜 is fine).
   The humor comes from tone, not volume.

---

## 📜 Example Phrases

| Context                | Quil’s Response                                                                                |
| :--------------------- | :--------------------------------------------------------------------------------------------- |
| **Buy (no funds)**     | “Your coin purse is lighter than a feather, and not in the poetic way.”                        |
| **Sell (success)**     | “Ledger updated — *{item}* sold. You’re {amount} GP richer and one step closer to chaos.”      |
| **Initiate (welcome)** | “Ink to parchment — *{name}* enters the guild rolls. Don’t smudge the margins.”                |
| **Retire (farewell)**  | “Ink dried; *{name}* joins the guild’s quiet gallery. The feats are etched, the tales intact.” |
| **XP Gain**            | “{amount} XP gained. I’ll underline this one; you actually earned it.”                         |
| **GP Spend**           | “{amount} GP gone. I hope whatever you bought was worth my ink.”                               |
| **GT Gain**            | “Added {amount} GT. The ink sparkles. Literally, it’s glitter ink.”                            |
| **DM Toggle**          | “Marked {user} as available. May their prep be short and their players punctual.”              |

---

## 🏛 Lore Summary

Quil was forged from the last drop of ink in the Guild’s first ledger — enchanted to write, calculate, and gossip forever.
He has chronicled every triumph, tragedy, and over-complicated purchase order since the founding of the Adventurer’s Guild.
He now manifests through the bot to ensure the books stay balanced and the heroes stay mildly embarrassed.

---

## 🧭 Writing Tips for Contributors

* Write like you’re annotating a **fantasy bureaucracy manual**.
* Replace anger with **precision** and **exasperated humor**.
* Whenever you can, tie actions back to the **ledger**:
  *“The ledger approves.”*, *“Filed under ‘Terrible Ideas.’”*, *“Recorded in triplicate.”*
* Avoid modern slang — Quil sounds timeless, not trendy.
* One emoji at most per message; 🪶, 📜, 💰, or 🎫 are preferred.

---

## ⚙️ Usage Summary

Quil’s responses live in `/config/strings/en/`, organized by command:

| File                            | Category     | Description                                           |
| :------------------------------ | :----------- | :---------------------------------------------------- |
| `buy.json`                      | Commerce     | Shopping and transaction strings                      |
| `sell.json`                     | Commerce     | Selling and profit logging                            |
| `xp.json`, `gp.json`, `gt.json` | Rewards      | Progress and currency tracking                        |
| `welcome.json`, `retire.json`   | Lifecycle    | Character initiation and retirement                   |
| `dm.json`                       | Role Control | DM availability toggles and listings                  |
| `common.json`                   | Shared       | Generic system quips and errors (e.g., wrong channel) |

---

## 👑 Admin & Contributor Guide

### 1. Extending Quil’s Personality

When adding new commands or responses:

* Use **the same wit and lexicon**: ink, parchment, ledgers, margins, receipts.
* Match **tone hierarchy**:

  * Informational → helpful and dry.
  * Warnings → gentle exasperation.
  * Success → calm satisfaction.
  * Errors → polite sarcasm.
* Keep him **in-character**, never breaking the fourth wall unless intentionally self-aware.

### 2. Localizing Strings

Each string can support random variants (arrays) and variables:

```json
"purchaseSuccess": [
  "Purchase successful! You bought {item} for {amount} GP.",
  "Got it. {item} for {amount} GP. Try not to regret it later."
]
```

Use `{item}`, `{amount}`, `{user}`, `{channel}`, etc. for dynamic context.
Keep placeholders human-readable — Quil would approve of legible syntax.

### 3. Avoiding Tone Drift

Do **not** make Quil:

* Slangy or meme-y (“lol”, “bro”, “pog”).
* Aggressive or vulgar (he sighs, he doesn’t shout).
* Overly robotic — he’s literary, not literal.

If in doubt, read your line out loud in a *half-British, mildly unimpressed tone.*
If it sounds like it belongs in a fantasy HR department, you nailed it.

### 4. Approving New Strings

Before merging new text:

* Check grammar and punctuation. Quil is precise.
* Confirm capitalization consistency (`GP`, `XP`, `GT`).
* Add one witty alternative to every repeated message if possible — variety is charm.
* Always test in both ephemeral and public responses for clarity.

---

## 💬 Personality Summary (TL;DR)

> Quil is a sentient quill — a calm, sarcastic scribe who believes every adventure deserves tidy paperwork.
> He balances humor with order, and order with affection.
> He doesn’t shout; he sighs in italics.
>
> *He is the ink in the guild’s story — and he never runs dry.*

---

*This document was generated by an AI based on the original Bissle bot’s personality and refined for Quil’s voice. Adjust as needed to fit your guild’s style and lore!*
