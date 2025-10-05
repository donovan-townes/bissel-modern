import { CONFIG } from "./resolved.js";
import {
  ChatInputCommandInteraction,
  GuildMember,
  PermissionFlagsBits,
} from "discord.js";

const SUPERUSER_IDS = [
  process.env.SUPERUSER_IDS?.split(",").map((s) => s.trim()) ?? [],
].flat();

const TEST_GUILD_IDS = [
  process.env.TEST_GUILD_IDS?.split(",").map((s) => s.trim()) ?? [],
].flat();

export function memberRoleIds(member: GuildMember | any | null): string[] {
  if (!member) return [];
  // Full GuildMember
  if (member.roles?.cache) return [...member.roles.cache.keys()];
  // APIInteractionGuildMember
  if (Array.isArray(member.roles)) return member.roles as string[];
  return [];
}

export function hasAnyRole(
  member: GuildMember | any | null,
  allowed: string[]
) {
  if (!allowed?.length) return false;
  const have = new Set(memberRoleIds(member));
  return allowed.some((rid) => have.has(rid));
}

export function isAdmin(member: GuildMember | any | null): boolean {
  try {
    return !!(
      member &&
      "permissions" in member &&
      member.permissions?.has?.(PermissionFlagsBits.Administrator)
    );
  } catch {
    return false;
  }
}

export function isDevBypass(ix: ChatInputCommandInteraction) {
  const isSuper = SUPERUSER_IDS.includes(ix.user.id);
  if (!isSuper) return false;
  // Only bypass when not in prod OR specifically in a test guild
  const notProd = CONFIG.env !== "prod";
  const inTestGuild = ix.guildId ? TEST_GUILD_IDS.includes(ix.guildId) : false;
  return notProd || inTestGuild;
}

export function canBypass(
  ix: ChatInputCommandInteraction,
  member: GuildMember | any | null,
  allowed: string[]
) {
  return hasAnyRole(member, allowed) || isAdmin(member) || isDevBypass(ix);
}

export function validateCommandPermissions(
  ix: ChatInputCommandInteraction, 
  member: GuildMember | null, 
  PERMS: Record<string, string[]>
): boolean {
  const sub = ix.options.getSubcommand();
  
  // Special handling for "show" subcommand - everyone can use it unless explicitly restricted
  if (sub === "show") {
    const showPerms = PERMS.show || [];
    const canShow = showPerms.length === 0 || hasAnyRole(member, showPerms) || isAdmin(member) || isDevBypass(ix);
    if (!canShow) {
      ix.reply({ ephemeral: true, content: "You don't have permission to use this." });
      return false;
    }
    return true;
  }
  
  // For all other subcommands, check specific permissions
  const allowedRoles = PERMS[sub as keyof typeof PERMS] || [];
  const hasPermission = hasAnyRole(member, allowedRoles) || isAdmin(member) || isDevBypass(ix);
  
  if (!hasPermission) {
    ix.reply({ ephemeral: true, content: "You don't have permission to use this." });
    return false;
  }
  
  return true;
}
