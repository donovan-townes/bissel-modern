import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
  MessageFlags,
} from 'discord.js';
import { getDb } from '../db/index.js';

import { CONFIG } from '../config/resolved.js';

export const data = new SlashCommandBuilder()
  .setName('retire')
  .setDescription('Retire your adventurer or another adventurer (Mod+ only).')
  .addUserOption(o =>
    o.setName('user')
     .setDescription('Target user to retire (Mod+ only).')
     .setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)

// We’ll register an event listener in execute() for the modal submit.
export async function execute(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('user');
  const isSelf = !targetUser || targetUser.id === interaction.user.id;

  // Permission check for mod actions
  if (!isSelf) {
    const member = await interaction.guild?.members.fetch(interaction.user.id);
    const canManage =
      member?.permissions.has(PermissionFlagsBits.KickMembers) ||
      member?.roles.cache.some(r => Object.values(CONFIG.guild?.config.roles ?? {}).map(role => role.id).includes(r.id));
    if (!canManage) {
      return interaction.reply({
        content: 'Only moderators or staff can retire another adventurer.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  // Build modal
  const modal = new ModalBuilder()
    .setCustomId(`retire-confirm-${targetUser?.id ?? interaction.user.id}`)
    .setTitle('Confirm Retirement');

  const confirmInput = new TextInputBuilder()
    .setCustomId('confirm_text')
    .setLabel('Type RETIRE to confirm')
    .setPlaceholder('RETIRE')
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(confirmInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

// --- Modal Handler ---
export async function handleModal(interaction: ModalSubmitInteraction) {
  if (!interaction.customId.startsWith('retire-confirm-')) return;

  const input = interaction.fields.getTextInputValue('confirm_text');
  if (input !== 'RETIRE') {
    return interaction.reply({ content: 'Retirement cancelled — confirmation text must be RETIRE.', flags: MessageFlags.Ephemeral });
  }

  const targetId = interaction.customId.replace('retire-confirm-', '');
  const actor = interaction.user;

  const db = await getDb();
  const tables = await db.all<{ name: string }[]>(`SELECT name FROM sqlite_master WHERE type='table'`);
  const hasAdventurers = tables.some(t => t.name === 'adventurers');
  const hasCharlog = tables.some(t => t.name === 'charlog');

  let row = null;
  if (hasAdventurers) row = await db.get(`SELECT * FROM adventurers WHERE user_id = ?`, targetId);
  else if (hasCharlog) row = await db.get(`SELECT * FROM charlog WHERE userId = ?`, targetId);

  if (!row) {
    return interaction.reply({
      content: 'No active adventurer record found for that user.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (hasAdventurers) await db.run(`DELETE FROM adventurers WHERE user_id = ?`, targetId);
  else if (hasCharlog) await db.run(`DELETE FROM charlog WHERE userId = ?`, targetId);

  // Optional role cleanup
  const guild = interaction.guild;
  if (guild) {
    const member = await guild.members.fetch(targetId).catch(() => null);
    if (member) {
      const gmRole = guild.roles.cache.find(r => r.name === 'Guild Member');
      const uninit = guild.roles.cache.find(r => r.name === 'uninitiated');
      if (gmRole && member.roles.cache.has(gmRole.id)) await member.roles.remove(gmRole).catch(() => {});
      if (uninit && !member.roles.cache.has(uninit.id)) await member.roles.add(uninit).catch(() => {});
    }
  }

  const targetMention = `<@${targetId}>`;
  const selfAction = actor.id === targetId;
  const note = selfAction ? '' : ` (retired by ${actor})`;

  await interaction.reply({
    content: `**${targetMention}**'s character: **${row.name}** has been retired ${note}. Their record has been removed from the database.`,
    embeds: [{
        title: `Retired Adventurer: ${row.name}`,
        fields: [
            { name: 'Level', value: row.level?.toString() ?? 'N/A', inline: true },
            { name: 'XP', value: row.xp?.toString() ?? 'N/A', inline: true },
            { name: 'GP', value: row.cp !== undefined ? (row.cp / 100).toFixed(2) : 'N/A', inline: true },
            { name: 'GP', value: row.tp?.toString() ?? 'N/A', inline: true },
        ],
        footer: { text: 'Fair winds and following seas, adventurer! Please store your character sheet safely.' },
        color: 0xFF0000,
    }]
  });
}

