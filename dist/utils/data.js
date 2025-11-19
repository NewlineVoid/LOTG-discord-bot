"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearDataCache = clearDataCache;
exports.getUserData = getUserData;
exports.saveUserData = saveUserData;
exports.getAllUserData = getAllUserData;
exports.getLatestCharData = getLatestCharData;
exports.getCharData = getCharData;
exports.getCharDataValue = getCharDataValue;
exports.updateCharDataValue = updateCharDataValue;
exports.deleteCharDataValue = deleteCharDataValue;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const async_mutex_1 = require("async-mutex");
const dataPath = path_1.default.join(__dirname, '../../data');
const usersPath = path_1.default.join(dataPath, 'users');
const locks = new Map();
const userCache = new Map();
const cacheTTL = 5 * 60 * 1000;
const lastAccess = new Map();
function ensureDirs() {
    if (!fs_1.default.existsSync(usersPath)) {
        fs_1.default.mkdirSync(usersPath, { recursive: true });
    }
}
async function withLock(userId, fn) {
    if (!locks.has(userId))
        locks.set(userId, new async_mutex_1.Mutex());
    const lock = locks.get(userId);
    await lock.runExclusive(fn);
}
function clearDataCache() {
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
function getUserData(userId) {
    ensureDirs();
    const filePath = path_1.default.join(usersPath, `${userId}.json`);
    const now = Date.now();
    if (userCache.has(userId) && now - (lastAccess.get(userId) || 0) < cacheTTL) {
        return structuredClone(userCache.get(userId));
    }
    if (!fs_1.default.existsSync(filePath)) {
        fs_1.default.writeFileSync(filePath, JSON.stringify({ userId, characters: [] }, null, 2));
    }
    const data = JSON.parse(fs_1.default.readFileSync(filePath, 'utf-8'));
    userCache.set(userId, structuredClone(data));
    lastAccess.set(userId, now);
    return data;
}
function saveUserData(userId, data) {
    ensureDirs();
    const filePath = path_1.default.join(usersPath, `${userId}.json`);
    fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2));
    userCache.set(userId, structuredClone(data));
    lastAccess.set(userId, Date.now());
}
function getAllUserData() {
    ensureDirs();
    const allData = { characters: [] };
    const userFiles = fs_1.default.readdirSync(usersPath).filter(f => f.endsWith('.json'));
    for (const file of userFiles) {
        const userId = path_1.default.basename(file, '.json');
        const userData = userCache.has(userId)
            ? userCache.get(userId)
            : JSON.parse(fs_1.default.readFileSync(path_1.default.join(usersPath, file), 'utf-8'));
        allData.characters.push(...(userData.characters || []));
    }
    return allData;
}
function getLatestCharData(userId) {
    const userData = getUserData(userId);
    return userData.characters[userData.characters.length - 1];
}
function getCharData(charId) {
    const allData = getAllUserData();
    return allData.characters.find((c) => c.id === charId);
}
function getCharDataValue(charId, key) {
    const char = getCharData(charId);
    return char ? char[key] : undefined;
}
async function updateCharDataValue(charId, key, value) {
    const allData = getAllUserData();
    const char = allData.characters.find((c) => c.id === charId);
    if (!char)
        return;
    const userId = char.OwnerId || char.ownerId; // Handle either casing just in case
    await withLock(userId, async () => {
        const userData = getUserData(userId);
        const target = userData.characters.find((c) => c.id === charId);
        if (target) {
            target[key] = value;
            saveUserData(userId, userData);
        }
    });
}
async function deleteCharDataValue(charId, key) {
    const allData = getAllUserData();
    const char = allData.characters.find((c) => c.id === charId);
    if (!char)
        return;
    const userId = char.OwnerId || char.ownerId;
    await withLock(userId, async () => {
        const userData = getUserData(userId);
        const target = userData.characters.find((c) => c.id === charId);
        if (target) {
            delete target[key];
            saveUserData(userId, userData);
        }
    });
}
