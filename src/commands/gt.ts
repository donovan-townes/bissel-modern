import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import { CONFIG } from "../config/resolved.js";
import { getDb } from "../db/index.js";

import { validateCommandPermissions } from "../config/validaters.js";

// Note that GT is actually TP (Training Points) in the database. Changed via guild decision.
// GT is stored doubled (0.5 → 1). Display as gt/2.
type PlayerRow = { userId: string; name: string; xp: number; level: number; cp: number; tp: number };

async function getPlayerByUserId(userId: string): Promise<PlayerRow> {
  const db = await getDb();
  const row = await db.get<PlayerRow>(
    `SELECT userId, name, xp, level, cp, tp FROM charlog WHERE userId = ?`,
    userId
  );
  if (row) return row;
  return { userId, name: `<@${userId}>`, xp: 0, level: 1, cp: 0, tp: 0 };
}

async function upsertPlayerTP(userId: string, nextTPUnits: number, displayName?: string) {
  const db = await getDb();
  await db.run(
    `
    INSERT INTO charlog (userId, name, level, xp, cp, tp)
    VALUES (
      ?, COALESCE((SELECT name FROM charlog WHERE userId = ?), ?),
      COALESCE((SELECT level FROM charlog WHERE userId = ?), 1),
      COALESCE((SELECT xp    FROM charlog WHERE userId = ?), 0),
      COALESCE((SELECT cp    FROM charlog WHERE userId = ?), 0),
      ?   -- tp
    )
    ON CONFLICT(userId) DO UPDATE SET
      tp   = excluded.tp,
      name = COALESCE(excluded.name, charlog.name)
    `,
    [userId, userId, displayName ?? `<@${userId}>`, userId, userId, userId, nextTPUnits]
  );
}

const CFG = CONFIG.guild!.config;
const ROLE = CFG.roles;
const PERMS = {
  add: [ROLE.dm.id, ROLE.moderator.id, ROLE.admin.id],
  adjust: [ROLE.moderator.id, ROLE.admin.id],
  set: [ROLE.admin.id],
  show: [] as string[],
};


function toUnits(tp: number) {
  // accept steps of 0.5
  return Math.round(tp * 2);
}
function toDisplay(units: number) {
  return (units / 2).toFixed(1).replace(/\.0$/, "");
}

export const data = new SlashCommandBuilder()
  .setName("gt")
  .setDescription("Manage a user's Golden Tickets (GT). Stored as half-points.")
  .addSubcommand(sc =>
    sc.setName("show")
      .setDescription("Show GT for a user")
      .addUserOption(o => o.setName("user").setDescription("Target (defaults to you)"))
  )
  .addSubcommand(sc =>
    sc.setName("add")
      .setDescription("Give GT to a user (supports 0.5 steps)")
      .addUserOption(o => o.setName("user").setDescription("Target").setRequired(true))
      .addNumberOption(o => o.setName("amount").setDescription("GT to add (e.g., 1 or 0.5)").setRequired(true).setMinValue(0.5))
      .addStringOption(o => o.setName("reason").setDescription("Why? (audit)").setMaxLength(200))
  )
  .addSubcommand(sc =>
    sc.setName("adjust")
      .setDescription("Adjust GT by a signed decimal (0.5 steps)")
      .addUserOption(o => o.setName("user").setDescription("Target").setRequired(true))
      .addNumberOption(o => o.setName("amount").setDescription("Signed GT delta (e.g., -0.5)").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Why? (audit)").setMaxLength(200))
  )
  .addSubcommand(sc =>
    sc.setName("set")
      .setDescription("Set a user's GT to an exact value")
      .addUserOption(o => o.setName("user").setDescription("Target").setRequired(true))
      .addNumberOption(o => o.setName("amount").setDescription("Absolute GT (>=0)").setRequired(true).setMinValue(0))
      .addStringOption(o => o.setName("reason").setDescription("Why? (audit)").setMaxLength(200))
  )
  .setDMPermission(false);

export async function execute(ix: ChatInputCommandInteraction) {
  const sub = ix.options.getSubcommand();
  const member = ix.member as GuildMember | null;

    if (!validateCommandPermissions(ix, member, PERMS)) return;

  if (sub === "show") {
    const user = ix.options.getUser("user") ?? ix.user;
    const row = await getPlayerByUserId(user.id);
    const embed = new EmbedBuilder()
      .setAuthor({ name: `${row.name} — Golden Tickets` })
      .addFields(
        { name: "GT", value: `**${toDisplay(row.tp)}**`, inline: true },
        { name: "Stored", value: `${row.tp} (half-points)`, inline: true },
      );
    return ix.reply({ ephemeral: true, embeds: [embed] });
  }

  const user = ix.options.getUser("user", true);
  const reason = ix.options.getString("reason") ?? null;
  const row = await getPlayerByUserId(user.id);

  if (sub === "add") {
    const amt = ix.options.getNumber("amount", true);
    if (amt <= 0) return ix.reply({ ephemeral: true, content: "Amount must be > 0." });
    const deltaUnits = toUnits(amt);
    const next = Math.max(0, row.tp + deltaUnits);
    await upsertPlayerTP(user.id, next, row.name);
    return ix.reply({ ephemeral: true, content: `OK. ${row.name}: **+${amt} GT** → ${toDisplay(next)} GT` });
  }

  if (sub === "adjust") {
    const amt = ix.options.getNumber("amount", true);
    const deltaUnits = toUnits(amt);
    const next = Math.max(0, row.tp + deltaUnits);
    await upsertPlayerTP(user.id, next, row.name);
    const sign = deltaUnits >= 0 ? "+" : "−";
    return ix.reply({ ephemeral: true, content: `OK. ${row.name}: **${sign}${Math.abs(amt)} GT** → ${toDisplay(next)} GT` });
  }

  if (sub === "set") {
    const amt = ix.options.getNumber("amount", true);
    const next = toUnits(amt);
    await upsertPlayerTP(user.id, next, row.name);
    return ix.reply({ ephemeral: true, content: `OK. ${row.name}: set to **${amt} GT**` });
  }
}

export default { data, execute };
