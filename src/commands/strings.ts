import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { t } from "../lib/i18n.js"

export const data = new SlashCommandBuilder()
    .setName("strings")
    .setDescription("Show i18n smoke values");

export async function execute(interaction: ChatInputCommandInteraction,) {
    const lines = [
        t("errors.invalid.random"),
        t("errors.permission.guild_member_only"),
        t("lfg.added", { user: interaction.user.toString(), tierLabel: "Low Tier" })
    ];

    await interaction.reply({ content: lines.join("\n"), flags: MessageFlags.Ephemeral })

}