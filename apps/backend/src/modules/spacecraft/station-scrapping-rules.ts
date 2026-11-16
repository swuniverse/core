import { createHash, randomInt } from 'node:crypto';

export interface ScrappingModule {
  commodityId: number;
  count: number;
  guaranteed: boolean;
}

export const scrappingCode = (name: string): string =>
  createHash('md5').update(name).digest('hex').slice(0, 6);

export function prepareScrappingModules(
  modules: Array<{ commodityId: number; integrity: number }>,
  random: (min: number, max: number) => number = randomInt,
): ScrappingModule[] {
  const groups = new Map<number, ScrappingModule>();
  for (const module of modules) {
    const group = groups.get(module.commodityId) ?? {
      commodityId: module.commodityId,
      count: 0,
      guaranteed: false,
    };
    group.count++;
    const chance = Math.ceil(
      (50 * Math.max(0, Math.min(100, module.integrity))) / 100,
    );
    if (chance > 0 && random(1, 101) <= chance) group.guaranteed = true;
    groups.set(module.commodityId, group);
  }
  return [...groups.values()];
}

export function recycleScrappingModules(
  modules: ScrappingModule[],
  random: (min: number, max: number) => number = randomInt,
): Array<{ commodityId: number; amount: number }> {
  return modules.flatMap((module) => {
    const amount = module.guaranteed
      ? 1
      : random(1, 101) <= 33
        ? 0
        : random(1, module.count + 1);
    return amount > 0 ? [{ commodityId: module.commodityId, amount }] : [];
  });
}
