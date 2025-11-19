import fs from 'fs';
import path from 'path';
import { Mutex } from 'async-mutex';

const dataPath = path.join(__dirname, '../../data');
const usersPath = path.join(dataPath, 'users');
const locks = new Map<string, Mutex>();

const generalCache: any = {};
const userCache = new Map<string, any>();
const cacheTTL = 5 * 60 * 1000;
const lastAccess = new Map<string, number>();

function ensureDirs() {
    if (!fs.existsSync(usersPath)) {
        fs.mkdirSync(usersPath, { recursive: true });
    }
}

async function withLock(userId: string, fn: () => Promise<void> | void) {
    if (!locks.has(userId)) locks.set(userId, new Mutex());
    const lock = locks.get(userId)!;
    await lock.runExclusive(fn);
}

export function clearDataCache() {
    userCache.clear();
    lastAccess.clear();
}

setInterval(() => {
  const now = Date.now();
  for (const [userId, last] of lastAccess.entries()) {
    if (now - last > cacheTTL) {
      userCache.delete(userId);
      lastAccess.delete(userId);
    }
  }
}, 60 * 1000);

//user data functions

export function getUserData(userId: string): any {
    ensureDirs();
    const filePath = path.join(usersPath, `${userId}.json`);
    const now = Date.now();

    if (userCache.has(userId) && now - (lastAccess.get(userId) || 0) < cacheTTL) {
    return structuredClone(userCache.get(userId));
    }

    if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ userId, characters: [] }, null, 2));
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    userCache.set(userId, structuredClone(data));
    lastAccess.set(userId, now);
    return data;
}

