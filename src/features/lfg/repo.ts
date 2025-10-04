import { getDb } from "../../db/index.js";

export type LfgTier = "low" | "mid" | "high" | "epic" | "pbp";

export async function lfgToggle(userId: string, guildId: string, tier: LfgTier) {
  const db = getDb();
  const row = await db.get<{ userId: string }>(
    `SELECT userId FROM lfg_presence WHERE userId=? AND tier=?`,
    userId, tier
  );
  if (row) {
    await db.run(`DELETE FROM lfg_presence WHERE userId=? AND tier=?`, userId, tier);
    return { status: "removed", tier };
  } else {
    await db.run(
      `INSERT INTO lfg_presence (userId, guildId, tier) VALUES (?,?,?)`,
      userId, guildId, tier
    );
    return { status: "added", tier };
  }
}

export async function lfgListByTier(guildId: string, tier: LfgTier) {
  const db = getDb();
  return db.all<{ userId: string; since: number }[]>(
    `SELECT userId, since FROM lfg_presence WHERE guildId=? AND tier=? ORDER BY since ASC`,
    guildId, tier
  );
}

export async function lfgPurgeOlderThan(days: number, tier?: LfgTier) {
  const db = getDb();
  const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
  if (tier) {
    const res = await db.run(
      `DELETE FROM lfg_presence WHERE since < ? AND tier = ?`, cutoff, tier
    );
    return res.changes ?? 0;
  } else {
    const res = await db.run(
      `DELETE FROM lfg_presence WHERE since < ?`, cutoff
    );
    return res.changes ?? 0;
  }
}
