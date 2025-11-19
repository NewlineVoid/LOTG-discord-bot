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
const { EmbedBuilder, SlashCommandBuilder, AddUserOption } = require('discord.js');
const Data = __importStar(require("../utils/data"));
module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Displays your currently active character profile')
        .addUserOption((option) => option.setName('user')
        .setDescription('The user whose profile you want to view')
        .setRequired(false)),
    async execute(interaction) {
        const userId = interaction.options.getUser('user') ? interaction.options.getUser('user').id : interaction.user.id;
        const userData = Data.getUserData(userId);
        if (!userData || userData.characters.length === 0) {
            await interaction.reply({
                content: `${interaction.options.getUser('user') ? interaction.options.getUser('user').username + ' has' : 'You have'} no characters. Use \`/createcharacter\` to create one.`,
                ephemeral: false
            });
            return;
        }
        const aliveChar = userData.characters.find((c) => c.Status === 'Alive');
        if (!aliveChar) {
            await interaction.reply({
                content: `${interaction.options.getUser('user') ? interaction.options.getUser('user').username + ' has' : 'You have'} no living characters. Use \`/createcharacter\` to create one.`,
                ephemeral: false
            });
            return;
        }
        const stats = aliveChar.Stats;
        const embed = new EmbedBuilder()
            .setColor(0x8888ff)
            .setTitle(`${aliveChar.Name} | ${interaction.options.getUser('user') ? interaction.options.getUser('user').username : interaction.user.username}`)
            .setThumbnail(aliveChar.ImageUrl || interaction.options.getUser('user')?.displayAvatarURL() || interaction.user.displayAvatarURL())
            .setDescription(`**Sequence:** ${aliveChar.Sequence}${aliveChar.Pathway ? ` (${aliveChar.Pathway})` : ''}\n` +
            `**Family:** ${aliveChar.FamilyStatus}\n` +
            `**Age:** ${aliveChar.Age}\n` +
            `**Status:** ${aliveChar.Status}\n` +
            `**Location:** ${aliveChar.currentLocation}\n` +
            `**Balance:** ${aliveChar.Balance.pounds} pounds, ${aliveChar.Balance.soli} soli, ${aliveChar.Balance.pence} pence\n`)
            .addFields({ name: 'Core Stats', value: `**Health:** ${stats.Health}\n` +
                `**Hunger:** ${stats.Hunger}\n` +
                `**Stamina:** ${stats.Stamina}\n` +
                `**Spirituality:** ${stats.Spirituality}\n` +
                `**Sanity:** ${stats.Sanity}\n` +
                `**Balance:** ${stats.GlobalReputation}`, inline: true
        }, { name: 'Attributes', value: `**Luck:** ${stats.Luck}\n` +
                `**Perception:** ${stats.Perception}\n` +
                `**Agility:** ${stats.Agility}\n` +
                `**Strength:** ${stats.Strength}\n` +
                `**Intellect:** ${stats.Intellect}\n` +
                `**Charisma:** ${stats.Charisma}`, inline: true
        }, { name: 'Injuries', value: aliveChar.Injuries?.length ? aliveChar.Injuries.join(', ') : 'None', inline: false }, { name: 'Status Effects', value: aliveChar.StatusEffects?.length ? aliveChar.StatusEffects.join(', ') : 'None', inline: false }, { name: 'Inventory', value: aliveChar.Inventory?.length ? aliveChar.Inventory.join(', ') : 'Empty', inline: false })
            .setFooter({ text: `Created at: ${new Date(aliveChar.CreatedAt).toLocaleString()}` });
        await interaction.reply({ embeds: [embed], ephemeral: false });
    }
};
