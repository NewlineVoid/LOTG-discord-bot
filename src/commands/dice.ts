import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import * as RNG from '../utils/rng';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('Roll a dice')
        .addIntegerOption(option =>
            option.setName('minimum')
                .setDescription('Minimum value')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('maximum')
                .setDescription('Maximum value')
                .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const min = interaction.options.getInteger('minimum') ?? 1;
        const max = interaction.options.getInteger('maximum') ?? 6;
        if (min >= max) {
            await interaction.reply('Error: Minimum must be less than Maximum.');
            return;
        }
        const result = RNG.roll(min, max);
        await interaction.reply(`You rolled a ${result}`);
    }
};