import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  userMention,
} from "discord.js";

import { CONFIG } from "../config/resolved.js";
import { getDb } from "../db/index.js";

// Domain logic
import {
  computeCustomReward,
  computeDmReward,
  computeStaffReward,
  computePlayerTpStep,
  applyResourceDeltas,
} from "../domain/rewards.js";
import { levelForXP, proficiencyFor } from "../domain/xp.js";

/* ──────────────────────────────────────────────────────────────────────────────
   DB SHAPES
────────────────────────────────────────────────────────────────────────────── */
type PlayerRow = {
  userId: string;
  name: string;
  xp: number;
  level: number;
  cp: number; // stored copper
  tp: number; // stored as half-points (0.5 => 1)
};

async function getPlayer(userId: string): Promise<PlayerRow> {
  const db = await getDb();
  const row = await db.get<PlayerRow>(
    `SELECT userId, name, xp, level, cp, tp FROM charlog WHERE userId = ?`,
    userId
  );
  if (row) return row;
  return { userId, name: userMention(userId), xp: 0, level: 1, cp: 0, tp: 0 };
}

async function saveSnapshot(userId: string, snap: { xp: number; level: number; cp: number; tp: number; name?: string }) {
  const db = await getDb();
  const exists = await db.get<{ userId: string }>(`SELECT userId FROM charlog WHERE userId = ?`, userId);
  const name = snap.name ?? userMention(userId);
  if (exists) {
    await db.run(
      `UPDATE charlog SET xp = ?, level = ?, cp = ?, tp = ?, name = ? WHERE userId = ?`,
      [snap.xp, snap.level, snap.cp, snap.tp, name, userId]
    );
  } else {
    await db.run(
      `INSERT INTO charlog (userId, name, level, xp, cp, tp) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, name, snap.level, snap.xp, snap.cp, snap.tp]
    );
  }
}

/* ──────────────────────────────────────────────────────────────────────────────
   CONFIG / PERMISSIONS
────────────────────────────────────────────────────────────────────────────── */
const CFG = CONFIG.guild!.config;
const ROLE = CFG.roles;

const PERMS = {
  custom: [ROLE.dm.id, ROLE.moderator.id, ROLE.admin.id],
  dm: [ROLE.dm.id, ROLE.moderator.id, ROLE.admin.id],
  staff: [ROLE.moderator.id, ROLE.admin.id],
};

const REWARDS_CHANNEL_ID = CFG.channels?.resourceTracking;

function hasAnyRole(member: GuildMember | null, allowed: string[]) {
  if (!member || !allowed?.length) return false;
  const have = new Set(member.roles.cache.map((r) => r.id));
  return allowed.some((rid) => have.has(rid));
}

function isAdmin(member: GuildMember | null) {
  try {
    return !!member?.permissions?.has?.(PermissionFlagsBits.Administrator);
  } catch {
    return false;
  }
}

// Optional dev bypass while testing
const SUPERUSER_IDS = (process.env.DEV_SUPERUSERS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
function isDevBypass(ix: ChatInputCommandInteraction) {
  return CONFIG.env !== "prod" && SUPERUSER_IDS.includes(ix.user.id);
}

/* ──────────────────────────────────────────────────────────────────────────────
   SLASH COMMAND DEFINITION
────────────────────────────────────────────────────────────────────────────── */
export const data = new SlashCommandBuilder()
  .setName("reward")
  .setDescription("Award XP/GP/GT to players or claim DM/Staff rewards (config-driven).")
  // custom
  .addSubcommand((sc) =>
    sc
      .setName("custom")
      .setDescription("Award explicit XP/GP/GT to one or more players.")
      .addUserOption((o) => o.setName("user1").setDescription("Target #1").setRequired(true))
      .addUserOption((o) => o.setName("user2").setDescription("Target #2"))
      .addUserOption((o) => o.setName("user3").setDescription("Target #3"))
      .addUserOption((o) => o.setName("user4").setDescription("Target #4"))
      .addUserOption((o) => o.setName("user5").setDescription("Target #5"))
      .addUserOption((o) => o.setName("user6").setDescription("Target #6"))
      .addUserOption((o) => o.setName("user7").setDescription("Target #7"))
      .addUserOption((o) => o.setName("user8").setDescription("Target #8"))
      .addUserOption((o) => o.setName("user9").setDescription("Target #9"))
      .addUserOption((o) => o.setName("user10").setDescription("Target #10"))
      .addIntegerOption((o) => o.setName("xp").setDescription("XP to award (>=0)").setMinValue(0))
      .addNumberOption((o) => o.setName("gp").setDescription("GP to award (>=0)").setMinValue(0))
      .addNumberOption((o) => o.setName("gt").setDescription("GT to award (>=0, supports 0.5)").setMinValue(0))
      .addBooleanOption((o) => o.setName("gt_auto").setDescription("Auto GT by level band (ignores explicit GT if true)"))
      .addStringOption((o) => o.setName("reason").setDescription("Why? (stored in audit later)").setMaxLength(200))
  )
  // dm self-claim
  .addSubcommand((sc) =>
    sc
      .setName("dm")
      .setDescription("Claim DM reward for yourself based on your character level.")
      .addStringOption((o) => o.setName("reason").setDescription("Why? (optional)").setMaxLength(200))
  )
  // staff stipend to tagged users
  .addSubcommand((sc) =>
    sc
      .setName("staff")
      .setDescription("Award staff reward to one or more staffers.")
      .addUserOption((o) => o.setName("user1").setDescription("Target #1").setRequired(true))
      .addUserOption((o) => o.setName("user2").setDescription("Target #2"))
      .addUserOption((o) => o.setName("user3").setDescription("Target #3"))
      .addUserOption((o) => o.setName("user4").setDescription("Target #4"))
      .addUserOption((o) => o.setName("user5").setDescription("Target #5"))
      .addStringOption((o) => o.setName("reason").setDescription("Why? (optional)").setMaxLength(200))
  )
  .setDMPermission(false);

/* ──────────────────────────────────────────────────────────────────────────────
   EXECUTOR
────────────────────────────────────────────────────────────────────────────── */
export async function execute(ix: ChatInputCommandInteraction) {
  const sub = ix.options.getSubcommand() as "custom" | "dm" | "staff";
  const member = ix.member as GuildMember | null;

  // Permissions
  const allowed =
    hasAnyRole(member, PERMS[sub]) || isAdmin(member) || isDevBypass(ix);

  if (!allowed) {
    await ix.reply({ ephemeral: true, content: "You don’t have permission to use this." });
    return;
  }

  if (sub === "custom") return handleCustom(ix);
  if (sub === "dm") return handleDm(ix);
  if (sub === "staff") return handleStaff(ix);
}

/* ──────────────────────────────────────────────────────────────────────────────
   HANDLERS
────────────────────────────────────────────────────────────────────────────── */
function collectUsers(ix: ChatInputCommandInteraction, max = 10) {
  const users = [];
  for (let i = 1; i <= max; i++) {
    const u = ix.options.getUser(`user${i}` as any);
    if (u) users.push(u);
  }
  return users;
}

function fmtGp(cp: number) {
  return (cp / 100).toFixed(2);
}
function fmtTp(units: number) {
  return (units / 2).toFixed(1).replace(/\.0$/, "");
}

async function announceLevelChange(
  ix: ChatInputCommandInteraction,
  userId: string,
  displayName: string,
  newLevel: number,
  diff: number
) {
  const mention = userMention(userId);
  const msg =
    diff > 0
      ? `🎉 ${mention} (**${displayName}**) reached level **${newLevel}**! (Proficiency +${proficiencyFor(newLevel)})`
      : `↘️ ${mention} (**${displayName}**) dropped to level **${newLevel}**.`;

  const guild = ix.guild;
  const target =
    (guild && REWARDS_CHANNEL_ID && guild.channels.cache.get(REWARDS_CHANNEL_ID)) ||
    ix.channel;
  // @ts-expect-error narrowing omitted
  await target?.send(msg);
}

/* CUSTOM: explicit xp/gp/tp to multiple users (optional auto TP) */
async function handleCustom(ix: ChatInputCommandInteraction) {
  const recipients = collectUsers(ix);
  const xpIn = ix.options.getInteger("xp") ?? 0;
  const gpIn = ix.options.getNumber("gp") ?? 0;
  const tpIn = ix.options.getNumber("gt") ?? 0;
  const tpAuto = ix.options.getBoolean("gt_auto") ?? false;
  const reason = ix.options.getString("reason") ?? null;

  if (!recipients.length) {
    await ix.reply({ ephemeral: true, content: "Add at least one user to reward." });
    return;
  }
  if (!tpAuto && xpIn === 0 && gpIn === 0 && tpIn === 0) {
    await ix.reply({ ephemeral: true, content: "Provide at least one of XP, GP, or GT (or enable GT Auto)." });
    return;
  }

  const lines: string[] = [];
  for (const u of recipients) {
    const before = await getPlayer(u.id);
    const level = levelForXP(before.xp);

    // Compute delta
    let tpUnits = 0;
    if (tpAuto) {
      tpUnits = computePlayerTpStep(level);
    } else {
      tpUnits = Math.round((tpIn ?? 0) * 2);
    }
    const delta = computeCustomReward({ xp: xpIn, gp: gpIn, tp: tpUnits / 2 });

    // Apply
    const next = applyResourceDeltas(before, { ...delta, tpUnits });
    await saveSnapshot(u.id, { xp: next.xp, level: next.level, cp: next.cp, tp: next.tp, name: before.name });

    // Announce level changes publicly also tag the user who owns the character
    if (next.levelsChanged !== 0) {
      await announceLevelChange(ix, u.id, before.name, next.level, next.levelsChanged);
    }

    lines.push(
      `${before.name}: +${delta.xp ?? 0} XP, +${fmtGp(delta.cp ?? 0)} GP, +${fmtTp(tpUnits)} GT → ` +
      `XP ${next.xp.toLocaleString()} · L${next.level} · GP ${fmtGp(next.cp)} · GT ${fmtTp(next.tp)}`
    );
  }

  const embed = new EmbedBuilder()
    .setTitle("Rewards applied")
    .setDescription(lines.join("\n"))
    .setFooter({ text: reason ? `Reason: ${reason}` : "—" });

  await ix.reply({ embeds: [embed] });
}

/* DM: invoker claims bracketed DM reward for self */
async function handleDm(ix: ChatInputCommandInteraction) {
  const u = ix.user;
  const reason = ix.options.getString("reason") ?? null;

  const before = await getPlayer(u.id);
  const level = levelForXP(before.xp);

  const delta = computeDmReward(level);
  const next = applyResourceDeltas(before, delta);
  await saveSnapshot(u.id, { xp: next.xp, level: next.level, cp: next.cp, tp: next.tp, name: before.name });

  if (next.levelsChanged !== 0) {
    await announceLevelChange(ix, u.id, before.name, next.level, next.levelsChanged);
  }

  const embed = new EmbedBuilder()
    .setTitle("DM Reward")
    .setDescription(
      `${before.name} (L${level})\n` +
      `+${delta.xp ?? 0} XP, +${fmtGp(delta.cp ?? 0)} GP, +${fmtTp(delta.tpUnits ?? 0)} GT\n` +
      `→ XP ${next.xp.toLocaleString()} · L${next.level} · GP ${fmtGp(next.cp)} · GT ${fmtTp(next.tp)}`
    )
    .setFooter({ text: reason ? `Reason: ${reason}` : "—" });

  await ix.reply({embeds: [embed] });
}

/* STAFF: award bracketed Staff reward to tagged users */
async function handleStaff(ix: ChatInputCommandInteraction) {
  const recipients = collectUsers(ix, 5);
  const reason = ix.options.getString("reason") ?? null;

  if (!recipients.length) {
    await ix.reply({ ephemeral: true, content: "Tag at least one staff member." });
    return;
  }

  const lines: string[] = [];
  for (const u of recipients) {
    const before = await getPlayer(u.id);
    const level = levelForXP(before.xp);

    const delta = computeStaffReward(level);
    const next = applyResourceDeltas(before, delta);
    await saveSnapshot(u.id, { xp: next.xp, level: next.level, cp: next.cp, tp: next.tp, name: before.name });

    if (next.levelsChanged !== 0) {
      await announceLevelChange(ix, u.id, before.name, next.level, next.levelsChanged);
    }

    lines.push(
      `${before.name} (L${level}): +${delta.xp ?? 0} XP, +${fmtGp(delta.cp ?? 0)} GP, +${fmtTp(delta.tpUnits ?? 0)} GT → ` +
      `XP ${next.xp.toLocaleString()} · L${next.level} · GP ${fmtGp(next.cp)} · GT ${fmtTp(next.tp)}`
    );
  }

  const embed = new EmbedBuilder()
    .setTitle("Staff Rewards")
    .setDescription(lines.join("\n"))
    .setFooter({ text: reason ? `Reason: ${reason}` : "—" });

  await ix.reply({ embeds: [embed] });
}

export default { data, execute };
