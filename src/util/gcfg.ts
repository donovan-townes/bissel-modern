import config from '../config.json' with {type: 'json' };

export const gcfg = (guildId: number) => {
    const g = config.guilds[guildId];
    if (!g) throw new Error(`Missing config for guild ${guildId}`);
    return g;
