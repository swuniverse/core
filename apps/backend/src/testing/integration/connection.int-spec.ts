import { Faction } from '@swuniverse/shared';
import { FactionEntity } from '../../modules/faction/entities/faction.entity';
import { connectIntegrationDatabase } from './database';
import { createIntegrationDataSource } from './data-source';

describe('integration database connection', () => {
  it('discovers migrations but no specs, helpers or fixtures', async () => {
    const url = process.env.INTEGRATION_DATABASE_URL;
    if (!url) throw new Error('INTEGRATION_DATABASE_URL missing');
    const source = await createIntegrationDataSource(url).initialize();
    try {
      const names = source.migrations.map(
        (migration) => migration.name ?? migration.constructor.name,
      );
      expect(names).toContain('RepairColonyPopulationStats20260625100000');
      expect(names).toContain('MigrateBonusFieldBuildings20260702100000');
      expect(names).toContain('AddSpacecraftTakeovers20261102090000');
      expect(names.every((name) => /\d{13,14}$/.test(name ?? ''))).toBe(true);
    } finally {
      await source.destroy();
    }
  });

  it('provides both factions before any reset and does not duplicate them on reconnect', async () => {
    const first = await connectIntegrationDatabase();
    let second;
    try {
      const factions = await first
        .getRepository(FactionEntity)
        .find({ order: { key: 'ASC' } });
      expect(factions.map(({ key, name }) => ({ key, name }))).toEqual(
        [
          { key: Faction.GALACTIC_EMPIRE, name: 'Galaktisches Imperium' },
          { key: Faction.REBEL_ALLIANCE, name: 'Rebellenallianz' },
        ].sort((a, b) => a.key.localeCompare(b.key)),
      );
      second = await connectIntegrationDatabase();
      expect(
        await second
          .getRepository(FactionEntity)
          .find({ order: { key: 'ASC' } }),
      ).toEqual(factions);
    } finally {
      if (second?.isInitialized) await second.destroy();
      await first.destroy();
    }
  });
});
