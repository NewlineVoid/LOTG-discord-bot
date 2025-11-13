import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs-extra';
import path from 'path';
import { rng } from '../utils/rng';
const dataFile = path.join(__dirname, '../database/characters.json');
export const data = new SlashCommandBuilder()
    .setName('create')
    .setDescription('Create a new character.');
export async function execute(interaction) {
    await interaction.deferReply();
    const userId = interaction.user.id;
    let characters = {};
    if (fs.existsSync(dataFile))
        characters = fs.readJSONSync(dataFile);
    if (characters[userId] && characters[userId].alive) {
        return interaction.editReply('You already have a living character!');
    }
    const statusRoll = rng(1, 100);
    let family;
    if (statusRoll <= 5)
        family = 'Lower Class';
    else if (statusRoll <= 90)
        family = 'Middle Class';
    else if (statusRoll <= 95)
        family = 'Tycoon/Rich';
    else if (statusRoll <= 99)
        family = 'Baron/Earl';
    else {
        const angelFamilies = ['Seraphim', 'Cherubim', 'Virtues'];
        family = `Angel Family (${angelFamilies[rng(0, angelFamilies.length - 1)]})`;
    }
    const age = rng(15, 35);
    const seqRoll = rng(1, 100);
    let sequence;
    if (seqRoll <= 65)
        sequence = 'Peasant';
    else if (seqRoll <= 83)
        sequence = 'Sequence 9';
    else if (seqRoll <= 93)
        sequence = 'Sequence 8';
    else if (seqRoll <= 99)
        sequence = 'Sequence 7';
    else
        sequence = 'Sequence 6';
    let pathway = null;
    if (sequence !== 'Peasant') {
        pathway = rng(1, 22);
    }
    const locRoll = rng(1, 100);
    let location;
    if (locRoll <= 75) {
        const northern = ['North City', 'Ice Vale', 'Frost Hollow'];
        location = northern[rng(0, northern.length - 1)];
    }
    else {
        const southern = ['Sunport', 'Sandmere', 'Verdant Fields'];
        location = southern[rng(0, southern.length - 1)];
    }
    const name = interaction.user.username;
    const charData = {
        name,
        family,
        age,
        sequence,
        pathway,
        location,
        alive: true,
        createdAt: Date.now(),
        stats: {
            health: 100,
            stamina: 100,
            hunger: 100,
            thirst: 100,
            strength: rng(1, 10),
            agility: rng(1, 10),
            intellect: rng(1, 10),
            charisma: rng(1, 10),
            perception: rng(1, 10),
            luck: rng(1, 10),
            spirituality: rng(1, 10),
            digestion: 0,
            sanity: 100,
            globalReputation: 0
        },
        inventory: [],
        currency: { pence: 0, soli: 0, pounds: 0 }
    };
    // Save character
    characters[userId] = charData;
    fs.ensureFileSync(dataFile);
    fs.writeJSONSync(dataFile, characters, { spaces: 2 });
    return interaction.editReply(`Character **${name}** created!\nFamily: ${family}\nSequence: ${sequence}${pathway ? `\nPathway: ${pathway}` : ''}\nLocation: ${location}\nAge: ${age}`);
}
