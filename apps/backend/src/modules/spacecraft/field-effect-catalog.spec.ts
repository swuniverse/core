import {
  FIELD_EFFECT_KEYS,
  FieldEffect,
  fieldEffectDefinition,
  knownFieldEffects,
} from '@swuniverse/shared';

describe('field effect catalog', () => {
  it('contains the complete STU field effect list', () => {
    expect(FIELD_EFFECT_KEYS).toEqual([
      'WARPDRIVE_LEAK', 'REACTOR_LEAK', 'EPS_LEAK', 'CLOAK_UNUSEABLE',
      'NFS_MALFUNCTION_COOLDOWN', 'LSS_MALFUNCTION', 'SHIELD_MALFUNCTION',
      'NO_SPACECRAFT_COUNT', 'DUBIOUS_SPACECRAFT_COUNT', 'NO_SUBSPACE_LINES',
      'ENERGY_WEAPON_BUFF', 'REGENERATION_CHANCE', 'ENERGY_WEAPON_NERF',
      'HIT_CHANCE_INTERFERENCE', 'EVADE_CHANCE_INTERFERENCE', 'NO_PIRATES',
      'NO_ANOMALIES', 'NO_MEASUREPOINT', 'NO_STATION_CONSTRUCTION', 'LSS_BLOCKADE',
    ]);
  });

  it('provides player-facing metadata and active flags', () => {
    for (const effect of FIELD_EFFECT_KEYS) {
      const metadata = fieldEffectDefinition(effect);
      expect(metadata.description).not.toHaveLength(0);
      expect(metadata.destinationInfo).not.toHaveLength(0);
      expect(typeof metadata.active).toBe('boolean');
    }
    expect(fieldEffectDefinition(FieldEffect.WARPDRIVE_LEAK).description).toContain('Hyperantrieb');
  });

  it('filters unknown persisted effects', () => {
    expect(knownFieldEffects(['EPS_LEAK', 'LEGACY_UNKNOWN', 'NO_ANOMALIES'])).toEqual([
      FieldEffect.EPS_LEAK,
      FieldEffect.NO_ANOMALIES,
    ]);
  });
});
