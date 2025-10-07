// import advancement from "../../config/advancement.json" with { type: "json" };
import rewards from "../../config/rewards.json" with { type: "json" };
import { bandFor, applyXP } from "./xp.js";

/** Types */
type RewardsCfg = typeof rewards;
// type AdvancementRow = { level: number; xp: number; proficiency: number };

export type RewardMode = "reward" | "dmreward" | "staffreward";
export type ResourceDelta = { xp?: number; cp?: number; tpUnits?: number };

// const ADV = advancement as { levels: AdvancementRow[]; maxLevel: number };
const CFG: RewardsCfg = rewards;

/** --- Internals --- */

function bracketForLevel(level: number, table: { lt?: number; else?: boolean; multiplier: number }[]): number {
  for (const row of table) {
    if (row.lt && level < row.lt) return row.multiplier;
    if (row.else) return row.multiplier;
  }
  // Fallback safest multiplier
  return table.at(-1)?.multiplier ?? 20;
}

function gpCpForXp(level: number, xpAward: number): number {
  const arr = CFG.gp.cpPerXpByLevel;
  const ratio = arr[level]; // cp per 1 XP (array is 1-indexed)
  if (typeof ratio !== "number" || ratio < 0) return 0;
  return Math.round(xpAward * ratio);
}

function tpUnitsFor(level: number, mode: RewardMode): number {
  const rows =
    mode === "dmreward" ? CFG.tp.steps.dmreward
    : mode === "staffreward" ? CFG.tp.steps.staffreward
    : CFG.tp.steps.reward;

  for (const r of rows) {
    if (r.lt && level < r.lt) return r.units;
    if ('else' in r && r.else) return r.units;
  }
  return 0;
}

/** Award XP per legacy rule:
 * L20 → fixed
 * else → ((next - curr)/100) * bracket
 */
function xpForDmOrStaff(level: number, mode: "dm" | "staff"): number {
  const table = mode === "dm" ? CFG.dm : CFG.staff;
  if (level >= 20) return table.level20Xp;

  const { curr, next } = bandFor(level);
  if (next === null) return table.level20Xp; // safety

  const gap = next - curr;
  const mult = bracketForLevel(level, table.brackets);
  const xp = (gap / 100) * mult;
  return Math.round(xp);
}

/** --- Public API --- */

/** Compute the standard multi-target player reward (manual), given explicit xp/gp/tp inputs.
 *  - gp is in GP (decimal). Converts to cp.
 *  - tp is in displayed TP (can be 0.5). Converts to stored units (*2).
 */
export function computeCustomReward(input: { xp?: number; gp?: number; tp?: number }): ResourceDelta {
  const xp = Math.max(0, Math.floor(input.xp ?? 0));
  const cp = Math.round((input.gp ?? 0) * 100);
  const tpUnits = Math.round((input.tp ?? 0) * 2);
  return { xp, cp, tpUnits };
}

/** Compute DM reward for a single character level (self-claim). */
export function computeDmReward(level: number): ResourceDelta {
  const xp = xpForDmOrStaff(level, "dm");
  const cp = gpCpForXp(level, xp);
  const tpUnits = tpUnitsFor(level, "dmreward");
  return { xp, cp, tpUnits };
}

/** Compute Staff reward for a target’s level (admin allocates to tagged staff). */
export function computeStaffReward(level: number): ResourceDelta {
  const xp = xpForDmOrStaff(level, "staff");
  const cp = gpCpForXp(level, xp);
  const tpUnits = tpUnitsFor(level, "staffreward");
  return { xp, cp, tpUnits };
}

/** TP bundle for normal end-of-adventure player reward (if you want to auto-add TP by band). */
export function computePlayerTpStep(level: number): number {
  return tpUnitsFor(level, "reward"); // stored units
}

/** Apply any resource delta to a player snapshot using XP auto-leveling rules. */
export function applyResourceDeltas(
  prev: { xp: number; level: number; cp: number; tp: number },
  delta: ResourceDelta
) {
  // XP/level
  const res = applyXP({ xp: prev.xp, level: prev.level }, Math.floor(delta.xp ?? 0));
  // CP/TP (clamped >= 0)
  const nextCp = Math.max(0, prev.cp + (delta.cp ?? 0));
  const nextTp = Math.max(0, prev.tp + (delta.tpUnits ?? 0));

  return {
    xp: res.xp,
    level: res.level,
    levelsChanged: res.levelsChanged,
    proficiency: res.proficiency,
    cp: nextCp,
    tp: nextTp
  };
}
