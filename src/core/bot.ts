// core/bot.ts
import { 
  Client, 
  GatewayIntentBits, 
  Events,
  SlashCommandBuilder,
  ChatInputCommandInteraction, 
  MessageFlags
  } from "discord.js";

import fs from 'node:fs/promises'
import path from 'node:path'
import {  pathToFileURL } from "node:url"


import { CONFIG } from '../config/resolved.js';
import { initDb } from '../db/index.js';

import * as retire from '../commands/retire.js';


// commmand-registry
type CommandModule = {
  data?: SlashCommandBuilder;
  execute?: (i: ChatInputCommandInteraction) => Promise<void>;
}

const commands = new Map<string, CommandModule>();


async function findCommandFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await findCommandFiles(p)));
    else if (e.isFile() && /\.ts$/.test(e.name) && !/\.d\.ts$/.test(e.name)) out.push(p);
  }
  return out;
}

async function loadCommands() {
  const commandsDir = path.resolve("src/commands");
  const files = await findCommandFiles(commandsDir);
  console.log("Command files found:", files.length, files);

  for (const f of files) {
    try {
      const mod: CommandModule = await import(pathToFileURL(f).href);
      if (!mod?.data?.name) {
        console.warn(`⚠️  Skipping ${f}: no export 'data' with a name`);
        continue;
      }
      commands.set(mod.data.name, mod);
    } catch (err) {
      console.error(`❌ Failed to import ${f}:`, err);
    }
  }
  console.log(`Loaded ${commands.size} slash commands.`);
}


const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
});

const guildId = CONFIG.guild!.id;
const guildCfg = CONFIG.guild!.config;

if (!guildCfg) {
  throw new Error(
    `[config] GuildId "${guildId}" not found. Please set up your guild ID in config in src/config/app.config.ts`
  );
}

client.on(Events.InteractionCreate, async (interaction) => {
  // slash command handler
  if (interaction.isChatInputCommand()) {
    const mod = commands.get(interaction.commandName);
    if (!mod?.execute) {
      const msg = "Command not found."; // or i can create a custom in errors.commands
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: msg, flags: MessageFlags.Ephemeral })
      } else {
        await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral })
      }
      return // rather not deal with it past this point.
    }
    try {
      await mod.execute(interaction)
    } catch (err) {
      console.error(`[/${interaction.commandName}]`, err);
      const msg = "Something broke" // t(generic error) could work here
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: msg, flags: MessageFlags.Ephemeral })
      } else {
        await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral })
      }      
    }
    return
  }

  if (interaction.isModalSubmit()) {
    //dynamically dispatch if you add more modals later.
    if (interaction.customId.startsWith('retire-confirm-')) {
      try {
        await retire.handleModal(interaction);
      } catch (err) {
        console.error('[Retire Modal]', err);
        const msg = "Something broke while processing the retirement.";
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: msg, flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
      }
    }
  }
});

client.once(Events.ClientReady, async () => {
  await loadCommands();
  await initDb();
  console.log(`Ready as ${client.user?.tag}. Guild: ${guildId} (${guildCfg.name})`);
});

client.login(CONFIG.secrets.token).catch(() => {
  console.error("❌ Failed to login to Discord. Please check your DISCORD_TOKEN.");
  process.exit(1);
});

// graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down...');
  await client.destroy();
  process.exit(0);
});

// on unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// on uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
  process.exit(1);
});

// on warnings
process.on('warning', (warning) => {
  console.warn('Warning:', warning);
});

