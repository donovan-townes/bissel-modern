import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';

import { CONFIG } from '../config/resolved.js';

const CFG = CONFIG.guild!.config;

const DM_ROLE_NAME = CFG.features?.lfg?.roles?.dmAvailable ;
export const data = new SlashCommandBuilder()
  .setName('dm')
  .setDescription('DM availability controls')
  .addSubcommand(sc => sc
    .setName('toggle')
    .setDescription('Toggle your “Available to DM” status'))
  .addSubcommand(sc => sc
    .setName('list')
    .setDescription('Show who is currently Available to DM'))
  // Match legacy: gate the toggle for GMs/Staff; list is for everyone.
  .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages);

// ---- Executor ---- 
export async function execute(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand(true);
  const guild = interaction.guild;
  if (!guild) return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });

  const role = guild.roles.cache.find(r => r.name === DM_ROLE_NAME);
  if (!role) {
    return interaction.reply({ content: `Role **${DM_ROLE_NAME}** was not found. Create it first.`, ephemeral: true });
  }

  if (sub === 'list') {
    // Open to everyone (override builder gate)
    const members = role.members.map(m => m.displayName || `<@${m.id}>`);
    const embed = new EmbedBuilder()
      .setColor(0x00bcd4)
      .setTitle('__Available DMs__')
      .setDescription(members.length ? members.join('\n') : 'Sorry, kiddo. Sometimes the internet is like real life and no one wants to DM.');
    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'toggle') {
    // Require staff/GM for toggle — mirrors old permission vibe.
    // If you want looser rules, remove this check.
    const member = await guild.members.fetch(interaction.user.id);
    const canToggle = member.permissions.has(PermissionFlagsBits.KickMembers)
      || member.roles.cache.some(r => ['GM', 'GMs', 'Staff'].includes(r.name));
    if (!canToggle) {
      return interaction.reply({ content: 'You are not allowed to toggle DM availability.', ephemeral: true });
    }

    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role);
      return interaction.reply({ content: `${interaction.user} is no longer available to DM.` });
    } else {
      await member.roles.add(role);
      return interaction.reply({ content: `${interaction.user} is available to DM.` });
    }
  }
}
