import fs from 'fs';
import path from 'path';
import { Mutex } from 'async-mutex';

const dataPath = path.join(__dirname, '../../data');
const usersPath = path.join(dataPath, 'users');
const locks = new Map<string, Mutex>();

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

setInterval(() => {
  const now = Date.now();
  for (const [userId, last] of lastAccess.entries()) {
    if (now - last > cacheTTL) {
      userCache.delete(userId);
      lastAccess.delete(userId);
    }
  }
}, 60 * 1000);

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
