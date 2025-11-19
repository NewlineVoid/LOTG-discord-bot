import fs from 'fs';
import path from 'path';
import * as Data from './data';

const filePath = path.join(__dirname, '../../data/stocks.json');
const locks = new Map<string, Promise<void>>();

type StockParams = Partial<{
  mu: number;
  kappa: number;
  theta: number;
  xi: number;
  rho: number;
  lambda: number;
  muJump: number;
  sigmaJump: number;
  alphaSD: number;
  betaSD: number;
  maxHistory: number;
}>;

type StockHistoryEntry = { timestamp: number; pricePence: number; deltaPence: number };

export type Stock = {
  symbol: string;
  name: string;
  listed: boolean;
  S: number;
  v: number;
  lastUpdate: number;
  supply: number;
  demand: number;
  state: string;
  params: StockParams;
  history: StockHistoryEntry[];
  owners: Record<string, number>;
  percentOfMarket?: number;
};

// ------------------ Utils ------------------

const nowMs = () => Date.now();

function lock(key = 'stocks') {
  const prev = locks.get(key) || Promise.resolve();
  let release: () => void;
  const p = new Promise<void>((res) => { release = res; });
  locks.set(key, prev.then(() => p));
  return release!;
}

function ensureFile() {
  if (!fs.existsSync(path.dirname(filePath))) fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({ symbols: {} }, null, 2));
}

function loadAll(): Record<string, Stock> {
  ensureFile();
  return JSON.parse(fs.readFileSync(filePath, 'utf8')).symbols || {};
}

function saveAll(map: Record<string, Stock>) {
  ensureFile();
  fs.writeFileSync(filePath, JSON.stringify({ symbols: map }, null, 2));
}

function deepClone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }

function defaultParams(): StockParams {
  return {
    mu: 0.05, kappa: 2, theta: 0.04, xi: 0.3, rho: -0.4,
    lambda: 0.2, muJump: -0.05, sigmaJump: 0.15, alphaSD: 0.02, betaSD: 1, maxHistory: 10000
  };
}

function randNormal() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function correlatedNormals(rho: number) {
  const z1 = randNormal();
  const z2 = rho * z1 + Math.sqrt(Math.max(0, 1 - rho ** 2)) * randNormal();
  return [z1, z2];
}

function logNormalSample(mu = 0, sigma = 0.2) {
  return Math.exp(mu + sigma * randNormal());
}

function toYears(dtMs: number) {
  return dtMs / 1000 / 3600 / 24 / 365;
}

function clamp(n: number, a = 0, b = Number.POSITIVE_INFINITY) { return Math.max(a, Math.min(b, n)); }

function ensureStockDefaults(s: Partial<Stock>): Stock {
  const params = { ...defaultParams(), ...(s.params || {}) };
  const now = nowMs();
  const initPrice = Math.max(1, Math.round(s.S ?? (s as any).initialPricePence ?? 100));
  return {
    symbol: (s.symbol || 'UNKNOWN').toUpperCase(),
    name: s.name || (s.symbol || 'Unnamed'),
    listed: s.listed ?? true,
    S: initPrice,
    v: s.v ?? params.theta ?? 0.04,
    lastUpdate: s.lastUpdate ?? now,
    supply: s.supply ?? 1000,
    demand: s.demand ?? 0,
    state: s.state ?? 'Normal',
    params,
    history: s.history ?? [{ timestamp: now, pricePence: initPrice, deltaPence: 0 }],
    owners: s.owners ?? {},
  };
}

// ------------------ Stock Simulation ------------------

