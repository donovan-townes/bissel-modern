import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { getDb } from '../db/index.js'; // however you expose it
import pkg from '../../package.json' assert { type: 'json' };

export const data = new SlashCommandBuilder()
  .setName('health')
  .setDescription('Show bot health/uptime and basic checks')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild); // optional: restrict

export async function execute(interaction: ChatInputCommandInteraction) {
  const startedAt = interaction.client.readyTimestamp ?? Date.now();
  const uptimeMs = Date.now() - startedAt;
  const ping = Math.round(interaction.client.ws.ping);

  // DB probe (non-destructive, fast)
  const db = getDb();

  let dbStatus = 'skipped';
  try {
    await db.get('SELECT 1'); // or a tiny “SELECT count(*) FROM charlog” if exists
    dbStatus = 'ok';
  } catch (e) {
    dbStatus = 'error';
  }

  await interaction.reply({
    ephemeral: true, // avoid channel noise
    content:
      [
        `**BISSELL — /health**`,
        `• Uptime: ${ms(uptimeMs)}`,
        `• WS Ping: ${ping} ms`,
        `• DB: ${dbStatus}`,
        `• Version: ${pkg.version ?? 'dev'} (${process.env.COMMIT_SHA?.slice(0,7) ?? 'local'})`,
        `• Env: ${process.env.NODE_ENV ?? 'dev'}`,
        `• Guild: ${interaction.guild?.name ?? 'DM'} (${interaction.guildId ?? 'n/a'})`,
      ].join('\n'),
  });
}

function ms(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}
