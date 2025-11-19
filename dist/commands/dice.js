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
const RNG = __importStar(require("../utils/rng"));
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('dice')
        .setDescription('Roll a dice')
        .addIntegerOption(option => option.setName('minimum')
        .setDescription('Minimum value')
        .setRequired(false))
        .addIntegerOption(option => option.setName('maximum')
        .setDescription('Maximum value')
        .setRequired(false)),
    async execute(interaction) {
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
