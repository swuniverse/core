import { FieldEffect, knownFieldEffects } from '@swuniverse/shared';

export type LssSignature =
  | { x: number; y: number; state: 'COUNT'; count: number }
  | { x: number; y: number; state: 'DUBIOUS' };

export type RedactedLssField = { x: number; y: number; redacted: true };

type SensorField = {
  fieldType: { effects?: string[] | null };
  effects?: string[] | null;
};

type NumericSignature = { x: number; y: number; visibleCount: number };

export function applyLssSensorEffects<T extends SensorField>(input: {
  fields: T[];
  observer: { x: number; y: number };
  position: (field: T) => { x: number; y: number };
  signatures: NumericSignature[];
}): {
  fields: Array<T | RedactedLssField>;
  signatures: LssSignature[];
  warning?: string;
} {
  const effectsByPosition = new Map<string, Set<FieldEffect>>();
  const fieldByPosition = new Map<string, T>();
  for (const field of input.fields) {
    const position = input.position(field);
    const key = positionKey(position.x, position.y);
    fieldByPosition.set(key, field);
    effectsByPosition.set(key, fieldEffects(field));
  }

  const observerEffects = effectsByPosition.get(
    positionKey(input.observer.x, input.observer.y),
  );
  const malfunctioning = observerEffects?.has(FieldEffect.LSS_MALFUNCTION) === true;
  const blockadePositions = new Set(
    [...effectsByPosition.entries()]
      .filter(([, effects]) => effects.has(FieldEffect.LSS_BLOCKADE))
      .map(([key]) => key),
  );
  const hidden = new Set<string>();

  for (const [key, field] of fieldByPosition) {
    const position = input.position(field);
    if (
      malfunctioning &&
      (position.x !== input.observer.x || position.y !== input.observer.y)
    ) {
      hidden.add(key);
    } else if (
      !malfunctioning &&
      !isVisible(position.x, position.y, input.observer, blockadePositions)
    ) {
      hidden.add(key);
    }
  }

  const fields = input.fields
    .filter((field) => {
      if (!malfunctioning) return true;
      const position = input.position(field);
      return position.x === input.observer.x && position.y === input.observer.y;
    })
    .map((field): T | RedactedLssField => {
      const position = input.position(field);
      return hidden.has(positionKey(position.x, position.y))
        ? { ...position, redacted: true }
        : field;
    });

  const signatures = input.signatures.flatMap((signature): LssSignature[] => {
    const key = positionKey(signature.x, signature.y);
    if (hidden.has(key)) return [];
    const effects = effectsByPosition.get(key);
    if (effects?.has(FieldEffect.NO_SPACECRAFT_COUNT)) return [];
    if (effects?.has(FieldEffect.DUBIOUS_SPACECRAFT_COUNT)) {
      return signature.visibleCount > 0
        ? [{ x: signature.x, y: signature.y, state: 'DUBIOUS' }]
        : [];
    }
    return signature.visibleCount > 0
      ? [{ x: signature.x, y: signature.y, state: 'COUNT', count: signature.visibleCount }]
      : [];
  });

  return {
    fields,
    signatures,
    ...(malfunctioning
      ? { warning: 'Langstreckensensoren liefern keine verwertbaren Daten' }
      : {}),
  };
}

function fieldEffects(field: SensorField): Set<FieldEffect> {
  return new Set(
    knownFieldEffects([
      ...(field.fieldType.effects ?? []),
      ...(field.effects ?? []),
    ]),
  );
}

function positionKey(x: number, y: number): string {
  return `${x},${y}`;
}

function isVisible(
  x: number,
  y: number,
  observer: { x: number; y: number },
  blocked: Set<string>,
): boolean {
  if (blocked.has(positionKey(x, y))) return false;

  let currentX = observer.x;
  let currentY = observer.y;
  const stepX = x - observer.x >= 0 ? 1 : -1;
  const stepY = y - observer.y >= 0 ? 1 : -1;
  const distanceX = Math.abs(x - observer.x);
  const distanceY = Math.abs(y - observer.y);
  let error = distanceX - distanceY;

  while (currentX !== x || currentY !== y) {
    const doubledError = error * 2;
    let nextX = currentX;
    let nextY = currentY;

    if (doubledError > -distanceY) {
      error -= distanceY;
      nextX += stepX;
    }
    if (doubledError < distanceX) {
      error += distanceX;
      nextY += stepY;
    }

    if (currentX !== nextX && currentY !== nextY) {
      if (
        blocked.has(positionKey(currentX, nextY)) ||
        blocked.has(positionKey(nextX, currentY))
      ) {
        return false;
      }
    }
    if (blocked.has(positionKey(nextX, nextY))) return false;

    currentX = nextX;
    currentY = nextY;
  }

  return true;
}
