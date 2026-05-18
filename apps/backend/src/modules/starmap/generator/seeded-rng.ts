/**
 * Seeded Random Number Generator (LCG - Park & Miller with Schrage's method)
 * Deterministic: same seed always produces the same sequence.
 */
export class SeededRNG {
  private seed: number;
  private currentState: number;

  private static readonly MULTIPLIER = 16807;
  private static readonly MODULUS = 2147483647;
  private static readonly QUOTIENT = 127773;
  private static readonly REMAINDER = 2836;

  constructor(seedString: string) {
    this.seed = this.hashString(seedString);
    this.currentState = this.seed;
  }

  private hashString(str: string): number {
    let hash = 0;
    if (str.length === 0) return 1;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    hash = Math.abs(hash) % (SeededRNG.MODULUS - 1);
    return Math.max(1, hash);
  }

  next(): number {
    const hi = Math.floor(this.currentState / SeededRNG.QUOTIENT);
    const lo = this.currentState % SeededRNG.QUOTIENT;
    this.currentState = SeededRNG.MULTIPLIER * lo - SeededRNG.REMAINDER * hi;
    if (this.currentState <= 0) {
      this.currentState += SeededRNG.MODULUS;
    }
    return this.currentState / SeededRNG.MODULUS;
  }

  nextInt(min: number, max: number): number {
    if (min === max) return min;
    const range = max - min + 1;
    return Math.floor(this.next() * range) + min;
  }

  nextFloat(min = 0, max = 1): number {
    return this.next() * (max - min) + min;
  }

  nextBoolean(probability = 0.5): boolean {
    return this.next() < probability;
  }

  choice<T>(array: T[]): T {
    if (array.length === 0) throw new Error('Cannot choose from empty array');
    return array[this.nextInt(0, array.length - 1)];
  }

  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  weightedChoice<T>(items: Array<{ item: T; weight: number }>): T {
    if (items.length === 0) throw new Error('Cannot choose from empty items');
    const totalWeight = items.reduce((sum, i) => sum + Math.max(0, i.weight), 0);
    if (totalWeight === 0) return this.choice(items.map(i => i.item));
    const randomWeight = this.nextFloat(0, totalWeight);
    let current = 0;
    for (const entry of items) {
      current += Math.max(0, entry.weight);
      if (randomWeight < current) return entry.item;
    }
    return items[items.length - 1].item;
  }

  randomPointInCircle(centerX: number, centerY: number, radius: number): { x: number; y: number } {
    let x: number, y: number;
    do {
      x = this.nextFloat(-radius, radius);
      y = this.nextFloat(-radius, radius);
    } while (x * x + y * y > radius * radius);
    return { x: centerX + x, y: centerY + y };
  }

  reset(): void {
    this.currentState = this.seed;
  }

  getSeed(): number {
    return this.seed;
  }

  clone(): SeededRNG {
    const c = new SeededRNG('_');
    c.seed = this.seed;
    c.currentState = this.currentState;
    return c;
  }
}
