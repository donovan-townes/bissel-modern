// commands/charinfo.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getDb } from "../db/index.js";

export const data = new SlashCommandBuilder()
  .setName("charinfo")
  .setDescription("Show your character info (or mention a user)")
  .addUserOption((o) => o.setName("user").setDescription("Target user"));

export async function execute(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser("user") ?? interaction.user;
  const caller = interaction.user;
  const db = getDb();
  const row = await db.get(
    "SELECT name, level, xp, tp, cp FROM charlog WHERE userId = ?",
    user.id
  );
  if (!row) {
    await interaction.reply({
      ephemeral: true,
      content: `No active character found for ${user}.`,
    });
    return;
  }
  const gp = (row.cp / 100).toFixed(2);
  const tp = (row.tp / 2).toFixed(1);
 
  await interaction.reply({ ephemeral: false, embeds: [
      new EmbedBuilder()
        .setColor(0x0099ff)
        .setThumbnail(user.displayAvatarURL())
        .setTitle(`Character — ${row.name}`)
        .setDescription("OOC Owner: " + user.toString())
        .addFields(
          { name: 'Level', value: String(row.level), inline: true },
          { name: 'XP', value: String(row.xp), inline: true },
          { name: 'TP', value: tp, inline: true },
          { name: 'GP', value: gp, inline: true },
        )
        .setFooter({ text: "Requested via " + caller.displayName, iconURL: caller.displayAvatarURL() })
    ] });

}
