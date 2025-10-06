// src/commands/lfg.ts
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  userMention,
} from "discord.js";

import { CONFIG } from "../config/resolved.js";
import { getDb } from "../db/index.js";

import {
  getLfgEntry,
  upsertLfgEntry,
  deleteLfgEntry,
  listAllLfg,
  purgeLfgBefore,
} from "../db/lfg.js";
import {
  autoTierForLevelFromXP,
  buildLfgEmbed,
  aggregateList,
  setTier,
  clearAll,
  anyTierOn,
  type LfgEntry,
  type LfgTier,
  ORDER as LFG_ORDER,
} from "../domain/lfg.js";
import { getGuildState, setGuildState } from "../domain/guildState.js";
import { levelForXP } from "../domain/xp.js";

/* ──────────────────────────────────────────────────────────────────────────────
  CONFIG / PERMS
────────────────────────────────────────────────────────────────────────────── */
const CFG = CONFIG.guild!.config;
const ROLES = CFG.roles;
const LFG_FEATURE = CFG.features?.lfg;
const LFG_BASE_ROLE_ID = LFG_FEATURE?.roles?.lfg;
const LFG_TIER_ROLE_IDS: Record<LfgTier, string | undefined> = {
  low: LFG_FEATURE?.tiers?.low,
  mid: LFG_FEATURE?.tiers?.mid,
  high: LFG_FEATURE?.tiers?.high,
  epic: LFG_FEATURE?.tiers?.epic,
  pbp: LFG_FEATURE?.tiers?.pbp,
};
const LFG_BOARD_CHANNEL_ID = LFG_FEATURE?.channels?.board;

const PERMS = {
  // who can toggle/add/remove for themselves: everyone (we’ll only gate purge & post)
  postBoard: [ROLES.moderator.id, ROLES.admin.id],
  purge: [ROLES.moderator.id, ROLES.admin.id],
};

function hasAnyRole(member: GuildMember | null, allowed: string[]) {
  if (!member || !allowed?.length) return false;
  const have = new Set(member.roles.cache.map((r) => r.id));
  return allowed.some((rid) => have.has(rid));
}
function isAdmin(member: GuildMember | null) {
  try {
    return !!member?.permissions?.has?.(PermissionFlagsBits.Administrator);
  } catch {
    return false;
  }
}

/* ──────────────────────────────────────────────────────────────────────────────
  DB HELPERS (charlog read)
────────────────────────────────────────────────────────────────────────────── */
async function getCharlogXPName(userId: string): Promise<{ xp: number; name: string } | null> {
  const db = await getDb();
  const row = await db.get<{ xp: number; name: string }>(
    `SELECT xp, name FROM charlog WHERE userId = ?`,
    userId
  );
  return row ?? null;
}

/* ──────────────────────────────────────────────────────────────────────────────
  ROLE SYNC
────────────────────────────────────────────────────────────────────────────── */
async function addRoleById(member: GuildMember, roleId?: string | null) {
  if (!roleId) return;
  if (member.roles.cache.has(roleId)) return;
  await member.roles.add(roleId).catch(() => {});
}
async function removeRoleById(member: GuildMember, roleId?: string | null) {
  if (!roleId) return;
  if (!member.roles.cache.has(roleId)) return;
  await member.roles.remove(roleId).catch(() => {});
}

async function syncRolesFor(member: GuildMember, entry: LfgEntry) {
  // Base LFG role
  if (anyTierOn(entry)) {
    await addRoleById(member, LFG_BASE_ROLE_ID);
  } else {
    await removeRoleById(member, LFG_BASE_ROLE_ID);
  }
  // Tier roles
  const shouldHave: Array<[LfgTier, boolean]> = [
    ["low", !!entry.low],
    ["mid", !!entry.mid],
    ["high", !!entry.high],
    ["epic", !!entry.epic],
    ["pbp", !!entry.pbp],
  ];
  for (const [tier, on] of shouldHave) {
    const rid = LFG_TIER_ROLE_IDS[tier];
    if (on) await addRoleById(member, rid);
    else await removeRoleById(member, rid);
  }
}

/* ──────────────────────────────────────────────────────────────────────────────
  BOARD REFRESH
────────────────────────────────────────────────────────────────────────────── */
const BOARD_KEY = "lfg_board_message_id";

