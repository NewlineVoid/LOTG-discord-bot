import { SlashCommandBuilder } from "discord.js";
import * as Data from '../utils/data';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('speaknpc')
        .setDescription('speaks as if you\'re a npc.')
        .addStringOption(option =>
            option
                .setName('character')
                .setDescription('the character you\'re speaking as')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('content')
                .setDescription('the content of the message')
                .setRequired(true)
        ),

    async execute(interaction: any) {
        await interaction.reply({ content: 'Processing...', ephemeral: true });

        const userId = interaction.user.id;
        const charData = Data.getNPCData(interaction.options.getString('character'));
        if (!charData) return interaction.editReply("No character found.");
        const content = interaction.options.getString('content');

        try {
            const channel = interaction.channel;
            const webhooks = await channel.fetchWebhooks();
            let oracle = webhooks.find((w: any) => w.name === "Oracle");

            if (!oracle) {
                const canManage = interaction.guild.members.me.permissions.has("ManageWebhooks");
                if (!canManage) return interaction.editReply("Missing Manage Webhooks permission.");

                oracle = await channel.createWebhook({ name: "Oracle" });
            }

            await oracle.send({
                content: content,
                username: charData.name,
                avatarURL: charData.avatarUrl
            });

            await interaction.deleteReply();
        } catch (err) {
            console.error(err);
            return interaction.editReply("Failed to speak.");
        }
    }
};
