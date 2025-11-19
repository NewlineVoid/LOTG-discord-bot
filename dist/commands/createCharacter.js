"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const Data = __importStar(require("../utils/data"));
const RNG = __importStar(require("../utils/rng"));
const uuid_1 = require("uuid");
const listOfPathways = [
    "Seer", "Marauder", "Apprentice", "Spectator", "Bard", "Sailor", "Reader", "Secrets Suppliant", "Sleepless",
    "Corpse Collector", "Warrior", "Assassin", "Hunter", "Mystery Pryer", "Savant", "Monster", "Planter",
    "Apothecary", "Criminal", "Prisoner", "Lawyer", "Arbiter"
];
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('createcharacter')
        .setDescription('Creates a new character for the user'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const userData = Data.getUserData(userId);
        const aliveChar = userData.characters.find((c) => c.Status === 'Alive');
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
        const modal = new discord_js_1.ModalBuilder()
            .setCustomId(`createcharacter-${userId}`)
            .setTitle('Enter Character Name');
        const nameInput = new discord_js_1.TextInputBuilder()
            .setCustomId('characterName')
            .setLabel("Character Name")
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setMinLength(3)
            .setMaxLength(30)
            .setRequired(true);
        const imageInput = new discord_js_1.TextInputBuilder()
            .setCustomId('characterImage')
            .setLabel('Image URL (optional)')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setRequired(false);
        const firstActionRow = new discord_js_1.ActionRowBuilder().addComponents(nameInput);
        const secondActionRow = new discord_js_1.ActionRowBuilder().addComponents(imageInput);
        modal.addComponents(firstActionRow);
        modal.addComponents(secondActionRow);
        await interaction.showModal(modal);
    },
    async handleModalSubmit(interaction) {
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
        const pathway = sequence == null ? null : listOfPathways[RNG.roll(1, 22) - 1];
        let balanceInPence; // 1pound = 20 soli. 1 soli = 12 pence. 1 pound = 240 pence.
        switch (familyStatus) {
            case 'Middle Class':
                balanceInPence = RNG.roll(7500, 30000);
                break;
            case 'Tycoon':
                balanceInPence = RNG.roll(30000, 100000);
                break;
            case 'Noblility':
                balanceInPence = RNG.roll(5000000, 17500000);
                break;
            case 'Angel':
                balanceInPence = RNG.roll(52500000, 725000000);
                break;
            default:
                balanceInPence = RNG.roll(1000, 7500);
        }
        const pounds = balanceInPence % 240;
        const soli = Math.floor((balanceInPence % 240) / 12);
        const pence = balanceInPence % 12;
        const locationContinent = RNG.weightedChoice([
            { item: 'Nothern', weight: 75 },
            { item: 'Southern', weight: 25 }
        ]);
        let location;
        let listOfLocations;
        if (locationContinent === 'Nothern') {
            listOfLocations = ['St. Millom', 'Constant', 'Bayman', 'Stoen City', 'Trier', 'Mona Town', 'Lenmud Town', 'Tingen', 'Backlund', 'Elena Town', 'Feynapotter City', 'Seville City'];
        }
        else {
            listOfLocations = ['Kolain', 'Konotop', 'Cookawa', 'Ttniks', 'Alethe City', 'Bayam'];
        }
        location = listOfLocations[RNG.roll(0, listOfLocations.length - 1)];
        const charId = (0, uuid_1.v4)();
        let newCharacter = {
            id: charId,
            ImageUrl: imageUrl || null,
            OwnerId: userId,
            Name: name,
            Balance: { pounds: pounds, soli: soli, pence: pence },
            FamilyStatus: familyStatus,
            currentLocation: location,
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
        const statsToShow = ['Spirituality', 'Luck', 'Perception', 'Agility', 'Strength', 'Intellect', 'Charisma'];
        const statsText = statsToShow
            .map((stat) => `${stat}: ${newCharacter.Stats[stat]}`)
            .join('\n');
        await interaction.reply({
            content: `**Character Created!**\n` +
                `Name: **${newCharacter.Name}**\n` +
                `Family: **${newCharacter.FamilyStatus}**\n` +
                `Balance: **${pounds} pounds, ${soli} soli, ${pence} pence**\n` +
                `Age: **${newCharacter.Age}**\n` +
                `Sequence: **${newCharacter.Sequence}**${newCharacter.Pathway ? ` (Pathway ${newCharacter.Pathway})` : ''}\n\n` +
                `**Stats:**\n${statsText}`,
            ephemeral: false
        });
    }
};
