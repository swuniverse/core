import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { CrewType } from '../colony/entities/crew.entity';
import { CrewEnhancementService } from '../spacecraft/crew-enhancement.service';
import type { MessagingService } from '../messaging/messaging.service';
import { EmptyPlotMaintenanceService } from '../rpg/empty-plot-maintenance.service';
import { CrewExperienceMaintenanceService } from './crew-experience-maintenance.service';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('maintenance handlers sh-AUD-11a (PostgreSQL)', () => {
  let source: DataSource;
  const now = new Date('2026-11-24T02:00:00Z');
  beforeAll(async () => {
    source = await connectIntegrationDatabase();
  });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  describe('crew-experience', () => {
    async function technicianAboard(userOverrides: Record<string, unknown> = {}) {
      const user = await createUser(source, userOverrides);
      const layer = await source.getRepository('Layer').save({ name: `L${user.id}`, width: 5, height: 5 });
      const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
      const field = await source
        .getRepository('GalaxyField')
        .save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
      const location = await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id });
      const shipClass = await source
        .getRepository('ShipClassDef')
        .save({ key: `MAINT_${user.id}`, name: 'Wartung', category: 'SHIP', role: 'SHIP' });
      const ship = await source.getRepository('Spacecraft').save({
        name: 'Schiff',
        userId: user.id,
        shipClassId: shipClass.id,
        locationId: location.id,
        runtimeSystems: {},
      });
      const crew = await source.getRepository('Crew').save({ userId: user.id, name: 'Technikerin', type: CrewType.TECHNICAL });
      await source
        .getRepository('CrewAssignment')
        .save({ crewId: crew.id, userId: user.id, spacecraftId: ship.id, slot: CrewType.TECHNICAL });
      return crew.id as number;
    }
    const expertise = async (crewId: number) =>
      ((await source.getRepository('CrewSkill').findOneBy({ crewId, position: CrewType.TECHNICAL })) as {
        expertise: number;
      } | null)?.expertise ?? 0;

    it('grants technical XP to player crews, not to NPCs or owners in effective vacation', async () => {
      const manned = await technicianAboard();
      const npc = await technicianAboard({ isNpc: true });
      const longVacation = await technicianAboard({ vacationMode: true, vacationStartedAt: new Date(now.getTime() - 49 * HOUR) });
      const freshVacation = await technicianAboard({ vacationMode: true, vacationStartedAt: new Date(now.getTime() - 47 * HOUR) });
      const handler = new CrewExperienceMaintenanceService(source, new CrewEnhancementService(source));

      await expect(handler.run(now)).resolves.toBe('2 Spacecraft Crew-XP');

      expect(await expertise(manned)).toBe(1);
      expect(await expertise(npc)).toBe(0);
      expect(await expertise(longVacation)).toBe(0);
      expect(await expertise(freshVacation)).toBe(1);
    });
  });

  describe('empty-rpg-plots', () => {
    it('deletes old plots without posts and notifies every member; keeps young plots and plots with posts', async () => {
      const [creator, member] = [await createUser(source), await createUser(source)];
      const plot = (title: string, ageDays: number) =>
        source.getRepository('RpgPlot').save({ creatorId: creator.id, title, startedAt: new Date(now.getTime() - ageDays * DAY) });
      const stale = await plot('Verwaist', 8);
      const young = await plot('Neuer Plot', 6);
      const active = await plot('Lebendig', 30);
      await source.getRepository('RpgPlotMember').save([
        { plotId: stale.id, userId: creator.id },
        { plotId: stale.id, userId: member.id },
      ]);
      await source
        .getRepository('HolonetPost')
        .save({ authorId: creator.id, title: 'Kapitel 1', body: 'Es war einmal', plotId: active.id });
      const sendSystem = jest.fn(async () => undefined);
      const handler = new EmptyPlotMaintenanceService(source, { sendSystem } as unknown as MessagingService);

      await expect(handler.run(now)).resolves.toBe('1 leere Plots gelöscht');

      const remaining = (await source.getRepository('RpgPlot').find({ order: { id: 'ASC' } })).map((row) => row.id);
      expect(remaining).toEqual([young.id, active.id]);
      expect(await source.getRepository('RpgPlotMember').countBy({ plotId: stale.id })).toBe(0);
      const text = 'Der Plot "Verwaist" wurde gelöscht, da er veraltet ist und keine Beiträge enthält.';
      expect(sendSystem.mock.calls.map((call) => [(call as unknown[])[0], (call as unknown[])[1]])).toEqual([
        [creator.id, text],
        [member.id, text],
      ]);
    });
  });
});
