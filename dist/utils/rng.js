"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roll = roll;
exports.chance = chance;
exports.weightedChoice = weightedChoice;
function roll(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function chance(percent) {
    return roll(1, 100) <= percent;
}
function weightedChoice(choices) {
    const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);
    let random = roll(1, totalWeight);
    for (const choice of choices) {
        if (random <= choice.weight) {
            return choice.item;
        }
        random -= choice.weight;
    }
    return choices[choices.length - 1].item; // fallback
}
