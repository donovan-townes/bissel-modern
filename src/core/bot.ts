// core/bot.ts
import * as dotenv from 'dotenv';
dotenv.config();

import { Client, GatewayIntentBits, Events } from "discord.js";
import { DEFAULT_CONFIG } from "../config/app.config";
import { loadFeatures } from "./feature-registry";

// import features (admin, lfg, charlog, economy, etc)
import "../features/lfg";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
});

const guildId = DEFAULT_CONFIG.guild!.id;
const guildCfg = DEFAULT_CONFIG.guild!.config;

if (!guildCfg) {
  throw new Error(
    `[config] GuildId "${guildId}" not found. Please set up your guild ID in config in src/config/app.config.ts`
  );
}


const features = loadFeatures(guildCfg);

features.forEach(f => f.validate?.(guildCfg));

client.on(Events.MessageCreate, (msg) => {
  for (const f of features) f.onMessage?.(msg);
});

client.on(Events.InteractionCreate, (i) => {
  for (const f of features) f.onInteraction?.(i);
});

client.once(Events.ClientReady, () => {
  features.forEach(f => f.init?.(client, guildCfg));
  console.log(`Ready as ${client.user?.tag}. Loaded features: ${features.map(f=>f.key).join(", ")}`);
});

client.login(process.env.DISCORD_TOKEN);
