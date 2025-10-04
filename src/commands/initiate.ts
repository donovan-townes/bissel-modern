// src/commands/initiate.ts
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { getDb } from '../db/index.js';

export const data = new SlashCommandBuilder()
  .setName('initiate')
  .setDescription('Create an adventurer record for a user')
  .addUserOption(o =>
    o.setName('user').setDescription('Discord user to initiate (defaults to you)').setRequired(true))
  .addStringOption(o =>
    o.setName('name').setDescription("Adventurer's name").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers) // mod+
    
export async function execute(interaction: ChatInputCommandInteraction) {

  // --- inputs ---
  const db = getDb();
  const targetUser = interaction.options.getUser('user') ?? interaction.user;
  const rawName = interaction.options.getString('name', true).trim();

  // name validation (letters/numbers/spaces/apostrophes/hyphens)
  if (!/^[a-zA-Z0-9'\- ]+$/.test(rawName)) {
    await interaction.reply({ ephemeral: true, content:
      'Invalid character name. Use letters, numbers, spaces, apostrophes, or hyphens.' });
    return;
  }

  // prevent duplicate active record
  const exists = await db.get(`SELECT 1 FROM charlog WHERE userId = ?`, targetUser.id);
  if (exists) {
    await interaction.reply({ ephemeral: true, content:
      targetUser.id === interaction.user.id
        ? 'You already have an active adventurer. Retire before initiating a new one.'
        : 'That user already has an active adventurer. Retire before initiating a new one.' });
    return;
  }

  // --- create baseline record (Level 3 / 900 XP / 80 GP / 0 TP) ---
  await db.run(
    `INSERT INTO charlog (userId, name, level, xp, cp, tp)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [targetUser.id, rawName, 3, 900, 8000, 0]
  );

  // reply (no role changes, no fund debit)
  await interaction.reply({
    embeds: [{
      title: `Welcome to the Adventurer's Guild of Remnant, ${rawName}!`,
      description: targetUser.toString(),
      fields: [
        { name: 'Level', value: '3', inline: true },
        { name: 'XP',    value: '900', inline: true },
        { name: 'GP',    value: '80.00', inline: true },
        { name: 'TP',    value: '0.0', inline: true },
      ],
      footer: { text: 'Note: levels will later be calculated from XP thresholds (1–20).' },
    }],
  });
}
