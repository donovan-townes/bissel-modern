import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  Events,
  ModalSubmitInteraction,
} from 'discord.js';
import { getDb } from '../db/index.js';

export const data = new SlashCommandBuilder()
  .setName('retire')
  .setDescription('Retire your adventurer or another adventurer (Mod+ only).')
  .addUserOption(o =>
    o.setName('user')
     .setDescription('Target user to retire (Mod+ only).')
     .setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
  .setDMPermission(false);

// We’ll register an event listener in execute() for the modal submit.
export async function execute(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('user');
  const isSelf = !targetUser || targetUser.id === interaction.user.id;

  // Permission check for mod actions
  if (!isSelf) {
    const member = await interaction.guild?.members.fetch(interaction.user.id);
    const canManage =
      member?.permissions.has(PermissionFlagsBits.KickMembers) ||
      member?.roles.cache.some(r => ['GM', 'GMs', 'Staff'].includes(r.name));
    if (!canManage) {
      return interaction.reply({
        content: 'Only moderators or staff can retire another adventurer.',
        ephemeral: true,
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
    return interaction.reply({ content: 'Retirement cancelled — confirmation text must be RETIRE.', ephemeral: true });
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
      ephemeral: true,
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
    content: `**${targetMention}** has been retired${note}. Their record has been removed from the database.`,
  });
}
