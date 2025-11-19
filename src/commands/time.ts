import { SlashCommandBuilder } from 'discord.js';
import { getTime } from '../utils/tools';
import * as Data from '../utils/data';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('time')
    .setDescription('Gets the current in-game time based on a starting date of June 28, 1349'),
  async execute(interaction: any) {
    const time = getTime();
    interaction.reply({content: time.string});
  },
};
