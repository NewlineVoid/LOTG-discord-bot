require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');



const deployCommands = async ()=>{
  try {
    const commands = [];
    const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter((file: string) => file.endsWith('.ts'));
    for (const file of commandFiles) {
      const command = require(`./commands/${file}`);
      if ('data' in command && 'execute' in command) {
        console.log(`[INFO] Preparing command ${command.data.name} for deployment.`);
        commands.push(command.data.toJSON());
      } else {
        console.log(`[WARN] Command file ${file} is missing a required "data" or "execute" property.`);
      }
    }
    
    const rest = new REST().setToken(process.env.TOKEN);
    console.log('[INFO] Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );
    console.log('[SUCCESS] Successfully reloaded application (/) commands.');
    console.log(`[INFO] Deployed ${commands.length} commands: ${commands.map((cmd: any) => cmd.name).join(', ')}`);
  } catch (error) {
    console.error(`[ERROR] Error deploying commands: ${error}`);
  }
}

const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  ActivityType,
  PresenceUpdateStatus,
  Events
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember
  ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file: string) => file.endsWith('.ts'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`[WARN] Command file ${filePath} is missing a required "data" or "execute" property.`);
  }
}


client.once(Events.ClientReady, async () => {
  console.log(`[SUCCESS] Logged in as ${client.user.tag}`);

  await deployCommands();
  console.log('[SUCCESS] Commands deployed globally.');

  client.user.setPresence({
    activities: [{ name: 'With LOTG', type: ActivityType.Playing }],
    status: PresenceUpdateStatus.Online,
  });
  console.log('[SUCCESS] Presence set.');
});

client.on(Events.InteractionCreate, async (interaction: any) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
    } else if (interaction.isModalSubmit()) {
      const [commandName] = interaction.customId.split('-');
      const command = client.commands.get(commandName.toLowerCase());
      if (command?.handleModalSubmit) {
        await command.handleModalSubmit(interaction);
      }
    }
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'An error occurred.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'An error occurred.', ephemeral: true });
    }
  }
});



client.login(process.env.TOKEN);