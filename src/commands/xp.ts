// src/commands/xp.ts
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
} from "discord.js";
import {
  applyXP,
  levelForXP,
  bandFor,
  xpNeededFor,
  proficiencyFor,
} from "../domain/xp.js";
import { CONFIG } from "../config/resolved.js";
import { validateCommandPermissions } from "../config/validaters.js";
import { getDb } from "../db/index.js";

type PlayerRow = { userId: string; name: string; xp: number; level: number };

async function getPlayerByUserId(userId: string): Promise<PlayerRow> {
  const db = await getDb();
    const row = await db.get<PlayerRow>(
    `SELECT userId, name, xp, level FROM charlog WHERE userId = ?`,
    userId
    );
    if (row) return row;

    
  return { userId, name: `<@${userId}>`, xp: 0, level: 1 };
}

async function updatePlayerXPLevel(userId: string, xp: number, level: number, displayName?: string) {
  const db = await getDb();
  const res = await db.run(`UPDATE charlog SET xp = ?, level = ? WHERE userId = ?`, [xp, level, userId]);
  if (res.changes === 0) {
    await db.run(
      `INSERT INTO charlog (userId, name, level, xp, cp, tp) VALUES (?, ?, ?, ?, 0, 0)`,
      [userId, displayName ?? `<@${userId}>`, level, xp]
    );
    console.log(`Updated XP/level for ${userId}: ${xp} XP, level ${level}`);
  }
}


  // not yet implemented
async function insertAuditLog(entry: {
  moderatorId: string;
  targetId: string;
  kind: "add" | "adjust" | "set";
  delta: number;
  beforeXP: number;
  afterXP: number;
  reason?: string | null;
}) {
  // TODO: INSERT INTO xp_audit (...)
}

// Permissions

const CFG = CONFIG.guild!.config;
const ROLE = CFG.roles;


const PERMS = {
  add: [ROLE.dm.id, ROLE.moderator.id, ROLE.admin.id].filter((id): id is string => id !== undefined),
  adjust: [ROLE.moderator.id, ROLE.admin.id].filter((id): id is string => id !== undefined),
  set: [ROLE.admin.id].filter((id): id is string => id !== undefined),
  show: [] as string[], // empty => everyone
};

const REWARDS_CHANNEL_ID = CFG.channels?.resourceTracking || null;
// ---- Helpers ----

async function announceLevelChange(
  ix: ChatInputCommandInteraction,
  displayName: string,
  newLevel: number,
  diff: number,
  newProf: number
) {
  const up = diff > 0;
  const msg = up
    ? `🎉 **${displayName}** reached level **${newLevel}**! (Proficiency +${newProf})`
    : `↘️ **${displayName}** dropped to level **${newLevel}**.`;

  const guild = ix.guild;
  const target =
    (guild && REWARDS_CHANNEL_ID && guild.channels.cache.get(REWARDS_CHANNEL_ID)) ||
    ix.channel;

  // @ts-expect-error (text channel narrowing omitted)
  await target?.send(msg);
}

// ---- Slash Command Definition ----
export const data = new SlashCommandBuilder()
  .setName("xp")
  .setDescription("XP controls")
  .addSubcommand((sc) =>
    sc
      .setName("add")
      .setDescription("Give XP to a user (positive only)")
      .addUserOption((o) =>
        o.setName("user").setDescription("Target").setRequired(true)
      )
      .addIntegerOption((o) =>
        o.setName("amount").setDescription("XP to add (≥1)").setRequired(true).setMinValue(1)
      )
      .addStringOption((o) =>
        o.setName("reason").setDescription("Why? (stored in audit)").setMaxLength(200)
      )
  )
  .addSubcommand((sc) =>
    sc
      .setName("adjust")
      .setDescription("Adjust XP by a signed amount (can remove)")
      .addUserOption((o) =>
        o.setName("user").setDescription("Target").setRequired(true)
      )
      .addIntegerOption((o) =>
        o.setName("amount").setDescription("Signed XP delta, e.g. -50").setRequired(true)
      )
      .addStringOption((o) =>
        o.setName("reason").setDescription("Why? (stored in audit)").setMaxLength(200)
      )
  )
  .addSubcommand((sc) =>
    sc
      .setName("set")
      .setDescription("Set a user's XP to an exact value")
      .addUserOption((o) =>
        o.setName("user").setDescription("Target").setRequired(true)
      )
      .addIntegerOption((o) =>
        o.setName("amount").setDescription("Absolute XP (≥0)").setRequired(true).setMinValue(0)
      )
      .addStringOption((o) =>
        o.setName("reason").setDescription("Why? (stored in audit)").setMaxLength(200)
      )
  )
  .addSubcommand((sc) =>
    sc
      .setName("show")
      .setDescription("Show a user's XP, level, and progress")
      .addUserOption((o) => o.setName("user").setDescription("Target (defaults to you)"))
  )

