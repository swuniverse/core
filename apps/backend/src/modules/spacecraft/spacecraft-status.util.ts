/**
 * Reads the status without type narrowing: consequences such as anomalies
 * may destroy a spacecraft after an earlier status check.
 */
export function isSpacecraftDestroyed(ship: { status: string }): boolean {
  return ship.status === 'DESTROYED';
}
