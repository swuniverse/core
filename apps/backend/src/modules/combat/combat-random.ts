/** Injectable/replaceable random source for all battle decisions. */
export class CombatRandom {
  next(): number {
    return Math.random();
  }
}
