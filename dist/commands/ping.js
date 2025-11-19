"use strict";
const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Checks latency'),
    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        await interaction.editReply(`Bot latency is ${latency}ms;\nApi latency is ${interaction.client.ws.ping}ms`);
    },
};
