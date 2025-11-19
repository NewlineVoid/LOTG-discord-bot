import {
    SlashCommandBuilder
} from 'discord.js';
import * as Data from '../utils/data';
import { Ollama } from 'ollama';
import fs, { stat } from 'fs';
import path from 'path';
const ollama = new Ollama();

const isDisabled = true;

module.exports = {
    data: new SlashCommandBuilder()
                .setName('narrate')
                .setDescription('Autogenerates a narration')
                .addStringOption((option)=>option.setName('prompt').setDescription('any prompt you wish to use to guide the story').setRequired(false))
                .addUserOption((option)=>option.setName('player').setDescription('the player/character name').setRequired(false)),
    async execute(interaction: any) {

         if (interaction.user.id !== process.env.OWNER_ID && isDisabled) {
            interaction.reply({ content: 'disabled' });
            return;
        }

        const fetched = await (interaction.channel as any).messages.fetch({ limit: 100 });
        const previousMessages = fetched
            .filter((m: any) => !m.content.endsWith('")'))
            .sort((a: any, b: any) => a.createdTimestamp - b.createdTimestamp)
            .map((m: any) => `${m.author.username}: ${m.content}`);
        const marker = "\nWhat do you wish to do?\n";
        for (let i = 0; i < previousMessages.length; i++) {
            const idx = previousMessages[i].indexOf(marker);
            if (idx !== -1) {
                previousMessages[i] = previousMessages[i].slice(0, idx).trim();
            }
        }
        
        for (let i = previousMessages.length - 1; i >= 0; i--) {
            if (!previousMessages[i]) previousMessages.splice(i, 1);
        }

        if (previousMessages.length === 0) {
                await interaction.reply({ content: 'No recent messages found to narrate.', ephemeral: true });
                return;
        }

        const context = previousMessages.join('\n');
        
        await interaction.deferReply();

        const prompt = interaction.options.getString('prompt') || '';

        let fullResponse = '';
        const usr = interaction.options.getUser('player') ? interaction.options.getUser('player') : null;
        const plrName = usr ? Data.getLatestCharData(usr.id)["Name"] : interaction.user.username

        const sysMessage = fs.readFileSync(path.join(__dirname,'../utils/prompt.txt'), 'utf-8')

        let messages = [
            { role: 'system', content: sysMessage }
        ]
        if (prompt != '') { messages.push({ role: 'user', content: `the following is the prompt you must follow in order to guide the narrative: ${prompt}.\nHere is the list of messages:${context}`}) } else { messages.push({ role: 'user', content: `${context}`}) }

        try {
            const response = await ollama.chat({
                model: 'gemma3:4b-it-qat',
                messages: messages,
                stream: true
            });
            await interaction.editReply({ content: 'thinking...' })
            for await (const chunk of response) {
                //console.log(chunk)
                if (chunk && chunk.message && chunk.message.content) {
                    fullResponse += chunk.message.content;
                }

                if (fullResponse.length % 5 ==0) {
                    await interaction.editReply({ content: fullResponse || 'thinking...' });
                }   
            }
            await interaction.editReply({ content: fullResponse });
        } catch (error) {
            console.log(messages)
            console.warn(`[ERROR] Error generating Ollama response for Narration. \\nnMessages:\n ${messages.join('\n')}\nError: ${error}\n`)
            await interaction.editReply({ content: "Error generating narration: "+error })
        }
    }
}