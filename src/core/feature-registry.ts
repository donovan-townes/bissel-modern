// src/core/feature-registry.ts
// This file manages the registration and retrieval of features within the bot.
// It ensures that features are properly initialized and accessible throughout the application.
import type { GuildConfig } from "../config/app.config";
import type {Client, Interaction, Message } from "discord.js";

export type Feature = {
    key: string,
    validate?(g:GuildConfig): void; // throws if not valid
    init?(client: Client, g:GuildConfig): void | Promise<void>; 
    onMessage?(msg: Message): void | Promise<void>;
    onInteraction?(interaction: Interaction): void | Promise<void>;
    dispose?(): void | Promise<void>;
}

export type FeatureFactory = (g: GuildConfig) => Feature | null;

export const registry: Record<string, FeatureFactory> = {};
export function register(key: string, factory: FeatureFactory) {
    if (registry[key]) throw new Error(`Feature with key ${key} is already registered.`);
    registry[key] = factory;
}

export function loadFeatures(g: GuildConfig) {
    return Object.entries(registry)
    .map(([key, make]) => make(g))
    .filter((f): f is Feature => !!f);
}

