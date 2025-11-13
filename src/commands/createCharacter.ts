import {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    InteractionType
} from 'discord.js';
import * as Data from '../utils/data';
import * as RNG from '../utils/rng';
import { v4 as uuidv4 } from 'uuid';
const listOfPathways = [
    "Seer", "Marauder", "Apprentice", "Spectator", "Bard", "Sailor", "Reader", "Secrets Suppliant", "Sleepless",
    "Corpse Collector", "Warrior", "Assassin", "Hunter", "Mystery Pryer", "Savant", "Monster", "Planter",
    "Apothecary", "Criminal", "Prisoner", "Lawyer", "Arbiter"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createcharacter')
        .setDescription('Creates a new character for the user'),

    async execute(interaction: any) {
        const userId = interaction.user.id;
        const userData = Data.getUserData(userId);

        const aliveChar = userData.characters.find((c: any) => c.Status === 'Alive');
        if (aliveChar) {
            await interaction.reply({ content: 'You may only have one living character at a time.', ephemeral: true });
            return;
        }

        const latestChar = userData.characters[userData.characters.length - 1];
        if (latestChar && latestChar.Status === 'Dead') {
            const deathTime = new Date(latestChar.DeathTimestamp);
            const now = new Date();
            const hoursSinceDeath = (now.getTime() - deathTime.getTime()) / (1000 * 60 * 60);
            if (hoursSinceDeath < 24) {
                const hoursLeft = Math.ceil(24 - hoursSinceDeath);
                await interaction.reply({
                    content: `You must wait **${hoursLeft} hour(s)** before creating a new character.`,
                    ephemeral: true
                });
                return;
            }
        }

        const modal = new ModalBuilder()
            .setCustomId(`createcharacter-${userId}`)
            .setTitle('Enter Character Name');

        const nameInput = new TextInputBuilder()
            .setCustomId('characterName')
            .setLabel("Character Name")
            .setStyle(TextInputStyle.Short)
            .setMinLength(3)
            .setMaxLength(30)
            .setRequired(true);
        const imageInput = new TextInputBuilder()
            .setCustomId('characterImage')
            .setLabel('Image URL (optional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
        const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(imageInput);
        modal.addComponents(firstActionRow);
        modal.addComponents(secondActionRow);

        await interaction.showModal(modal);
    },

    async handleModalSubmit(interaction: any) {
        const userId = interaction.user.id;
        const userData = Data.getUserData(userId);

        const name = interaction.fields.getTextInputValue('characterName');
        const imageUrl = interaction.fields.getTextInputValue('characterImage');

        const familyStatus = RNG.weightedChoice([
            { item: 'Lower Class', weight: 5.95 },
            { item: 'Middle Class', weight: 85 },
            { item: 'Tycoon', weight: 5 },
            { item: 'Noblility', weight: 4 },
            { item: 'Angel', weight: 0.05 },
        ]);
        const age = RNG.roll(15, 35);
        const sequence = RNG.weightedChoice([
            { item: null, weight: 65 },
            { item: 9, weight: 18 },
            { item: 8, weight: 10 },
            { item: 7, weight: 6 },
            { item: 6, weight: 1 },
        ]);
        const pathway = sequence == null ? null : listOfPathways[RNG.roll(1,22) - 1];

        const charId = uuidv4();
        const newCharacter = {
            id: charId,
            ImageUrl: imageUrl || null,
            OwnerId: userId,
            Name: name,
            FamilyStatus: familyStatus,
            Age: age,
            Sequence: sequence,
            Pathway: pathway,
            Status: 'Alive',
            CreatedAt: new Date().toISOString(),
            DeathTimestamp: null,
            Stats: {
                Health: 100,
                Stamina: 100,
                Hunger: 100,
                Thirst: 100,
                Lifespan: RNG.roll(60, 90),
                Spirituality: RNG.roll(10, 30),
                Luck: RNG.roll(10, 30),
                Perception: RNG.roll(10, 30),
                Agility: RNG.roll(10, 30),
                Strength: RNG.roll(10, 30),
                Intellect: RNG.roll(10, 30),
                Charisma: RNG.roll(10, 30),
                Digestion: 0,
                Sanity: 100,
                GlobalReputation: 0
            },
            Inventory: [],
            Events: [],
        };

        userData.characters.push(newCharacter);
        Data.saveUserData(userId, userData);

        const statsToShow = ['Spirituality', 'Luck', 'Perception', 'Agility', 'Strength', 'Intellect', 'Charisma'] as const;
        type StatKey = typeof statsToShow[number];
        const statsText = statsToShow
            .map((stat: StatKey) => `${stat}: ${(newCharacter.Stats as Record<StatKey, number>)[stat]}`)
            .join('\n');

        await interaction.reply({
            content: `**Character Created!**\n` +
                    `Name: **${newCharacter.Name}**\n` +
                    `Family: **${newCharacter.FamilyStatus}**\n` +
                    `Age: **${newCharacter.Age}**\n` +
                    `Sequence: **${newCharacter.Sequence}**${newCharacter.Pathway ? ` (Pathway ${newCharacter.Pathway})` : ''}\n\n` +
                    `**Stats:**\n${statsText}`,
            ephemeral: false
        });
    }
};