function simulateStep(stock: Stock, dtMs: number) {
  const dtYr = toYears(dtMs);
  if (dtYr <= 0) return stock;

  const p = stock.params;
  const mu = p.mu ?? 0.05;
  const kappa = p.kappa ?? 2;
  const theta = p.theta ?? 0.04;
  const xi = p.xi ?? 0.3;
  const rho = p.rho ?? -0.4;
  const lambda = p.lambda ?? 0.2;
  const muJ = p.muJump ?? -0.05;
  const sigmaJ = p.sigmaJump ?? 0.15;
  const alpha = p.alphaSD ?? 0.02;
  const beta = p.betaSD ?? 1.0;

  const [z1, z2] = correlatedNormals(rho);

  // volatility update
  const dv = kappa * (theta - stock.v) * dtYr + xi * Math.sqrt(Math.max(stock.v, 0)) * Math.sqrt(dtYr) * z2;
  stock.v = Math.max(stock.v + dv, 1e-8);

  // jump
  const Y = Math.random() < 1 - Math.exp(-lambda * dtYr) ? logNormalSample(muJ, sigmaJ) : 1;

  // supply-demand factor
  const g = alpha * Math.tanh(beta * (stock.demand / (stock.supply + 1e-9) - 1));

  const factor = Math.exp((mu - 0.5 * stock.v) * dtYr + Math.sqrt(stock.v) * Math.sqrt(dtYr) * z1 + g * dtYr) * Y;
  const newPrice = Math.max(1, Math.round(stock.S * factor));
  const delta = newPrice - stock.S;

  stock.S = newPrice;
  stock.lastUpdate += dtMs;
  stock.history.push({ timestamp: stock.lastUpdate, pricePence: newPrice, deltaPence: delta });

  const maxH = stock.params.maxHistory ?? 10000;
  if (stock.history.length > maxH) stock.history.splice(0, stock.history.length - maxH);

  return stock;
}

export function advanceStockTo(stockIn: Stock, targetMs: number) {
  const stock = deepClone(stockIn);
  const maxStepMs = 5 * 60 * 1000; // 5 minutes
  let dt = targetMs - stock.lastUpdate;
  while (dt > 0) {
    const step = Math.min(maxStepMs, dt);
    simulateStep(stock, step);
    dt -= step;
  }
  return stock;
}

// ------------------ Market Snapshots ------------------

export function snapshotAllListed(atMs: number = nowMs()) {
  const all = loadAll();
  const listed = Object.values(all).filter(s => s.listed);
  let totalCap = 0;

  const snapshots = listed.map(st => {
    const adv = advanceStockTo(st, atMs);
    const marketCap = adv.S * adv.supply;
    totalCap += marketCap;
    return { ...adv, marketCap };
  });

  for (const s of snapshots) {
    s.percentOfMarket = totalCap > 0 ? (s.marketCap / totalCap) * 100 : 0;
  }

  return { totalMarketCap: totalCap, snapshots };
}

// ------------------ Purchase / Ownership ------------------

export async function buyStock(userId: string, charId: string | null, symbol: string, qty: number) {
  if (qty <= 0) throw new Error('Invalid quantity');
  const release = lock();
  try {
    const all = loadAll();
    const stock = all[symbol.toUpperCase()];
    if (!stock?.listed) throw new Error('Stock not listed');

    const adv = advanceStockTo(stock, nowMs());
    const totalCost = adv.S * qty;

    const userData = Data.getUserData(userId);
    const char = charId ? userData.characters.find((c:any) => c.id === charId) : Data.getLatestCharData(userId);
    if (!char) throw new Error('Character not found');

    char.Stats = char.Stats || {};
    const balance = char.Balance.balanceinpence ?? char.BalancePence ?? 0;
    if (balance < totalCost) throw new Error('Insufficient funds');

    char.Balance.balanceinpence = balance - totalCost;
    char.Inventory = char.Inventory || [];
    const inv = char.Inventory.find((it:Stock) => it.symbol === symbol);
    if (inv) inv.qty += qty;
    else char.Inventory.push({ symbol, qty });

    adv.supply = Math.max(0, adv.supply - qty);
    adv.demand += qty;

    adv.owners = adv.owners || {};
    adv.owners[char.id] = (adv.owners[char.id] || 0) + qty;

    all[symbol.toUpperCase()] = adv;
    saveAll(all);
    Data.saveUserData(userId, userData);

    return { totalPence: totalCost, priceEach: adv.S };
  } finally { release(); }
}

// ------------------ Price / Market Cap ------------------

