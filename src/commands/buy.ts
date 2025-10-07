import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
    MessageFlags,
} from "discord.js";
import { CONFIG } from "../config/resolved.js";
import { getDb } from "../db/index.js";

type PlayerRow = {
  userId: string;
  name: string;
  level: number;
  xp: number;
  cp: number; // stored in copper
  tp: number;
};

const CFG = CONFIG.guild!.config;
const REWARDS_CHANNEL_ID = CFG.channels?.resourceTracking || null;
// const DEV_CHANNEL_ID = "1420807995893223496"

// helpers
const toCp = (gp: number) => Math.round(gp * 100);
const toGp = (cp: number) => (cp / 100).toFixed(2);

async function getPlayer(userId: string) {
  const db = await getDb();
  return db.get<PlayerRow>("SELECT * FROM charlog WHERE userId = ?", [userId]);
}

async function subCp(userId: string, deltaCp: number) {
  const db = await getDb();
  await db.run("UPDATE charlog SET cp = cp - ? WHERE userId = ?", [
    deltaCp,
    userId,
  ]);
}

export const data = new SlashCommandBuilder()
  .setName("buy")
  .setDescription("Buy an item for GP and record it to your character log.")
  .addStringOption((opt) =>
    opt
      .setName("item")
      .setDescription("What are you buying?")
      .setRequired(true)
  )
  .addNumberOption((opt) =>
    opt
      .setName("amount")
      .setDescription("Sale price in GP (must be > 0)")
      .setRequired(true)
      .setMinValue(0.01)
  );

export async function execute(ix: ChatInputCommandInteraction) {
  // Basic permission scaffold (everyone can use; still validates bot perms)

  // Channel guard: only allowed in Resource channel (or test override if you use one)

  if (REWARDS_CHANNEL_ID && ix.channel?.id !== REWARDS_CHANNEL_ID) {
    await ix.reply({
      ephemeral: true,
      content:
        "This command can only be used in the Resource channel for tracking.",
    });
    return;
  }

  const member = ix.member as GuildMember;
  const user = member.user;

  const item = ix.options.getString("item", true).trim();
  const amountGp = ix.options.getNumber("amount", true);

  // sanity checks
  if (!item) {
    await ix.reply({ ephemeral: true, content: "Please provide an item name." });
    return;
  }
  if (!(amountGp > 0)) {
    await ix.reply({
      ephemeral: true,
      content: "Amount must be a positive number greater than 0.",
    });
    return;
  }
  // reject more than 2 decimal places (GP precision)
  if (Math.round(amountGp * 100) !== amountGp * 100) {
    await ix.reply({
      ephemeral: true,
      content: "Please specify a valid GP amount (max two decimals).",
    });
    return;
  }

  const row = await getPlayer(user.id);
  const displayName = row?.name ?? (member.displayName || user.username);

  // Make sure the row exists (keeps behavior graceful for first-time users)
  if (!row) {
        await ix.reply({
            flags: MessageFlags.Ephemeral,
            content:
                `Hi ${user}, it looks like you don't have a character log yet. Please get initiated and re-run the command to record your sale.`,
        });
        return;
  }

  const deltaCp = toCp(amountGp);
  await subCp(user.id, deltaCp);

  const updated = await getPlayer(user.id);
  const newGp = updated ? toGp(updated.cp) : toGp((row?.cp ?? 0) + deltaCp);

  // Legacy-style public audit line + a clean embed
  const embed = new EmbedBuilder()
    .setTitle("📜 Purchase Recorded")
    .setDescription(
      `**${displayName}** bought **${item}** for **${amountGp.toFixed(
        2
      )} GP**.\n**New GP Total:** ${newGp} GP`
    )
    .setFooter({ text: `Transacted by ${user.tag}` })
    .setTimestamp();

  await ix.reply({ embeds: [embed] });
}

export default { data, execute };
