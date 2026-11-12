/** Port of the STU `StuRandom` distributions the anomaly handlers rely on. */
export interface AnomalyRandom {
  /** Uniform integer in `[min, max]`. */
  integer(min: number, max: number): number;
  /** STU `rand(min, max, true, mean)`: rejection-sampled normal distribution. */
  normal(min: number, max: number, mean?: number): number;
}

export function createAnomalyRandom(uniform: () => number = Math.random): AnomalyRandom {
  const integer = (min: number, max: number) => min + Math.floor(uniform() * (max - min + 1));
  return {
    integer,
    normal(min, max, mean = (min + max) / 2) {
      const deviation = mean / 2.5;
      for (;;) {
        const value = integer(min, max);
        if (uniform() <= Math.exp(-0.5 * ((value - mean) / deviation) ** 2)) return value;
      }
    },
  };
}
