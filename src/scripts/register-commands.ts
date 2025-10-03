import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import path from 'node:path'
import fs from 'node:fs/promises'
import { pathToFileURL } from "node:url"

type CommandModule = {
    data?: SlashCommandBuilder;
};

const TOKEN = process.env.DISCORD_TOKEN;
const APP_ID = process.env.APP_ID;
const DEV_GUILD_ID = process.env.DEV_GUILD_ID;

const CLEAR_GLOBAL = process.argv.includes("--clear-global")
const LIST = process.argv.includes("--list")

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

async function loadCommandJSONs(): Promise<any[]> {
    const commandsDir = path.resolve("src/commands");
    const files = await findCommandFiles(commandsDir);
    const jsons: any[] = [];

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
        const global = await rest.get(Routes.applicationCommands(APP_ID!)) as any[];
        console.log("Global commands: ", global.map(c => c.name))
    }

    if (DEV_GUILD_ID) {
        console.log(`Upserting ${body.length} commands to guild ${DEV_GUILD_ID}…`);
        await rest.put(Routes.applicationGuildCommands(APP_ID, DEV_GUILD_ID), { body });
        console.log("✅ Guild commands updated (instant).");
    } else {
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
