import { SlashCommandBuilder } from "discord.js";
import * as Data from '../utils/data';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('speak')
        .setDescription('speaks as if you\'re a character.')
        .addStringOption(option =>
            option
                .setName('content')
                .setDescription('the content of the message')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName('toggle')
                .setDescription('enable or disable automatic speaking')
                .setRequired(false)
        ),

    async execute(interaction: any) {
        await interaction.reply({ content: 'Processing...', ephemeral: true });

        const userId = interaction.user.id;
        const charData = Data.getLatestCharData(userId);
        if (!charData) return interaction.editReply("No character found.");

        const toggle = interaction.options.getBoolean('toggle');
        const content = interaction.options.getString('content');

        if (toggle !== null) {
            Data.setSpeakToggle(userId, toggle);

            return interaction.editReply(
                toggle
                    ? "Automatic speaking **enabled**."
                    : "Automatic speaking **disabled**."
            );
        }

        if (!content) return interaction.editReply("You must provide content unless using toggle.");

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
                username: charData.Name,
                avatarURL: charData.ImageUrl ?? interaction.user.displayAvatarURL()
            });
            if (content.toLowerCase().split(" ").includes("adam")) {
                try {
                    const channel = interaction.channel;
                    const webhooks = await channel.fetchWebhooks();
                    let oracle = webhooks.find((w: any) => w.name === "Oracle");

                    if (!oracle) {
                        const canManage = interaction.guild.members.me.permissions.has("ManageWebhooks");
                        if (!canManage) return;

                        oracle = await channel.createWebhook({ name: "Oracle" });
                    }

                    await oracle.send({
                        content: "The gaze of an existence peers into you.",
                        username: "????",
                        avatarURL: "https://i.pinimg.com/236x/51/dc/2c/51dc2c937430b858b5ebbfd189b47352.jpg"
                    });
                } catch (err) {
                    console.error("Auto adam error:", err);
                }
            }
            await interaction.deleteReply();
        } catch (err) {
            console.error(err);
            return interaction.editReply("Failed to speak.");
        }
    }
};
