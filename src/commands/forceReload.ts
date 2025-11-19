import * as Data from '../utils/data';
import { SlashCommandBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

//random confirmation code
let confirmationCode = Math.random().toString(36).substring(2, 8);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forcereload')
        .setDescription('Force reloads the bot and caches'),
    async execute(interaction: any) {
        if (interaction.user.id !== process.env.OWNER_ID) {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
        }
        
        const confirmationModal = new ModalBuilder()
            .setCustomId('forcereload-confirmation')
            .setTitle('Confirm Force Reload');
        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
                .setCustomId('confirmationInput')
                .setLabel(`Type ${confirmationCode} to confirm`)
                .setStyle(TextInputStyle.Short)
                .setMinLength(6)
                .setMaxLength(6)
                .setRequired(true)
        );
        confirmationModal.addComponents(row);
        await interaction.showModal(confirmationModal);
    },

    async handleModalSubmit(interaction: any) {
        const userInput = interaction.fields.getTextInputValue('confirmationInput');
        if (userInput !== confirmationCode) {
            await interaction.reply({ content: 'Incorrect confirmation code. Force reload cancelled.', ephemeral: true });
            return;
        }
        Data.clearDataCache();
        confirmationCode = Math.random().toString(36).substring(2, 8);
        console.log(`[INFO] Force reload executed by user ${interaction.user.tag}`);
        await interaction.reply({ content: 'Force reload successful. Data caches cleared.', ephemeral: false });
    }
};