async function refreshBoard(ix: ChatInputCommandInteraction, reason?: string) {
  if (!ix.guild) return;
  const guildId = ix.guild.id;
  const entries = await listAllLfg(guildId);
  const embed = buildLfgEmbed(aggregateList(entries));

  // If no channel configured, just bail silently.
//   const boardChanId = LFG_BOARD_CHANNEL_ID;
  const developChanId = "1420807995893223496"; // temp: dev channel
  const boardChanId = developChanId;

  if (!boardChanId) return;

  // Try to edit the sticky message; else send new and store id.
  const chan = ix.guild.channels.cache.get(boardChanId);
  if (!chan || !("send" in chan)) return;

  const existingId = await getGuildState(guildId, BOARD_KEY);
  if (existingId) {
    try {
      // @ts-expect-error: text channel narrowing omitted
      const msg = await chan.messages.fetch(existingId);
      await msg.edit({ embeds: [embed] });
      return;
    } catch {
      // falls through to create new
    }
  }
  // @ts-expect-error: text channel narrowing omitted
  const sent = await chan.send({ embeds: [embed] });
  await setGuildState(guildId, BOARD_KEY, sent.id);
}

/* ──────────────────────────────────────────────────────────────────────────────
  UTILS
────────────────────────────────────────────────────────────────────────────── */
type TierChoice = "auto" | LfgTier | "all";

function parseTier(choice?: string | null): TierChoice | null {
  if (!choice) return "auto";
  const v = choice.toLowerCase();
  if (v === "auto" || v === "all") return v as TierChoice;
  if (["low", "mid", "high", "epic", "pbp"].includes(v)) return v as LfgTier;
  return null;
}

/* ──────────────────────────────────────────────────────────────────────────────
  SLASH COMMAND
────────────────────────────────────────────────────────────────────────────── */
export const data = new SlashCommandBuilder()
  .setName("lfg")
  .setDescription("Looking-For-Group controls (roles + board)")
  // toggle
  .addSubcommand((sc) =>
    sc
      .setName("toggle")
      .setDescription("Toggle LFG for a tier (auto=from level).")
      .addStringOption((o) =>
        o
          .setName("tier")
          .setDescription("Tier to toggle")
          .addChoices(
            { name: "Auto (from level)", value: "auto" },
            { name: "Low (2–4)", value: "low" },
            { name: "Mid (5–10)", value: "mid" },
            { name: "High (11–16)", value: "high" },
            { name: "Epic (17+)", value: "epic" },
            { name: "Play-by-Post", value: "pbp" },
          )
      )
  )
  // add
  .addSubcommand((sc) =>
    sc
      .setName("add")
      .setDescription("Add LFG for a tier (auto=from level).")
      .addStringOption((o) =>
        o
          .setName("tier")
          .setDescription("Tier to add")
          .addChoices(
            { name: "Auto (from level)", value: "auto" },
            { name: "Low (2–4)", value: "low" },
            { name: "Mid (5–10)", value: "mid" },
            { name: "High (11–16)", value: "high" },
            { name: "Epic (17+)", value: "epic" },
            { name: "Play-by-Post", value: "pbp" },
          )
      )
  )
  // remove
  .addSubcommand((sc) =>
    sc
      .setName("remove")
      .setDescription("Remove LFG for a tier, or remove all.")
      .addStringOption((o) =>
        o
          .setName("tier")
          .setDescription("Tier to remove (or 'all')")
          .addChoices(
            { name: "All tiers", value: "all" },
            { name: "Low (2–4)", value: "low" },
            { name: "Mid (5–10)", value: "mid" },
            { name: "High (11–16)", value: "high" },
            { name: "Epic (17+)", value: "epic" },
            { name: "Play-by-Post", value: "pbp" },
          )
          .setRequired(true)
      )
  )
  // status
  .addSubcommand((sc) =>
    sc.setName("status").setDescription("Show your LFG status and wait time.")
  )
  // list
  .addSubcommand((sc) =>
    sc
      .setName("list")
      .setDescription("Preview the LFG board; optionally post/update the sticky board.")
      .addBooleanOption((o) =>
        o.setName("post").setDescription("Post/update the sticky board (mods/admins)")
      )
  )
  // purge
  .addSubcommand((sc) =>
    sc
      .setName("purge")
      .setDescription("Remove LFG entries older than N days (mods/admins).")
      .addIntegerOption((o) =>
        o.setName("days").setDescription("Age in days").setRequired(true).setMinValue(1)
      )
      .addStringOption((o) =>
        o
          .setName("scope")
          .setDescription("Which entries to purge")
          .addChoices(
            { name: "All", value: "all" },
            { name: "Only Play-by-Post", value: "pbp" }
          )
      )
  )