export function formatPence(pence: number) {
  const Pounds = Math.floor(pence / 240);
  const Soli = Math.floor((pence % 240) / 12);
  const Pence = pence % 12;
  return `${Pounds} Pounds, ${Soli} Soli and ${Pence} Pence`;
}

export async function snapshotStockVsMarket(symbol: string, atMs?: number) {
  const stock = await getStock(symbol, atMs ?? nowMs());
  if (!stock) throw new Error(`Stock with symbol "${symbol}" not found`);

  const stockCap = stock.S * stock.supply;
  const totalCap = getTotalMarketCap(atMs);
  const percent = totalCap > 0 ? (stockCap / totalCap) * 100 : 0;

  return {
    symbol: stock.symbol,
    price: formatPence(stock.S),
    stockMarketCap: formatPence(stockCap),
    totalMarketCap: formatPence(totalCap),
    percentOfMarket: percent.toFixed(2) + '%',
    lastUpdate: stock.lastUpdate
  };
}

// ------------------ Other exports remain the same ------------------
// createStock, delistStock, sellStock, setState, getStock, getHistory, getCandles, etc.
export async function createStock(symbol: string, name: string, initialPricePence: number, params: Partial < StockParams > = {}, supply = 1000) {
    symbol = symbol.toUpperCase();
    const release = lock();
    try {
        const all = loadAll();
        if (all[symbol]) throw new Error('Symbol exists');
        const s: Partial < Stock > = {
            symbol,
            name,
            S: Math.max(1, Math.round(initialPricePence)),
            v: (params.theta ?? defaultParams().theta),
            lastUpdate: nowMs(),
            supply,
            demand: 0,
            state: 'Normal',
            params: Object.assign({}, defaultParams(), params),
            history: [{
                timestamp: nowMs(),
                pricePence: Math.max(1, Math.round(initialPricePence)),
                deltaPence: 0
            }],
            listed: true,
        };
        all[symbol] = ensureStockDefaults(s);
        saveAll(all);
        return deepClone(all[symbol]);
    } finally {
        release();
    }
}
export async function delistStock(symbol: string) {
    symbol = symbol.toUpperCase();
    const release = lock();
    try {
        const all = loadAll();
        if (!all[symbol]) throw new Error('Symbol not found');
        all[symbol].listed = false;
        saveAll(all);
        return true;
    } finally {
        release();
    }
}
export async function listStocks() {
    const all = loadAll();
    return Object.values(all).map(s => ({
        symbol: s.symbol,
        name: s.name,
        listed: s.listed
    }));
}
export async function getStock(symbol: string, toMs = nowMs()) {
    symbol = symbol.toUpperCase();
    const release = lock();
    try {
        const all = loadAll();
        const s = all[symbol];
        if (!s) return null;
        const updated = advanceStockTo(s, toMs);
        return deepClone(updated);
    } finally {
        release();
    }
}
export async function getPriceAt(symbol: string, timestamp: number) {
    const st = await getStock(symbol, timestamp);
    if (!st) throw new Error('Symbol not found');
    return st.S;
}
export async function updateStocksTo(targetMs = nowMs(), symbols ? : string[]) {
    const release = lock();
    try {
        const all = loadAll();
        const keys = symbols && symbols.length ? symbols.map(k => k.toUpperCase()) : Object.keys(all);
        for (const k of keys) {
            const s = all[k];
            if (!s) continue;
            const advanced = advanceStockTo(s, targetMs);
            all[k] = advanced;
        }
        saveAll(all);
        return true;
    } finally {
        release();
    }
}
export async function adjustSupplyDemand(symbol: string, supplyDelta = 0, demandDelta = 0) {
    symbol = symbol.toUpperCase();
    const release = lock();
    try {
        const all = loadAll();
        const s = all[symbol];
        if (!s) throw new Error('Symbol not found');
        s.supply = Math.max(0, Math.round(s.supply + supplyDelta));
        s.demand = Math.max(0, Math.round(s.demand + demandDelta));
        saveAll(all);
        return deepClone(s);
    } finally {
        release();
    }
}

