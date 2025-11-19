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
const Data = __importStar(require("../utils/data"));
const discord_js_1 = require("discord.js");
//random confirmation code
let confirmationCode = Math.random().toString(36).substring(2, 8);
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('forcereload')
        .setDescription('Force reloads the bot and caches'),
    async execute(interaction) {
        if (interaction.user.id !== process.env.OWNER_ID) {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
        }
        const confirmationModal = new discord_js_1.ModalBuilder()
            .setCustomId('forcereload-confirmation')
            .setTitle('Confirm Force Reload');
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder()
            .setCustomId('confirmationInput')
            .setLabel(`Type ${confirmationCode} to confirm`)
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setMinLength(6)
            .setMaxLength(6)
            .setRequired(true));
        confirmationModal.addComponents(row);
        await interaction.showModal(confirmationModal);
    },
    async handleModalSubmit(interaction) {
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
