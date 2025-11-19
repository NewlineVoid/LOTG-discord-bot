import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import * as Stocks from '../utils/stocks';
import * as Data from '../utils/data';
import { convertFromPence } from '../utils/currency';

function fmtMoney(pence: number) {
  return convertFromPence(Math.floor(pence)).string;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('business')
    .setDescription('Stock market / business operations')
    .addSubcommand(s => s.setName('create')
      .setDescription('Create a new stock (admin)')
      .addStringOption(o => o.setName('symbol').setDescription('Ticker').setRequired(true))
      .addStringOption(o => o.setName('name').setDescription('Company name').setRequired(true))
      .addIntegerOption(o => o.setName('price').setDescription('Initial price in pence').setRequired(true))
      .addIntegerOption(o => o.setName('supply').setDescription('Initial supply').setRequired(false)))
    .addSubcommand(s => s.setName('delist')
      .setDescription('Delist a stock (admin)')
      .addStringOption(o => o.setName('symbol').setDescription('Ticker').setRequired(true)))
    .addSubcommand(s => s.setName('list')
      .setDescription('List known stocks'))
    .addSubcommand(s => s.setName('info')
      .setDescription('Get stock info')
      .addStringOption(o => o.setName('symbol').setDescription('Ticker').setRequired(true)))
    .addSubcommand(s => s.setName('price')
      .setDescription('Get price now or at a timestamp')
      .addStringOption(o => o.setName('symbol').setDescription('Ticker').setRequired(true))
      .addIntegerOption(o => o.setName('at').setDescription('unix ms timestamp').setRequired(false)))
    .addSubcommand(s => s.setName('buy')
      .setDescription('Buy shares')
      .addStringOption(o => o.setName('symbol').setDescription('Ticker').setRequired(true))
      .addIntegerOption(o => o.setName('qty').setDescription('Quantity').setRequired(true))
      .addStringOption(o => o.setName('charid').setDescription('Character ID (optional)')))
    .addSubcommand(s => s.setName('sell')
      .setDescription('Sell shares')
      .addStringOption(o => o.setName('symbol').setDescription('Ticker').setRequired(true))
      .addIntegerOption(o => o.setName('qty').setDescription('Quantity').setRequired(true))
      .addStringOption(o => o.setName('charid').setDescription('Character ID (optional)')))
    .addSubcommand(s => s.setName('state')
      .setDescription('Set stock state / patch params (admin)')
      .addStringOption(o => o.setName('symbol').setDescription('Ticker').setRequired(true))
      .addStringOption(o => o.setName('state').setDescription('State name').setRequired(true))
      .addStringOption(o => o.setName('params').setDescription('JSON patch for params').setRequired(false)))
    .addSubcommand(s => s.setName('history')
      .setDescription('Get recent history')
      .addStringOption(o => o.setName('symbol').setDescription('Ticker').setRequired(true))
      .addIntegerOption(o => o.setName('limit').setDescription('Max items').setRequired(false)))
    .addSubcommand(s => s.setName('candles')
      .setDescription('Get candlestick buckets')
      .addStringOption(o => o.setName('symbol').setDescription('Ticker').setRequired(true))
      .addIntegerOption(o => o.setName('interval').setDescription('Interval minutes').setRequired(true))
      .addIntegerOption(o => o.setName('from').setDescription('from unix ms').setRequired(false))
      .addIntegerOption(o => o.setName('to').setDescription('to unix ms').setRequired(false)))
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    try {
      if (sub === 'create') {
        if (!process.env.OWNER_ID?.includes(interaction.user.id)) return interaction.reply({ content: 'admin only', ephemeral: true });
        const symbol = interaction.options.getString('symbol', true).toUpperCase();
        const name = interaction.options.getString('name', true);
        const price = interaction.options.getInteger('price', true);
        const supply = interaction.options.getInteger('supply') ?? 1000;
        const s = await Stocks.createStock(symbol, name, price, {}, supply);
        return interaction.reply({ content: `Created ${s.symbol} @ ${fmtMoney(s.S)} supply ${s.supply}`, ephemeral: true });
      }

      if (sub === 'delist') {
        if (!process.env.OWNER_ID?.includes(interaction.user.id)) return interaction.reply({ content: 'admin only', ephemeral: true });
        const symbol = interaction.options.getString('symbol', true).toUpperCase();
        await Stocks.delistStock(symbol);
        return interaction.reply({ content: `Delisted ${symbol}`, ephemeral: true });
      }

      if (sub === 'list') {
        const list = await Stocks.listStocks();
        if (!list.length) return interaction.reply({ content: 'No stocks', ephemeral: true });
        const lines = list.map(l => `${l.symbol} — ${l.name} ${l.listed ? '' : '(delisted)'}`);
        return interaction.reply({ content: lines.join('\n'), ephemeral: false });
      }

      if (sub === 'info') {
        const symbol = interaction.options.getString('symbol', true).toUpperCase();
        const s = await Stocks.getStock(symbol);
        if (!s) return interaction.reply({ content: 'Not found', ephemeral: true });
        return interaction.reply({ content: `**${s.symbol} — ${s.name}**\nPrice: ${fmtMoney(s.S)}\nState: ${s.state}\nSupply: ${s.supply}\nDemand: ${s.demand}\nLast: <t:${Math.floor(s.lastUpdate/1000)}:R>`, ephemeral: false });
      }

      if (sub === 'price') {
        const symbol = interaction.options.getString('symbol', true).toUpperCase();
        const at = interaction.options.getInteger('at') ?? Date.now();
        const price = await Stocks.getPriceAt(symbol, at);
        return interaction.reply({ content: `Price @ <t:${Math.floor(at/1000)}:F> — ${fmtMoney(price)}`, ephemeral: false });
      }

      if (sub === 'buy' || sub === 'sell') {
        const symbol = interaction.options.getString('symbol', true).toUpperCase();
        const qty = Math.max(0, interaction.options.getInteger('qty', true));
        const charIdOpt = interaction.options.getString('charid') ?? null;
        const userId = interaction.user.id;
        const userData = Data.getUserData(userId);
        const char = charIdOpt ? userData.characters.find((c: any) => c.id === charIdOpt) : Data.getLatestCharData(userId);
        if (!char) return interaction.reply({ content: 'No character found (create one first)', ephemeral: true });

        try {
          const res = sub === 'buy'
            ? await Stocks.buyStock(userId, char.id, symbol, qty)
            : await Stocks.sellStock(userId, char.id, symbol, qty);
          return interaction.reply({ content: `${sub === 'buy' ? 'Bought' : 'Sold'} ${qty} ${symbol} for ${fmtMoney(res.totalPence)} (${fmtMoney(res.priceEach)} each)`, ephemeral: false });
        } catch (e: any) {
          return interaction.reply({ content: `${sub.charAt(0).toUpperCase() + sub.slice(1)} failed: ${e.message}`, ephemeral: true });
        }
      }

      if (sub === 'state') {
        if (!process.env.OWNER_ID?.includes(interaction.user.id)) return interaction.reply({ content: 'admin only', ephemeral: true });
        const symbol = interaction.options.getString('symbol', true).toUpperCase();
        const state = interaction.options.getString('state', true);
        const paramsRaw = interaction.options.getString('params');
        let patch;
        if (paramsRaw) {
          try { patch = JSON.parse(paramsRaw); } catch { return interaction.reply({ content: 'params must be JSON', ephemeral: true }); }
        }
        const updated = await Stocks.setState(symbol, state, patch);
        return interaction.reply({ content: `Updated ${symbol} state => ${updated.state}`, ephemeral: true });
      }

      if (sub === 'history') {
        const symbol = interaction.options.getString('symbol', true).toUpperCase();
        const limit = Math.min(1000, Math.max(1, interaction.options.getInteger('limit') ?? 50));
        const hist = await Stocks.getHistory(symbol);
        const recent = hist.slice(Math.max(0, hist.length - limit));
        const lines = recent.map(h => `<t:${Math.floor(h.timestamp/1000)}:F> ${fmtMoney(h.pricePence)} (${h.deltaPence >= 0 ? '+' : ''}${h.deltaPence})`);
        return interaction.reply({ content: lines.join('\n') || 'no history', ephemeral: false });
      }

      if (sub === 'candles') {
        const symbol = interaction.options.getString('symbol', true).toUpperCase();
        const intervalMin = Math.max(1, interaction.options.getInteger('interval', true));
        const from = interaction.options.getInteger('from') ?? undefined;
        const to = interaction.options.getInteger('to') ?? undefined;
        const ms = intervalMin * 60 * 1000;
        const buckets = Stocks.getCandles(symbol, ms, from, to);
        const out = buckets.map(b => `<t:${Math.floor(b.time/1000)}:F> O:${fmtMoney(b.o)} H:${fmtMoney(b.h)} L:${fmtMoney(b.l)} C:${fmtMoney(b.c)}`);
        return interaction.reply({ content: out.join('\n') || 'no candles', ephemeral: false });
      }

      return interaction.reply({ content: 'unknown subcommand', ephemeral: true });
    } catch (err: any) {
      console.error('business command error', err);
      return interaction.reply({ content: `Error: ${err?.message ?? String(err)}`, ephemeral: true });
    }
  }
};
