export function roll(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function chance(percent: number): boolean {
  return roll(1, 100) <= percent;
}
export function weightedChoice<T>(choices: { item: T; weight: number }[]): T {
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