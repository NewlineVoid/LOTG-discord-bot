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

import * as currency from '../utils/currency';

const listOfPathways = [
    "Seer", "Marauder", "Apprentice", "Spectator", "Bard", "Sailor", "Reader", "Secrets Suppliant", "Sleepless",
    "Corpse Collector", "Warrior", "Assassin", "Hunter", "Mystery Pryer", "Savant", "Monster", "Planter",
    "Apothecary", "Criminal", "Prisoner", "Lawyer", "Arbiter"
];


const isDisabled = false;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unsavedcreatecharacter')
        .setDescription('Creates a new (unsaved) character for the user')
        .addStringOption(option=>option.setName("name").setDescription("name of the character").setRequired(true)),
    async execute(interaction: any) {
        if (!process.env.OWNER_ID?.includes(interaction.user.id) && isDisabled) {
            interaction.reply({ content: 'disabled' });
            return;
        }
        if (interaction.channel.id != 1439523946796945521) {
            interaction.reply({ content: 'You may only use this inside of <#1439523946796945521>' })
            return
        }

        const userId = interaction.user.id;
        // let adminpathway = interaction.options.getNumber('pathway') ?? null;
        // let adminseq = interaction.options.getNumber('sequence') ?? null;
        // if ((adminpathway||adminseq) && userId != process.env.OWNER_ID) {
        //     interaction.editReply("Admin only");
        //     return
        // }
        
        const userData = Data.getUserData(userId);

        const name = interaction.options.getString('name');
        const imageUrl = null;

        const familyStatus = RNG.weightedChoice([
            { item: 'Lower Class', weight: 11.9875 },
            { item: 'Middle Class', weight: 75.5 },
            { item: 'Tycoon', weight: 7.5 },
            { item: 'Noblility', weight: 3 },
            { item: 'Angel', weight: 0.0125 },
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

        const minSeqStat: Record<number, number> = {
            10: 10,
            9: 20,
            8: 30,
            7: 45,
            6: 55,
            5: 75,
            4: 100,
            3: 125,
            2: 175,
            1: 250,
            0: 300
        }
        const maxSeqStat: Record<number, number> = {
            10: 30,
            9: 40,
            8: 50,
            7: 70,
            6: 80,
            5: 100,
            4: 150,
            3: 175,
            2: 250,
            1: 325,
            0: 500
        }
        let balanceInPence;
        if (familyStatus == "Lower Class") {
            balanceInPence = RNG.roll(4800, 14400);
        } else if (familyStatus == "Middle Class") {
            balanceInPence = RNG.roll(27500, 57500);
        } else if (familyStatus == "Tycoon") {
            balanceInPence = RNG.roll(75000, 175000);
        } else if (familyStatus == "Noblility") {
            balanceInPence = RNG.roll(275000, 17512500);
        } else if (familyStatus == "Angel") {
            balanceInPence = RNG.roll(17512500, 75012500);
        } else {
            balanceInPence = RNG.roll(27500, 57500);
        }
        const {pounds, soli, pence} = currency.convertFromPence(balanceInPence);

        const locationContinent = RNG.weightedChoice([
            { item: 'Nothern', weight: 75 },
            { item: 'Southern', weight: 25 }
        ]);
        let location;
        let listOfLocations;
        if (locationContinent === 'Nothern') {
            listOfLocations = ['St. Millom', 'Constant', 'Bayman', 'Stoen City', 'Trier', 'Mona Town', 'Lenmud Town', 'Tingen', 'Backlund', 'Elena Town', 'Feynapotter City', 'Seville City'];
        } else {
            listOfLocations = ['Kolain', 'Konotop', 'Cookawa', 'Ttniks', 'Alethe City', 'Bayam'];
        }
        location = listOfLocations[RNG.roll(0, listOfLocations.length - 1)];
        

        const charId = uuidv4();
        const seqKey = sequence ?? 10;
        const newCharacter = {
            id: charId,
            ImageUrl: imageUrl || null,
            OwnerId: userId,
            Name: name,
            FamilyStatus: familyStatus,
            Age: age,
            Sequence: sequence,
            currentLocation: location,
            Pathway: pathway,
            Status: 'Alive',
            Balance: {
                pounds: pounds,
                soli: soli,
                pence: pence,
                balanceinpence: balanceInPence
            },
            CreatedAt: new Date().toISOString(),
            DeathTimestamp: null,
            Stats: {
                Health: 100,
                Stamina: 100,
                Hunger: 100,
                Thirst: 100,
                Lifespan: RNG.roll(minSeqStat[seqKey], maxSeqStat[seqKey]),
                Spirituality: RNG.roll(minSeqStat[seqKey], maxSeqStat[seqKey]),
                Luck: RNG.roll(minSeqStat[seqKey], maxSeqStat[seqKey]),
                Perception: RNG.roll(minSeqStat[seqKey], maxSeqStat[seqKey]),
                Agility: RNG.roll(minSeqStat[seqKey], maxSeqStat[seqKey]),
                Strength: RNG.roll(minSeqStat[seqKey], maxSeqStat[seqKey]),
                Intellect: RNG.roll(minSeqStat[seqKey], maxSeqStat[seqKey]),
                Charisma: RNG.roll(minSeqStat[seqKey], maxSeqStat[seqKey]),
                Digestion: 0,
                Sanity: 100,
                GlobalReputation: RNG.roll(-25, 25)
            },
            SpeakToggle: false,
            Inventory: [],
            Injuries: [],
            StatusEffects: [],
            Events: []
        };


        const statsToShow = ['Spirituality', 'Luck', 'Perception', 'Agility', 'Strength', 'Intellect', 'Charisma', 'GlobalReputation'] as const;
        type StatKey = typeof statsToShow[number];
        const statsText = statsToShow
            .map((stat: StatKey) => `${stat}: ${(newCharacter.Stats as Record<StatKey, number>)[stat]}`)
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
    },
};