export function saveUserData(userId: string, data: any) {
    ensureDirs();
    const filePath = path.join(usersPath, `${userId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    userCache.set(userId, structuredClone(data));
    lastAccess.set(userId, Date.now());
}


export function getAllUserData(): any {
    ensureDirs();
    const allData: any = { characters: [] };
    const userFiles = fs.readdirSync(usersPath).filter(f => f.endsWith('.json'));

    for (const file of userFiles) {
    const userId = path.basename(file, '.json');
    const userData = userCache.has(userId)
        ? userCache.get(userId)
        : JSON.parse(fs.readFileSync(path.join(usersPath, file), 'utf-8'));
    allData.characters.push(...(userData.characters || []));
    }

    return allData;
}

export function getLatestCharData(userId: string) {
    const userData = getUserData(userId);
    return userData.characters[userData.characters.length - 1];
}

export function getCharData(charId: string) {
    const allData = getAllUserData();
    return allData.characters.find((c: any) => c.id === charId);
}

export function getCharDataValue(charId: string, key: string) {
    const char = getCharData(charId);
    return char ? char[key] : undefined;
}

export async function updateCharDataValue(charId: string, key: string, value: any) {
    const allData = getAllUserData();
    const char = allData.characters.find((c: any) => c.id === charId);
    if (!char) return;

    const userId = char.OwnerId || char.ownerId; // Handle either casing just in case
    await withLock(userId, async () => {
        const userData = getUserData(userId);
        const target = userData.characters.find((c: any) => c.id === charId);
        if (target) {
            target[key] = value;
            saveUserData(userId, userData);
        }
    });
}

export async function deleteCharDataValue(charId: string, key: string) {
    const allData = getAllUserData();
    const char = allData.characters.find((c: any) => c.id === charId);
    if (!char) return;

    const userId = char.OwnerId || char.ownerId;
    await withLock(userId, async () => {
        const userData = getUserData(userId);
        const target = userData.characters.find((c: any) => c.id === charId);
        if (target) {
            delete target[key];
            saveUserData(userId, userData);
        }
    });
}
export function setSpeakToggle(userId: string, value: boolean) {
    const userData = getUserData(userId);
    const latest = userData.characters[userData.characters.length - 1];
    latest.SpeakToggle = value;
    saveUserData(userId, userData);
}

export function getSpeakToggle(userId: string) {
    const userData = getUserData(userId);
    const latest = userData.characters[userData.characters.length - 1];
    if (!latest || latest.Status != "Alive") {
        return false
    }
    return latest.SpeakToggle ?? false;
}


// server data
export async function getBotData() {
    if (generalCache.bot) return generalCache.bot;
    const serverDataPath = path.join(dataPath, 'bot.json');
    if (!fs.existsSync(serverDataPath)) {
        fs.writeFileSync(serverDataPath, JSON.stringify({ channels: [], persistentMessages: [], webhooks: [] }, null, 2));
    }
    const data = JSON.parse(fs.readFileSync(serverDataPath, 'utf-8'));
    generalCache.bot = data;
    return data;
}

export async function updateBotData(key:string, value:any) {
    const serverDataPath = path.join(dataPath, 'bot.json');
    let currentData: any = getBotData();
    currentData[key] = value;
    fs.writeFileSync(serverDataPath, JSON.stringify(currentData, null, 2));
    generalCache.bot = currentData;
}


//npc data
const npcsPath = path.join(dataPath, 'npcs');
const aliasIndexPath = path.join(npcsPath, "_aliases.json");
const npcCache = new Map<string, any>();
const npcLastAccess = new Map<string, number>();
let aliasIndex: Record<string, string> = loadAliasIndex();
export function resolveNameOrAlias(name: string): string | null {
    name = name.toLowerCase();
    if (fs.existsSync(path.join(npcsPath, `${name}.json`))) return name;
    if (aliasIndex[name]) return aliasIndex[name];
    return null;
}
function sanitizeFileName(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/gi, "-") 
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function loadAliasIndex() {
    ensureDirs();
    if (!fs.existsSync(aliasIndexPath)) {
        fs.writeFileSync(aliasIndexPath, "{}");
        return {};
    }
    return JSON.parse(fs.readFileSync(aliasIndexPath, "utf8"));
}

function saveAliasIndex() {
    fs.writeFileSync(aliasIndexPath, JSON.stringify(aliasIndex, null, 2));
}
export function getNPCData(name: string): any {
    ensureDirs();

    const canonical = resolveNameOrAlias(name);
    if (!canonical) return null;
    const fileKey = sanitizeFileName(canonical);
    const filePath = path.join(npcsPath, `${fileKey}.json`);
    const now = Date.now();

    if (npcCache.has(canonical) && now - (npcLastAccess.get(canonical) || 0) < cacheTTL) {
        return structuredClone(npcCache.get(canonical));
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    npcCache.set(canonical, structuredClone(data));
    npcLastAccess.set(canonical, now);
    return data;
}

export function createNPCData(npcName: string, data: any) {
    ensureDirs();

    npcName = npcName.toLowerCase();
    data.aliases = (data.aliases || []).map((a: string) => a.toLowerCase());
    const fileKey = sanitizeFileName(npcName);
    const filePath = path.join(npcsPath, `${fileKey}.json`);

    // Collision checks
    if (fs.existsSync(filePath)) {
        throw new Error(`NPC with name '${npcName}' already exists.`);
    }

    for (const alias of data.aliases) {
        if (alias === npcName) {
            throw new Error(`Alias '${alias}' cannot match the NPC name.`);
        }
        if (fs.existsSync(path.join(npcsPath, `${alias}.json`))) {
            throw new Error(`Alias '${alias}' matches another NPC's name.`);
        }
        if (aliasIndex[alias]) {
            throw new Error(`Alias '${alias}' is already used by '${aliasIndex[alias]}'`);
        }
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    for (const alias of data.aliases) {
        aliasIndex[alias] = npcName;
    }
    saveAliasIndex();

    npcCache.set(npcName, structuredClone(data));
    npcLastAccess.set(npcName, Date.now());
}


export function updateNPCData(npcName: string, key: string, value: any) {
    const canonical = resolveNameOrAlias(npcName);
    if (!canonical) throw new Error(`NPC '${npcName}' not found.`);
    const fileKey = sanitizeFileName(npcName);
    const filePath = path.join(npcsPath, `${fileKey}.json`);
    let data = getNPCData(canonical);

    if (key === "aliases") {
        const newAliases: string[] = value.map((a: string) => a.toLowerCase());

        for (const old of data.aliases || []) {
            delete aliasIndex[old];
        }

        for (const alias of newAliases) {
            if (alias === canonical) {
                throw new Error(`Alias '${alias}' cannot match the NPC name.`);
            }
            if (aliasIndex[alias]) {
                throw new Error(`Alias '${alias}' is already used by '${aliasIndex[alias]}'`);
            }
            if (fs.existsSync(path.join(npcsPath, `${alias}.json`))) {
                throw new Error(`Alias '${alias}' matches another NPC's name.`);
            }
        }

        for (const alias of newAliases) {
            aliasIndex[alias] = canonical;
        }

        saveAliasIndex();
    }

    data[key] = value;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    npcCache.set(canonical, structuredClone(data));
    npcLastAccess.set(canonical, Date.now());
}