// ---- Executor ----
export async function execute(ix: ChatInputCommandInteraction) {
  const sub = ix.options.getSubcommand();
  const member = ix.member as GuildMember | null;

  // Role gates (show = everyone unless configured)
  if (!validateCommandPermissions(ix, member, PERMS)) return;


  if (sub === "show") {
    const user = ix.options.getUser("user") ?? ix.user;
    const row = await getPlayerByUserId(user.id);
    const level = levelForXP(row.xp);
    const { curr, next } = bandFor(level);
    const nextDisp = next === null ? "—" : `${next.toLocaleString()} XP (to L${level + 1})`;
    const pct = next === null ? 100 : Math.floor(((row.xp - curr) / (next - curr)) * 100);

    const embed = new EmbedBuilder()
      .setAuthor({ name: `${row.name} — XP Overview` })
      .addFields(
        { name: "Level", value: `**${level}**`, inline: true },
        { name: "XP", value: row.xp.toLocaleString(), inline: true },
        { name: "Proficiency", value: `+${proficiencyFor(level)}`, inline: true },
        { name: "Next Threshold", value: nextDisp, inline: false },
        {
          name: "Progress",
          value:
            next === null
              ? "Max level reached."
              : `\`${pct}%\`  (${(row.xp - curr).toLocaleString()} / ${(next - curr).toLocaleString()})`,
          inline: false
        }
      );

    await ix.reply({ ephemeral: true, embeds: [embed] });
    return;
  }

  // Mutations: add / adjust / set
  const user = ix.options.getUser("user", true);
  const reason = ix.options.getString("reason") ?? null;
  const before = await getPlayerByUserId(user.id);

  if (sub === "add") {
    const amt = ix.options.getInteger("amount", true);
    if (amt <= 0) return ix.reply({ ephemeral: true, content: "Amount must be ≥ 1." });

    const res = applyXP({ xp: before.xp, level: before.level }, amt);
    await updatePlayerXPLevel(user.id, res.xp, res.level);
    // insert audit log (not yet implemented)

    // await insertAuditLog({
    //   moderatorId: ix.user.id,
    //   targetId: user.id,
    //   kind: "add",
    //   delta: amt,
    //   beforeXP: before.xp,
    //   afterXP: res.xp,
    //   reason,
    // });

    await ix.reply({
      ephemeral: true,
      content: `OK. ${before.name}: **+${amt} XP** → ${res.xp.toLocaleString()} XP, level ${before.level} → ${res.level}`,
    });

    if (res.levelsChanged !== 0) {
      await announceLevelChange(ix, before.name, res.level, res.levelsChanged, res.proficiency);
    }
    return;
  }

  if (sub === "adjust") {
    const amt = ix.options.getInteger("amount", true);

    const res = applyXP({ xp: before.xp, level: before.level }, amt);
    await updatePlayerXPLevel(user.id, res.xp, res.level);
    
    // insert audit log (not yet implemented)

    // await insertAuditLog({
    //   moderatorId: ix.user.id,
    //   targetId: user.id,
    //   kind: "adjust",
    //   delta: amt,
    //   beforeXP: before.xp,
    //   afterXP: res.xp,
    //   reason,
    // });

    const sign = amt >= 0 ? "+" : "−";
    await ix.reply({
      ephemeral: true,
      content: `OK. ${before.name}: **${sign}${Math.abs(amt)} XP** → ${res.xp.toLocaleString()} XP, level ${before.level} → ${res.level}`,
    });

    if (res.levelsChanged !== 0) {
      await announceLevelChange(ix, before.name, res.level, res.levelsChanged, res.proficiency);
    }
    return;
  }

  if (sub === "set") {
    const amt = ix.options.getInteger("amount", true);
    if (amt < 0) return ix.reply({ ephemeral: true, content: "Amount must be ≥ 0." });

    const newLevel = levelForXP(amt);
    await updatePlayerXPLevel(user.id, amt, newLevel);
    // insert audit log (not yet implemented)
    // await insertAuditLog({
    //   moderatorId: ix.user.id,
    //   targetId: user.id,
    //   kind: "set",
    //   delta: amt - before.xp,
    //   beforeXP: before.xp,
    //   afterXP: amt,
    //   reason,
    // });

    await ix.reply({
      flags: MessageFlags.Ephemeral,
      content: `OK. ${before.name}: set to **${amt.toLocaleString()} XP** → level **${newLevel}** (was L${before.level}).`,
    });

    const changed = newLevel - before.level;
    if (changed !== 0) {
      await announceLevelChange(ix, before.name, newLevel, changed, proficiencyFor(newLevel));
    }
    return;
  }
}

export default { data, execute };