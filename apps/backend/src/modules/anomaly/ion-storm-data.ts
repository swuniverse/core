import type { AnomalyRandom } from './stu-random';

/** Persisted on the ion storm root, following STU `IonStormData`. */
export interface IonStormData {
  layerId: number;
  directionInDegrees: number;
  velocity: number;
  movementType: 'STATIC' | 'VARIABLE';
  isPositivePolarity: boolean;
  intensity: number;
}

export function horizontalMovement(data: IonStormData): number {
  return Math.round(Math.sin((data.directionInDegrees * Math.PI) / 180) * data.velocity);
}

export function verticalMovement(data: IonStormData): number {
  return Math.round(Math.cos((data.directionInDegrees * Math.PI) / 180) * data.velocity);
}

export function changeMovement(data: IonStormData, random: AnomalyRandom): IonStormData {
  return {
    ...data,
    directionInDegrees: random.integer(1, 360),
    velocity: random.normal(1, 5, 2),
  };
}

/** STU `IonStormData::createRandomInstance`, in the same draw order. */
export function createRandomIonStormData(layerId: number, random: AnomalyRandom): IonStormData {
  const movementType = random.integer(1, 10) === 10 ? 'VARIABLE' : 'STATIC';
  const isPositivePolarity = random.integer(0, 1) === 1;
  const intensity = random.integer(50, 200);
  return changeMovement(
    { layerId, directionInDegrees: 0, velocity: 0, movementType, isPositivePolarity, intensity },
    random,
  );
}