export async function sellStock(userId: string, charId: string | null, symbol: string, qty: number) {
    qty = Math.max(0, Math.floor(qty));
    if (qty <= 0) throw new Error('Invalid qty');
    symbol = symbol.toUpperCase();
    const release = lock();
    try {
        const all = loadAll();
        const s = all[symbol];
        if (!s) throw new Error('Not found');
        const userData = Data.getUserData(userId);
        let char;
        if (charId) char = userData.characters.find((c: any) => c.id === charId);
        else char = Data.getLatestCharData(userId);
        if (!char) throw new Error('Character not found');
        char.Inventory = char.Inventory || [];
        const inv = char.Inventory.find((it: any) => it.symbol === symbol);
        if (!inv || inv.qty < qty) throw new Error('Not enough shares');
        const now = nowMs();
        const advanced = advanceStockTo(s, now);
        const priceEach = advanced.S;
        const total = priceEach * qty;
        inv.qty -= qty;
        if (inv.qty <= 0) char.Inventory = char.Inventory.filter((it: any) => it.symbol !== symbol);
        char.Stats = char.Stats || {};
        char.Balance.balanceinpence = (char.Balance.balanceinpence ?? 0) + total;
        s.supply += qty;
        s.demand = Math.max(0, s.demand - qty);
        s.owners = s.owners || {};
        s.owners[char.id] = (s.owners[char.id] || 0) - qty;
        if (s.owners[char.id] <= 0) delete s.owners[char.id];
        all[symbol] = advanced;
        saveAll(all);
        Data.saveUserData(userId, userData);
        return {
            totalPence: total,
            priceEach
        };
    } finally {
        release();
    }
}
export async function setState(symbol: string, state: string, paramsPatch ? : Partial < StockParams > ) {
    symbol = symbol.toUpperCase();
    const release = lock();
    try {
        const all = loadAll();
        if (!all[symbol]) throw new Error('Symbol not found');
        all[symbol].state = state;
        if (paramsPatch) all[symbol].params = Object.assign({}, all[symbol].params, paramsPatch);
        saveAll(all);
        return deepClone(all[symbol]);
    } finally {
        release();
    }
}
export function getHistory(symbol: string) {
    const all = loadAll();
    const s = all[symbol.toUpperCase()];
    if (!s) throw new Error('Symbol not found');
    return deepClone(s.history);
}
export function getCandles(symbol: string, intervalMs: number, fromMs ? : number, toMs ? : number) {
    const hist = getHistory(symbol).map(h => ({
        timestamp: h.timestamp,
        price: h.pricePence
    }));
    if (!hist.length) return [];
    const from = fromMs ?? hist[0].timestamp;
    const to = toMs ?? hist[hist.length - 1].timestamp;
    const out: {
        time: number;o: number;h: number;l: number;c: number
    } [] = [];
    let bucketStart = Math.floor(from / intervalMs) * intervalMs;
    let i = 0;
    while (bucketStart <= to) {
        const bucketEnd = bucketStart + intervalMs;
        const bucket = [];
        while (i < hist.length && hist[i].timestamp < bucketEnd) {
            if (hist[i].timestamp >= bucketStart) bucket.push(hist[i]);
            i++;
        }
        if (bucket.length) {
            const o = bucket[0].price;
            const c = bucket[bucket.length - 1].price;
            const h = Math.max(...bucket.map(b => b.price));
            const l = Math.min(...bucket.map(b => b.price));
            out.push({
                time: bucketStart,
                o,
                h,
                l,
                c
            });
        }
        bucketStart = bucketEnd;
    }
    return out;
}
export function getMarketCap(symbol: string, atMs ? : number) {
    const st = loadAll()[symbol.toUpperCase()];
    if (!st) throw new Error('Symbol not found');
    const s = atMs ? advanceStockTo(st, atMs) : st;
    return (s.S * (s.supply || 0));
}
export function getTotalMarketCap(atMs ? : number) {
    const all = loadAll();
    let sum = 0;
    for (const k of Object.keys(all)) {
        const st = all[k];
        if (!st.listed) continue;
        const s = atMs ? advanceStockTo(st, atMs) : st;
        sum += s.S * (s.supply || 0);
    }
    return sum;
}