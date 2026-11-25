export type ShipGiftTrigger =
  | { type: 'FIRST_COLONY' }
  | { type: 'RESEARCH'; techIds: number[] };

export interface ShipGiftDef {
  key: string;
  shipClassKey: string;
  trigger: ShipGiftTrigger;
}

/** Order 66 text sent to the receiving player only. */
export const SHIP_GIFT_MESSAGE =
  'Ihre Fortschritte sind beeindruckend! Zum weiteren Aufbau wurde Ihnen ein Schiff abkommandiert.';

export const SHIP_GIFTS: ShipGiftDef[] = [
  {
    key: 'SHEATHIPEDE_FIRST_COLONY',
    shipClassKey: 'SALVAGE_SHUTTLE_SHEATHIPEDE',
    trigger: { type: 'FIRST_COLONY' },
  },
  {
    // Landeplattform (Rebellen 270101, Imperium 270103).
    key: 'MAXILLIPEDE_LANDING_PLATFORM',
    shipClassKey: 'SALVAGE_FREIGHTER_MAXILLIPEDE',
    trigger: { type: 'RESEARCH', techIds: [270101, 270103] },
  },
];
