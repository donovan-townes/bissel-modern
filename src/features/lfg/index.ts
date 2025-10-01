// features/lfg/index.ts
import { register } from "../../core/feature-registry.js";
import type { GuildConfig } from "../../config/app.config.js";

register("lfg", (g: GuildConfig) => {
  const cfg = g.features.lfg;
  if (!cfg?.enabled) return null;

  return {
    key: "lfg",
    validate(guild) {
      if (!cfg.channels.board) throw new Error(`[config:${guild.name}] LFG requires channels.board`);
      if (!guild.roles.member?.id && !guild.roles.member?.name)
        throw new Error(`[config:${guild.name}] LFG requires 'member' role mapping`);
    },
    init(client, guild) {
        if (client) console.log("LFG feature initialized with client", client.user?.tag);
        console.log("Initiating LFG feature for guild", guild.name);
      // hook any startup tasks, cache channel/role IDs if you want
    },
    onMessage(msg) {
        // only respond to messages in the configured board channel
        if (msg.channel.id !== cfg.channels.board) return;
        console.log("LFG feature received a message:", msg.content);
      // handle text commands if you still support them
    },
    onInteraction(i) {
        console.log("LFG feature received an interaction:", i.id);
      // handle slash commands specific to LFG
    },
    dispose() { /* cleanup if needed */ 
        console.log("Disposing LFG feature");
    }
  };
});
