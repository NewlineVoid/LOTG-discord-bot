import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, InteractionCallback } from "discord.js";
import * as Data from '../utils/data';
const listOfPathways = [
    "Seer", "Marauder", "Apprentice", "Spectator", "Bard", "Sailor", "Reader", "Secrets Suppliant", "Sleepless",
    "Corpse Collector", "Warrior", "Assassin", "Hunter", "Mystery Pryer", "Savant", "Monster", "Planter",
    "Apothecary", "Criminal", "Prisoner", "Lawyer", "Arbiter"
];

module.exports = {
    data: new SlashCommandBuilder()
                .setName('createnpc')
                .setDescription('creates a new Non-playable-character'),
    async execute(interaction: any) {
        const modal = new ModalBuilder()
                            .setCustomId(`createnpc-${interaction.user.id}`)
                            .setTitle(`Create a new NPC`);
        const nameInput = new TextInputBuilder()
            .setCustomId('npc-name')
            .setLabel('Name')
            .setStyle(TextInputStyle.Short);

        const aliasInput = new TextInputBuilder()
            .setCustomId('npc-alias')
            .setLabel('Aliases (comma seperated value)')
            .setStyle(TextInputStyle.Paragraph);

        const avatarUrlInput = new TextInputBuilder()
            .setCustomId('npc-avatar-url')
            .setLabel('Avatar URL')
            .setStyle(TextInputStyle.Short);

        const sequenceInput = new TextInputBuilder()
            .setCustomId('npc-sequence')
            .setLabel('Sequence (0-9)')
            .setStyle(TextInputStyle.Short);

        const pathwayInput = new TextInputBuilder()
            .setCustomId('npc-pathway')
            .setLabel('Pathway')
            .setStyle(TextInputStyle.Short);

        const nameRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
        const aliasRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
            aliasInput.setRequired(false)
        );
        const avatarUrlRow = new ActionRowBuilder<TextInputBuilder>().addComponents(avatarUrlInput);
        const sequenceRow = new ActionRowBuilder<TextInputBuilder>().addComponents(sequenceInput);
        const pathwayRow = new ActionRowBuilder<TextInputBuilder>().addComponents(pathwayInput);

        modal.addComponents(nameRow, aliasRow, avatarUrlRow, sequenceRow, pathwayRow);

        await interaction.showModal(modal);
    },
    async handleModalSubmit(interaction: any) {
        const npcName = interaction.fields.getTextInputValue('npc-name');
        const npcAliases = interaction.fields.getTextInputValue('npc-alias');
        const npcAvatarUrl = interaction.fields.getTextInputValue('npc-avatar-url');
        const npcSequence = interaction.fields.getTextInputValue('npc-sequence');
        const npcPathway = interaction.fields.getTextInputValue('npc-pathway');
        const normalized = npcPathway.trim().toLowerCase();
        if (npcPathway && !listOfPathways.some(p => p.toLowerCase() === normalized)) {
            await interaction.reply({ content:"Invalid pathway", ephemeral: true });
            return;
        }
        
        const npcData = {
            name: npcName,
            aliases: npcAliases ? npcAliases.split(",").map((a: string) => a.trim()).filter(Boolean) : [],
            avatarUrl: npcAvatarUrl,
            sequence: npcSequence,
            pathway: npcPathway
        };

        await Data.createNPCData(npcName.toLowerCase(), npcData);
        await interaction.reply({ content: `NPC "${npcName}" created successfully!` });
    }
}