require('dotenv').config();
import fs from 'fs';
import path from 'path';
import { REST, Routes, WebhookClient, EmbedBuilder, ActivityType, PresenceUpdateStatus, Events } from 'discord.js';
import * as Data from './utils/data';
import * as Currency from './utils/currency';
import * as Stocks from './utils/stocks';

import { Client as BaseClient, Collection, GatewayIntentBits, Partials } from 'discord.js';

class Client extends BaseClient {
  commands: Collection<string, any>;

  constructor(options: any) {
    super(options);
    this.commands = new Collection();
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember],
});


// ---- COMMAND DEPLOYMENT ----
const deployCommands = async () => {
  try {
    const commands: any[] = [];
    const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.ts'));
    for (const file of commandFiles) {
      const command = require(`./commands/${file}`);
      if ('data' in command && 'execute' in command) commands.push(command.data.toJSON());
      else console.log(`[WARN] Command file ${file} is missing required "data" or "execute"`);
    }

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN!);
    console.log('[INFO] Refreshing application (/) commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID!), { body: commands });
    console.log(`[SUCCESS] Deployed ${commands.length} commands.`);
  } catch (err) {
    console.error('[ERROR] Deploy commands failed', err);
  }
};


// Load commands
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.ts'));
for (const file of commandFiles) {
  const command = require(path.join(__dirname, 'commands', file));
  if ('data' in command && 'execute' in command) client.commands.set(command.data.name, command);
}

// ---- WEBHOOK HELPERS ----
async function ensureWebhookForChannel(channelId: string) {
  const botData = await Data.getBotData();
  botData.webhooks = botData.webhooks || [];
  let entry = botData.webhooks.find((w: any) => w.channelId === channelId);

  if (entry && entry.webhookId && entry.webhookToken) return new WebhookClient({ id: entry.webhookId, token: entry.webhookToken });

  const channel = await client.channels.fetch(channelId);
  if (!channel || !('createWebhook' in channel)) throw new Error('Channel not found or missing perms');

  const w = await (channel as any).createWebhook({ name: 'Stocks Feed' });
  entry = { channelId, webhookId: w.id, webhookToken: w.token };
  botData.webhooks.push(entry);
  await Data.updateBotData('webhooks', botData.webhooks);
  return new WebhookClient({ id: w.id, token: w.token });
}

// ---- MARKET SNAPSHOT ----
type StockSnapshot = {
  symbol: string;
  name: string;
  pricePence: number;
  supply: number;
  marketCap: number;
  lastUpdate: number;
  percentOfMarket: number;
};
async function postMarketSnapshot(webhook: WebhookClient) {
  const now = Date.now();
  await Stocks.updateStocksTo(now);
  const raw = Stocks.snapshotAllListed(now);

  const snapshots: StockSnapshot[] = raw.snapshots.map(s => ({
    symbol: s.symbol,
    name: s.name,
    pricePence: s.S,
    supply: s.supply,
    marketCap: s.marketCap,
    lastUpdate: s.lastUpdate,
    percentOfMarket: s.percentOfMarket ?? 0,
  }));

  const totalMarketCap = raw.totalMarketCap;

  const chunkSize = 12;
  for (let i = 0; i < snapshots.length; i += chunkSize) {
    const chunk = snapshots.slice(i, i + chunkSize);
    const embed = new EmbedBuilder()
      .setTitle('Market Snapshot')
      .setTimestamp(now)
      .setFooter({ text: `Total market cap: ${Currency.convertFromPence(totalMarketCap).string}` });

    for (const s of chunk) {
      const price = Currency.convertFromPence(s.pricePence).string;
      const mcap = Currency.convertFromPence(s.marketCap).string;
      embed.addFields({
        name: `${s.symbol} — ${s.name}`,
        value: `Price: ${price}\nMarket Cap: ${mcap}\n% of Market: ${s.percentOfMarket?.toFixed(2) || 0}%`,
        inline: true,
      });
    }

    await webhook.send({ username: 'Market Feed', embeds: [embed] });
  }
}

// ---- CLIENT READY ----
client.once(Events.ClientReady, async () => {
  console.log(`[SUCCESS] Logged in as ${client.user?.tag}`);

  await deployCommands();
  console.log('[SUCCESS] Commands deployed.');

  client.user?.setPresence({
    activities: [{ name: 'With LOTG', type: ActivityType.Playing }],
    status: PresenceUpdateStatus.Online,
  });

  try {
    const webhook = await ensureWebhookForChannel('1440183952210923672');
    setInterval(() => postMarketSnapshot(webhook).catch(console.error), 7.5 * 60 * 1000); // every 7.5 minutes
    // also post immediately on start
    postMarketSnapshot(webhook).catch(console.error);
  } catch (err) {
    console.error('Failed to start stocks webhook job', err);
  }
});

// ---- INTERACTIONS ----
client.on(Events.InteractionCreate, async (interaction: any) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
    } else if (interaction.isModalSubmit()) {
      const [commandName] = interaction.customId.split('-');
      const command = client.commands.get(commandName.toLowerCase());

      if (commandName.toLowerCase() === 'forcereload') {
        if (interaction.user.id !== process.env.OWNER_ID) {
          await interaction.reply({ content: 'No permission.', ephemeral: true });
          return;
        }
        await deployCommands();
      }

      if (command?.handleModalSubmit) await command.handleModalSubmit(interaction);
    }
  } catch (err) {
    console.error(err);
    if (interaction.replied || interaction.deferred) await interaction.followUp({ content: 'Error: ' + err, ephemeral: true });
    else await interaction.reply({ content: 'Error occurred.', ephemeral: true });
  }
});

// ---- MESSAGE AUTO-SPEAK ----
client.on(Events.MessageCreate, async msg => {
  if (msg.author.bot) return;

  const toggle = Data.getSpeakToggle(msg.author.id) ?? false;
  if (!toggle || (msg.content.startsWith('(') && msg.content.endsWith(')'))) return;

  const charData = Data.getLatestCharData(msg.author.id);
  if (!charData || charData.Status !== 'Alive') return;

  const sendThroughWebhook = async (username: string, content: string, avatar?: string) => {
    try {
      const webhook = await ensureWebhookForChannel(msg.channel.id);
      await webhook.send({ content, username, avatarURL: avatar });
    } catch (err) {
      console.error('Auto speak error:', err);
    }
  };

  await sendThroughWebhook(charData.Name, msg.content, charData.ImageUrl ?? msg.author.displayAvatarURL());
  if (msg.deletable) msg.delete().catch(() => null);

  if (msg.content.toLowerCase().includes('adam')) {
    await sendThroughWebhook(
      '????',
      'The gaze of an existence peers into you.',
      'https://i.pinimg.com/236x/51/dc/2c/51dc2c937430b858b5ebbfd189b47352.jpg'
    );
  }
});

client.login(process.env.TOKEN);
