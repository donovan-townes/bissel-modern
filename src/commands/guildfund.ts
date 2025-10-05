// src/commands/guildfund.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getDb } from '../db/index.js';

import { CONFIG } from '../config/resolved.js';

const FUND_ID = CONFIG.system.fundId;

export const data = new SlashCommandBuilder()
  .setName('guildfund')
  .setDescription('Show the Adventurers Guild fund balance')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) // for now restrict to staff

export async function execute(interaction: ChatInputCommandInteraction) {
  const db = getDb();
  const row = await db.get(
    `SELECT name, level, xp, cp, tp FROM charlog WHERE userId = ?`,
    FUND_ID
  );

  if (!row) {
    await interaction.reply({ ephemeral: true, content: 'Guild fund not found.' });
    return;
  }

  const gp = (row.cp / 100).toFixed(2);
  const tp = (row.tp / 2).toFixed(1);

  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    embeds: [{
      title: row.name ?? 'Adventurers Guild Fund',
      fields: [
        { name: 'GP', value: "💰 " + gp, inline: true },
        { name: 'GT', value: "🎫 " + tp, inline: true },
      ],
      footer: { text: 'Stored as cp (x100) and half-GT (x2) internally' }
    }]
  });
}
