import 'dotenv/config';
import {  DEFAULT_CONFIG } from './app.config.js';
import { z } from 'zod';

const Env = z.object({ 
    DISCORD_TOKEN: z.string().min(1, { message: "DISCORD_TOKEN is required" }),
    DB_FILE: z.string().default("./data/remnant.sqlite"),
    GUILD_FUND_ID: z.string().default("sys:fund:remnant"),
    GUILD_ID: z.string().min(1, { message: "GUILD_ID is required" }),
    APP_ID: z.string().min(1, { message: "APP_ID is required" }),
    DEV_GUILD_ID: z.string().optional(),
})

const env = Env.parse(process.env);

export const CONFIG = {
    ...DEFAULT_CONFIG,
    secrets: {
        token: env.DISCORD_TOKEN,
    },
    db: {
        file: env.DB_FILE,
    },
    system: {
        guildId: env.GUILD_ID,
        appId: env.APP_ID,
        fundId: env.GUILD_FUND_ID,
        devGuildId: env.DEV_GUILD_ID,
    }
} as const;