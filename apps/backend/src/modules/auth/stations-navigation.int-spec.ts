import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { Crew, CrewType } from '../colony/entities/crew.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { Award } from '../awards/entities/award.entity';
import { UserAward } from '../awards/entities/user-award.entity';
import { AuthService } from './auth.service';
import { User } from './user.entity';

/** STU GameTwigRenderer::hasStationsNavigation plus own stations (sc-AUD-27). */
describe('stations navigation flag (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = await connectIntegrationDatabase();
  });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  const service = () =>
    Object.assign(Object.create(AuthService.prototype), {
      userRepo: source.getRepository(User),
      dataSource: source,
    }) as AuthService;
  const flag = async (userId: number) =>
    (await service().getProfile(userId)).hasStationsNavigation;

  async function station(userId: number, status = 'IDLE') {
    const shipClass = await source.getRepository('ShipClassDef').save({
      key: `NAV_${userId}_${status}`,
      name: 'Station',
      category: 'STATION',
      role: 'SENSOR',
    });
    const layer = await source.getRepository('Layer').save({ name: 'Nav', width: 5, height: 5 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source
      .getRepository('GalaxyField')
      .save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    const location = await source
      .getRepository('SpaceLocation')
      .findOneByOrFail({ galaxyFieldId: field.id });
    return source.getRepository('Spacecraft').save({
      name: 'Phalanx',
      userId,
      shipClassId: shipClass.id,
      locationId: location.id,
      kind: 'STATION',
      status,
      runtimeSystems: {},
    });
  }

  it('hides the entry for a player without stations', async () => {
    const user = await createUser(source);
    expect(await flag(user.id)).toBe(false);
  });

  it('shows it for an NPC', async () => {
    const user = await createUser(source, { isNpc: true });
    expect(await flag(user.id)).toBe(true);
  });

  it('shows it with the station research award', async () => {
    const user = await createUser(source);
    await source.getRepository(Award).save({
      key: 'RESEARCH_STATIONS',
      description: 'Stationsforschung abgeschlossen',
      image: 'award.png',
    });
    await source.getRepository(UserAward).save({ userId: user.id, awardKey: 'RESEARCH_STATIONS' });
    expect(await flag(user.id)).toBe(true);
  });

  it('shows it for an own station, not a destroyed one', async () => {
    const owner = await createUser(source);
    await station(owner.id, 'DESTROYED');
    expect(await flag(owner.id)).toBe(false);
    await station(owner.id);
    expect(await flag(owner.id)).toBe(true);
  });

  it('shows it with own crew on a foreign station', async () => {
    const owner = await createUser(source);
    const guest = await createUser(source);
    const foreign = await station(owner.id);
    const crewRepo = source.getRepository(Crew);
    const member = await crewRepo.save(
      crewRepo.create({ userId: guest.id, type: CrewType.CREWMAN, name: 'Gast' }),
    );
    await source.getRepository(CrewAssignment).save({
      crewId: member.id,
      userId: guest.id,
      spacecraftId: foreign.id,
      colonyId: null,
      slot: CrewType.CREWMAN,
    });
    expect(await flag(guest.id)).toBe(true);
  });
});