export async function execute(ix: ChatInputCommandInteraction) {
  const sub = ix.options.getSubcommand() as "toggle" | "add" | "remove" | "status" | "list" | "purge";
  if (sub === "toggle") return handleToggle(ix);
  if (sub === "add") return handleAdd(ix);
  if (sub === "remove") return handleRemove(ix);
  if (sub === "status") return handleStatus(ix);
  if (sub === "list") return handleList(ix);
  if (sub === "purge") return handlePurge(ix);
}

/* ──────────────────────────────────────────────────────────────────────────────
  HANDLERS
────────────────────────────────────────────────────────────────────────────── */
async function ensureEntry(ix: ChatInputCommandInteraction): Promise<LfgEntry> {
  const guildId = ix.guild!.id;
  const userId = ix.user.id;
  const fallbackName = userMention(userId);
  const now = Date.now();

  const existing = await getLfgEntry(userId, guildId);
  if (existing) return existing;

  return {
    userId,
    guildId,
    name: fallbackName,
    startedAt: now,
    low: 0, mid: 0, high: 0, epic: 0, pbp: 0,
    updatedAt: now,
  };
}

async function resolveAutoTier(userId: string): Promise<Exclude<LfgTier, "pbp"> | null> {
  const row = await getCharlogXPName(userId);
  if (!row) return null;
  // We could use autoTierForLevelFromXP(row.xp), but that expects XP; do it here for clarity:
  const level = levelForXP(row.xp);
  if (level < 5) return "low";
  if (level < 11) return "mid";
  if (level < 17) return "high";
  return "epic";
}

async function handleToggle(ix: ChatInputCommandInteraction) {
  const tierChoice = parseTier(ix.options.getString("tier"));
  if (!tierChoice) return ix.reply({ ephemeral: true, content: "Unknown tier." });

  let entry = await ensureEntry(ix);
  const member = await ix.guild!.members.fetch(ix.user.id);

  // Determine target tier
  let tier: LfgTier;
  if (tierChoice === "auto") {
    const auto = await resolveAutoTier(ix.user.id);
    if (!auto) {
      return ix.reply({
        ephemeral: true,
        content: "Could not determine your level for auto-tier. Have you run `/initiate` yet?",
      });
    }
    tier = auto;
  } else if (tierChoice === "all") {
    return ix.reply({ ephemeral: true, content: "Use `/lfg remove tier:all` to clear all." });
  } else {
    tier = tierChoice as LfgTier;
  }

  // Toggle that tier
  const currentlyOn = !!entry[tier];
  entry = setTier(entry, tier, !currentlyOn, Date.now());
  await upsertLfgEntry(entry);
  await syncRolesFor(member, entry);
  await refreshBoard(ix);

  return ix.reply({
    ephemeral: true,
    content: `${currentlyOn ? "Removed" : "Added"} **${tier.toUpperCase()}**. You are now LFG in: ${LFG_ORDER.filter(t => (entry as any)[t]).map(t => `\`${t}\``).join(", ") || "none"}.`,
  });
}

async function handleAdd(ix: ChatInputCommandInteraction) {
  const tierChoice = parseTier(ix.options.getString("tier"));
  if (!tierChoice) return ix.reply({ ephemeral: true, content: "Unknown tier." });

  let entry = await ensureEntry(ix);
  const member = await ix.guild!.members.fetch(ix.user.id);

  let tier: LfgTier;
  if (tierChoice === "auto") {
    const auto = await resolveAutoTier(ix.user.id);
    if (!auto) {
      return ix.reply({ ephemeral: true, content: "Could not determine your level. Have you run `/initiate` yet?" });
    }
    tier = auto;
  } else if (tierChoice === "all") {
    return ix.reply({ ephemeral: true, content: "Use `/lfg remove tier:all` to clear all." });
  } else {
    tier = tierChoice as LfgTier;
  }

  if (entry[tier]) {
    return ix.reply({ ephemeral: true, content: `You are already LFG in **${tier}**.` });
  }

  entry = setTier(entry, tier, true, Date.now());
  await upsertLfgEntry(entry);
  await syncRolesFor(member, entry);
  await refreshBoard(ix);

  return ix.reply({ ephemeral: true, content: `Added **${tier}**. ✅` });
}

async function handleRemove(ix: ChatInputCommandInteraction) {
  const tierChoice = parseTier(ix.options.getString("tier"));
  if (!tierChoice) return ix.reply({ ephemeral: true, content: "Unknown tier." });

  let entry = await getLfgEntry(ix.user.id, ix.guild!.id);
  if (!entry) return ix.reply({ ephemeral: true, content: "You are not on the LFG board." });

  const member = await ix.guild!.members.fetch(ix.user.id);

  if (tierChoice === "all") {
    entry = clearAll(entry, Date.now());
    await upsertLfgEntry(entry);
    await syncRolesFor(member, entry);
    // if truly nothing left, remove entry entirely
    if (!anyTierOn(entry)) await deleteLfgEntry(ix.user.id);
    await refreshBoard(ix);
    return ix.reply({ ephemeral: true, content: "Removed all tiers. ❌" });
  }

  const tier = tierChoice as LfgTier;
  if (!entry[tier]) {
    return ix.reply({ ephemeral: true, content: `You are not LFG in **${tier}**.` });
  }

  entry = setTier(entry, tier, false, Date.now());
  await upsertLfgEntry(entry);
  await syncRolesFor(member, entry);
  if (!anyTierOn(entry)) await deleteLfgEntry(ix.user.id);
  await refreshBoard(ix);

  return ix.reply({ ephemeral: true, content: `Removed **${tier}**.` });
}

async function handleStatus(ix: ChatInputCommandInteraction) {
  const entry = await getLfgEntry(ix.user.id, ix.guild!.id);
  if (!entry || !anyTierOn(entry)) {
    return ix.reply({ ephemeral: true, content: "You are not currently on the LFG board." });
  }
  const ageDays = Math.max(0, Math.floor((Date.now() - entry.startedAt) / (24 * 60 * 60 * 1000)));
  const tiers = LFG_ORDER.filter((t) => (entry as any)[t]);
  const embed = new EmbedBuilder()
    .setTitle("Your LFG status")
    .addFields(
      { name: "Tiers", value: tiers.map((t) => `\`${t}\``).join(", ") || "—", inline: true },
      { name: "Waiting", value: ageDays ? `${ageDays} day${ageDays > 1 ? "s" : ""}` : "Less than a day", inline: true }
    )
    .setColor(0x4ea8de);

  return ix.reply({ ephemeral: true, embeds: [embed] });
}

