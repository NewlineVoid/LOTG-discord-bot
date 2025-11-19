"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const ollama_1 = require("ollama");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('narrate')
        .setDescription('Autogenerates a narration')
        .addStringOption((option) => option.setName('prompt').setDescription('any prompt you wish to use to guide the story').setRequired(false)),
    async execute(interaction) {
        const fetched = await interaction.channel.messages.fetch({ limit: 100 });
        const previousMessages = fetched
            .filter((m) => !m.content.endsWith('")'))
            .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
            .map((m) => `${m.author.username}: ${m.content}`);
        if (previousMessages.length === 0) {
            await interaction.reply({ content: 'No recent messages found to narrate.', ephemeral: true });
            return;
        }
        const context = previousMessages.join('\n');
        await interaction.deferReply();
        const prompt = interaction.options.getString('prompt') || '';
        let fullResponse = '';
        let messages = [
            { role: 'system', content: `You are "Lord Of The Goon", the narrator for a Lord Of The Mysteries inspired discord Dungeons And Dragons game. Your task is to narrate and provide options, as well as narrate in third-person, referring to the player(s) by their name and third person pronouns, instead of saying "you". For instance, if the player is exploring, you should provide the following options: ">Explore\n>Retreat\n>Battle (none)\n>Missions:\n\t(none)". If the player is in a fight, you should simply say what is relevant. Do not provide options if the player is in a fight, leave it open-ended. Here is a list of the past 50 messages: \n${context}\n\nThe current player is: ${interaction.user.username}.\nDo not say "Lord Of The Goon:" when generating your response.` }
        ];
        if (prompt != '') {
            messages.push({ role: 'user', content: `the following is the prompt you must follow in order to guide the narrative: ${prompt}` });
        }
        try {
            const ollama = new ollama_1.Ollama();
            const response = await ollama.chat({
                model: 'gemma3:4b',
                messages: messages,
                stream: true
            });
            for await (const chunk of response) {
                if (chunk && chunk.message && chunk.message.content) {
                    fullResponse += chunk.message.content;
                }
                if (fullResponse.length % 5 == 0) {
                    await interaction.editReply({ content: fullResponse || '...' });
                }
            }
            await interaction.editReply({ content: fullResponse });
        }
        catch (error) {
            console.log(messages);
            console.warn(`[ERROR] Error generating Ollama response for Narration. \\nnMessages:\n ${messages.join('\n')}\nError: ${error}\n`);
            await interaction.editReply({ content: "Error generating narration." });
        }
    }
};
