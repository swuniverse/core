export type ShipGiftTrigger =
  | { type: 'FIRST_COLONY' }
  | { type: 'RESEARCH'; techIds: number[] };

export interface ShipGiftDef {
  key: string;
  shipClassKey: string;
  trigger: ShipGiftTrigger;
  /** Module outfit for hulls without a hangar definition; absent means the hangar default. */
  moduleCommodityIds?: readonly number[];
}

/** Hawk hangar outfit plus the Astrometrie-Labor (commodity 19006). */
const SCOUT_MODULES = [
  10101, 10201, 10301, 10401, 10501, 10601, 10901, 19006,
] as const;

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
  {
    // Kyber-Kristallmine (Rebellen 251101): the research text promises a ship with an
    // Astrometrie-Labor.
    key: 'BRAHATOK_KYBER_MINE',
    shipClassKey: 'REBEL_CORVETTE_BRAHATOK',
    trigger: { type: 'RESEARCH', techIds: [251101] },
    moduleCommodityIds: SCOUT_MODULES,
  },
  {
    // Kyber-Kristallmine (Imperium 251103).
    key: 'LISTENER_KYBER_MINE',
    shipClassKey: 'EMPIRE_CORVETTE_LISTENER',
    trigger: { type: 'RESEARCH', techIds: [251103] },
    moduleCommodityIds: SCOUT_MODULES,
  },
];
