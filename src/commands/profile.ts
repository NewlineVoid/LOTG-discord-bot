const { EmbedBuilder, SlashCommandBuilder, AddUserOption } = require('discord.js');
import * as Data from '../utils/data';
import * as Currency from '../utils/currency';
module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Displays your currently active character profile')
        .addUserOption((option: any) =>
            option.setName('user')
                .setDescription('The user whose profile you want to view')
                .setRequired(false)),
        
    async execute(interaction: any) {
        const userId = interaction.options.getUser('user') ? interaction.options.getUser('user').id : interaction.user.id;
        const userData = Data.getUserData(userId);

        if (!userData || userData.characters.length === 0) {
            await interaction.reply({ 
                content: `${interaction.options.getUser('user') ? interaction.options.getUser('user').username + ' has' : 'You have'} no characters. Use \`/createcharacter\` to create one.`, 
                ephemeral: false 
            });
            return;
        }

        const aliveChar = userData.characters.find((c: any) => c.Status === 'Alive');
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
            .setDescription(
                `**Sequence:** ${aliveChar.Sequence}${aliveChar.Pathway ? ` (${aliveChar.Pathway})` : ''}\n` +
                `**Family:** ${aliveChar.FamilyStatus}\n` +
                `**Age:** ${aliveChar.Age}\n` +
                `**Status:** ${aliveChar.Status}\n` +
                `**Location:** ${aliveChar.currentLocation}\n` +
                `**Balance:** ${aliveChar.Balance.pounds} pounds, ${aliveChar.Balance.soli} soli, ${aliveChar.Balance.pence} pence\n`
            )
            .addFields(
                { name: 'Core Stats', value: 
                    `**Health:** ${stats.Health}\n` +
                    `**Hunger:** ${stats.Hunger}\n` +
                    `**Stamina:** ${stats.Stamina}\n` +
                    `**Spirituality:** ${stats.Spirituality}\n` +
                    `**Sanity:** ${stats.Sanity}\n` +
                    `**Global Rep:** ${stats.GlobalReputation}`, inline: true 
                },
                { name: 'Attributes', value: 
                    `**Luck:** ${stats.Luck}\n` +
                    `**Perception:** ${stats.Perception}\n` +
                    `**Agility:** ${stats.Agility}\n` +
                    `**Strength:** ${stats.Strength}\n` +
                    `**Intellect:** ${stats.Intellect}\n` +
                    `**Charisma:** ${stats.Charisma}`, inline: true
                },
                { name: 'Injuries', value: aliveChar.Injuries?.length ? aliveChar.Injuries.join(', ') : 'None', inline: false },
                { name: 'Status Effects', value: aliveChar.StatusEffects?.length ? aliveChar.StatusEffects.join(', ') : 'None', inline: false },
                { name: 'Inventory', value: aliveChar.Inventory?.length ? aliveChar.Inventory.join(', ') : 'Empty', inline: false }
            )
            .setFooter({ text: `Created at: ${new Date(aliveChar.CreatedAt).toLocaleString()}` });

        await interaction.reply({ embeds: [embed], ephemeral: false });
    }
};
