import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
} from "discord.js";
import { CONFIG } from "../config/resolved.js";
import { validateCommandPermissions } from "../config/validaters.js";
import { getDb } from "../db/index.js";

// --- Types / DB ---
type PlayerRow = {
  userId: string;
  name: string;
  xp: number;
  level: number;
  cp: number;
  tp: number;
};

async function getPlayerByUserId(userId: string): Promise<PlayerRow | null>  {
  const db = await getDb();
  const row = await db.get<PlayerRow>(
    `SELECT userId, name, xp, level, cp, tp FROM charlog WHERE userId = ?`,
    userId
  );
  return row ?? null;
}

async function upsertPlayerCP(
  userId: string,
  nextCP: number,
  displayName?: string
) {
  const db = await getDb();
  await db.run(
    `
    INSERT INTO charlog (userId, name, level, xp, cp, tp)
    VALUES (
      ?, COALESCE((SELECT name FROM charlog WHERE userId = ?), ?),
      COALESCE((SELECT level FROM charlog WHERE userId = ?), 1),
      COALESCE((SELECT xp    FROM charlog WHERE userId = ?), 0),
      ?,  -- cp
      COALESCE((SELECT tp    FROM charlog WHERE userId = ?), 0)
    )
    ON CONFLICT(userId) DO UPDATE SET
      cp   = excluded.cp,
      name = COALESCE(excluded.name, charlog.name)
    `,
    [
      userId,
      userId,
      displayName ?? `<@${userId}>`,
      userId,
      userId,
      nextCP,
      userId,
    ]
  );
}

// --- Permissions from AppConfig ---
const CFG = CONFIG.guild!.config;
const ROLE = CFG.roles;
const PERMS = {
  add: [ROLE.dm.id, ROLE.moderator.id, ROLE.admin.id].filter(
    Boolean
  ) as string[],
  adjust: [ROLE.moderator.id, ROLE.admin.id].filter(Boolean) as string[],
  set: [ROLE.admin.id].filter(Boolean) as string[],
  show: [] as string[],
};
const REWARDS_CHANNEL_ID = CFG.channels?.resourceTracking || null;

// --- Helpers ---
function toCp(amountGp: number) {
  return Math.round(amountGp * 100);
}
function toGpString(cp: number) {
  return (cp / 100).toFixed(2);
}

export const data = new SlashCommandBuilder()
  .setName("gp")
  .setDescription(
    "Manage a user's gold (GP). Stored internally as copper (CP)."
  )
  .addSubcommand((sc) =>
    sc
      .setName("show")
      .setDescription("Show GP for a user")
      .addUserOption((o) =>
        o.setName("user").setDescription("Target (defaults to you)")
      )
  )
  .addSubcommand((sc) =>
    sc
      .setName("add")
      .setDescription("Give GP to a user (positive decimal)")
      .addUserOption((o) =>
        o.setName("user").setDescription("Target").setRequired(true)
      )
      .addNumberOption((o) =>
        o
          .setName("amount")
          .setDescription("GP to add (e.g., 12.5)")
          .setRequired(true)
          .setMinValue(0.01)
      )
      .addStringOption((o) =>
        o.setName("reason").setDescription("Why? (audit)").setMaxLength(200)
      )
  )
  .addSubcommand((sc) =>
    sc
      .setName("adjust")
      .setDescription("Adjust GP by a signed decimal (can remove)")
      .addUserOption((o) =>
        o.setName("user").setDescription("Target").setRequired(true)
      )
      .addNumberOption((o) =>
        o
          .setName("amount")
          .setDescription("Signed GP delta (e.g., -3.75)")
          .setRequired(true)
      )
      .addStringOption((o) =>
        o.setName("reason").setDescription("Why? (audit)").setMaxLength(200)
      )
  )
  .addSubcommand((sc) =>
    sc
      .setName("set")
      .setDescription("Set a user's GP to an exact value")
      .addUserOption((o) =>
        o.setName("user").setDescription("Target").setRequired(true)
      )
      .addNumberOption((o) =>
        o
          .setName("amount")
          .setDescription("Absolute GP (>=0)")
          .setRequired(true)
          .setMinValue(0)
      )
      .addStringOption((o) =>
        o.setName("reason").setDescription("Why? (audit)").setMaxLength(200)
      )
  )

export async function execute(ix: ChatInputCommandInteraction) {
  const sub = ix.options.getSubcommand();
  const member = ix.member as GuildMember | null;

  // Validate permissions using the reusable function
  if (!validateCommandPermissions(ix, member, PERMS)) {
    return; // validateCommandPermissions already sent the reply
  }

  if (sub === "show") {
    const user = ix.options.getUser("user") ?? ix.user;
    const row = await getPlayerByUserId(user.id);
    if (!row) {
      return ix.reply({
        flags: MessageFlags.Ephemeral,
        content: `Hi ${user}, it looks like you don't have a character log yet. Please get initiated and re-run the command to view GP.`,
      });
    }

    const embed = new EmbedBuilder()
      .setAuthor({ name: `${row.name} — Wallet` })
      .addFields(
        { name: "GP", value: ` 💰 **${toGpString(row.cp)}**`, inline: false },
        { name: "CP (stored)", value: "🪙 " + row.cp.toString(), inline: false }
      );
    return ix.reply({ flags: MessageFlags.Ephemeral, embeds: [embed] });
  }

  // mutating subcommands
  const user = ix.options.getUser("user", true);
  const reason = ix.options.getString("reason") ?? null;
  const row = await getPlayerByUserId(user.id);

  if (!row) {
    return ix.reply({
      flags: MessageFlags.Ephemeral,
      content: `Hi ${user}, it looks like there is no character log yet. Please initiate the character and re-run the command to view GP.`,
    });
  }

  if (sub === "add") {
    const amtGp = ix.options.getNumber("amount", true);
    if (amtGp <= 0)
      return ix.reply({ ephemeral: true, content: "Amount must be > 0." });

    const delta = toCp(amtGp);
    const next = Math.max(0, row.cp + delta);
    await upsertPlayerCP(user.id, next, row.name);
    await ix.reply({
      ephemeral: true,
      content: `OK. ${row.name}: **+${amtGp} GP** → ${toGpString(next)} GP`,
    });
    return;
  }

  if (sub === "adjust") {
    const amtGp = ix.options.getNumber("amount", true);
    const delta = toCp(amtGp);
    const next = Math.max(0, row.cp + delta);
    await upsertPlayerCP(user.id, next, row.name);
    const sign = delta >= 0 ? "+" : "-";
    await ix.reply({
      ephemeral: true,
      content: `OK. ${row.name}: **${sign}${Math.abs(amtGp)} GP** → ${toGpString(next)} GP`,
    });
    return;
  }

  if (sub === "set") {
    const amtGp = ix.options.getNumber("amount", true);
    const next = toCp(amtGp);
    await upsertPlayerCP(user.id, next, row.name);
    await ix.reply({
      ephemeral: true,
      content: `OK. ${row.name}: set to **${amtGp.toFixed(2)} GP**`,
    });
    return;
  }
}

export default { data, execute };
