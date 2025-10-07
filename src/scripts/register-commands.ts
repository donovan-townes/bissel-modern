import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import path from 'node:path'
import fs from 'node:fs/promises'
import { pathToFileURL } from "node:url"

import { CONFIG } from "../config/resolved.js";

type CommandModule = {
    data?: SlashCommandBuilder;
};

const TOKEN = CONFIG.secrets.token;
const APP_ID = CONFIG.system.appId;
const DEV_GUILD_ID = CONFIG.system.devGuildId;

// if prod, use GUILD_ID instead
const GUILD_ID = CONFIG.system.guildId;

const CLEAR_GLOBAL = process.argv.includes("--clear-global")
const LIST = process.argv.includes("--list")
const PROD = process.argv.includes("--prod") || process.argv.includes("--production")

// guard: refuse to run if prod but no GUILD_ID
if (PROD && !GUILD_ID) {
    throw new Error("Refusing to run with --prod/--production without GUILD_ID set in env.")
}



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

async function loadCommandJSONs(): Promise<object[]> {
    const commandsDir = path.resolve("src/commands");
    const files = await findCommandFiles(commandsDir);
    const jsons: object[] = [];

    for (const f of files) {
        const modUrl = pathToFileURL(f).href; // works with tsx
        const mod: CommandModule = await import(modUrl);
        if (!mod.data) continue;
        jsons.push(mod.data.toJSON());
    }
    return jsons;
}

async function main() {
    if (!TOKEN || !APP_ID) {
        throw new Error("Missing DISCORD_TOKEN or APP_ID in env.")
    }

    const body = await loadCommandJSONs();
    if (body.length === 0 ) {
        console.warn("No commands found in src/commands")
        return
    }
    const rest = new REST({ version: "10"}).setToken(TOKEN)

    async function list() {
        const global = await rest.get(Routes.applicationCommands(APP_ID!)) as { name: string }[];
        console.log("Global commands: ", global.map(c => c.name))
    }

    if (PROD) {
        if (!GUILD_ID) {
            throw new Error("GUILD_ID not set. Refusing to deploy globally. Set GUILD_ID or pass --clear-global/--list.");
        }
        console.log(`Upserting ${body.length} commands to guild ${GUILD_ID}…`);
        await rest.put(Routes.applicationGuildCommands(APP_ID, GUILD_ID), { body });
        console.log("✅ Guild commands updated (instant).");
        return
    } else if (DEV_GUILD_ID) {
    
        console.log(`Upserting ${body.length} commands to dev guild ${DEV_GUILD_ID}…`);
        await rest.put(Routes.applicationGuildCommands(APP_ID, DEV_GUILD_ID), { body });
        console.log("✅ Guild commands updated (instant).");
    } 
    
    else {
        // HARD GUARD: refuse accidental global deploys
        throw new Error("DEV_GUILD_ID not set. Refusing to deploy globally. Set DEV_GUILD_ID or pass --clear-global/--list.");
    }


    if (LIST) {
        await list();
        return;
    }

    if (CLEAR_GLOBAL) {
        console.log("Clearing ALL GLOBAL commands...");
        await rest.put(Routes.applicationCommands(APP_ID), { body: [] });
        console.log("✅ Global commands have been cleared (UI may cache for a bit).")
    }

}

main().catch((e) => {
    console.error("❌ Failed to register commands: ", e)
    process.exit(1);
})