async function handleList(ix: ChatInputCommandInteraction) {
  const post = ix.options.getBoolean("post") ?? false;
  const entries = await listAllLfg(ix.guild!.id);
  const embed = buildLfgEmbed(aggregateList(entries));

  // Always show a preview ephemerally
  await ix.reply({ ephemeral: true, embeds: [embed] });

  if (!post) return;

  // Gate posting to mods/admins
  const member = ix.member as GuildMember | null;
  const allowed = hasAnyRole(member, PERMS.postBoard) || isAdmin(member);
  if (!allowed) return;

  await refreshBoard(ix, "manual-post");
}

async function handlePurge(ix: ChatInputCommandInteraction) {
  const days = ix.options.getInteger("days", true);
  const scope = (ix.options.getString("scope") as "all" | "pbp") ?? "all";

  const member = ix.member as GuildMember | null;
  const allowed = hasAnyRole(member, PERMS.purge) || isAdmin(member);
  if (!allowed) {
    return ix.reply({ ephemeral: true, content: "You don’t have permission to use this." });
  }

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const removedIds = await purgeLfgBefore(ix.guild!.id, cutoff, scope);

  // Try to remove roles for those users (best effort)
  for (const uid of removedIds) {
    try {
      const m = await ix.guild!.members.fetch(uid);
      // remove base + all tier roles
      await removeRoleById(m, LFG_BASE_ROLE_ID);
      for (const t of LFG_ORDER) await removeRoleById(m, LFG_TIER_ROLE_IDS[t]);
    } catch {
      // ignore
    }
  }

  await refreshBoard(ix, "purge");
  await ix.reply({
    ephemeral: true,
    content: removedIds.length
      ? `Purged **${removedIds.length}** LFG entr${removedIds.length > 1 ? "ies" : "y"} older than ${days} day(s) (${scope}).`
      : `No entries older than ${days} day(s) (${scope}).`,
  });
}

export default { data, execute };
