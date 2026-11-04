import { DataSource } from 'typeorm';
import { createIntegrationDataSource, INTEGRATION_ENTITIES } from '../../testing/integration/data-source';
import { User } from '../auth/user.entity';
import { Alliance } from '../alliance/entities/alliance.entity';
import { AllianceMembership } from '../alliance/entities/alliance-membership.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import { UserSetting } from '../settings/entities/user-setting.entity';
import { SettingsService } from '../settings/settings.service';
import { InfluenceArea, InfluenceSourceType } from './entities/influence-area.entity';
import { InfluenceService } from './influence.service';

describe('player influence color (Postgres)', () => {
  let db: DataSource;
  const schema = `influence_color_${process.pid}_${Date.now()}`;

  beforeAll(async () => {
    const url = process.env.INTEGRATION_DATABASE_URL;
    if (!url) throw new Error('INTEGRATION_DATABASE_URL missing');
    db = createIntegrationDataSource(url);
    db.setOptions({
      entities: [...INTEGRATION_ENTITIES, InfluenceArea, UserSetting],
      // The normal migration suite requires the private game-data submodule.
      migrations: [],
      schema,
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.query(`
      CREATE TABLE "${schema}".user_settings ("userId" int NOT NULL, key varchar(64) NOT NULL, value varchar(255) NOT NULL, PRIMARY KEY ("userId", key));
      CREATE TABLE "${schema}".influence_areas (id serial PRIMARY KEY, "layerId" int NOT NULL, cx int NOT NULL, cy int NOT NULL, "sourceType" varchar(16) NOT NULL, "sourceId" int NOT NULL, radius int NOT NULL, strength float8 NOT NULL, "calculatedAt" timestamp NOT NULL DEFAULT now());
      CREATE TABLE "${schema}".alliances (id serial PRIMARY KEY, name varchar(40) NOT NULL, description text NOT NULL DEFAULT '', homepage varchar(255) NOT NULL DEFAULT '', color varchar(7), "factionId" int NOT NULL, "acceptsApplications" boolean NOT NULL DEFAULT false, "presidentTitle" varchar(30) NOT NULL DEFAULT '', "viceTitle" varchar(30) NOT NULL DEFAULT '', "diplomatTitle" varchar(30) NOT NULL DEFAULT '', "bannerKey" varchar(64), "bannerUpdatedAt" timestamp, "foundedAt" timestamp NOT NULL DEFAULT now());
      CREATE TABLE "${schema}".alliance_memberships (id serial PRIMARY KEY, "allianceId" int NOT NULL, "userId" int NOT NULL, role varchar(16) NOT NULL DEFAULT 'NONE', "joinedAt" timestamp NOT NULL DEFAULT now());
    `);
  });
  afterAll(async () => {
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await db.destroy();
    }
  });

  it('uses saved settings, current alliance color, and the updated personal color after leaving', async () => {
    const settings = new SettingsService(db.getRepository(User), db.getRepository(UserSetting), {} as never, {} as never, {} as never, {} as never);
    const influence = new InfluenceService(db.getRepository(InfluenceArea), db.getRepository(Alliance), db.getRepository(FactionEntity), db.getRepository(AllianceMembership), db.getRepository(UserSetting));

    await settings.updateSettings(7, { rgb_code: '#AaBbCc' });
    await influence.calculateInfluenceForLayer(1, [{ layerId: 1, cx: 1, cy: 1, radius: 0, strength: 1, sourceType: InfluenceSourceType.PLAYER, sourceId: 7 }]);
    const color = async () => (await influence.getInfluenceInSector(1, 1, 1, 1, 1))[0].color;
    expect(await color()).toBe('#aabbcc');

    await db.query(`INSERT INTO "${schema}".alliances (id, name, "factionId", color) VALUES (1, 'Test Alliance', 1, '#123456')`);
    await db.query(`INSERT INTO "${schema}".alliance_memberships ("allianceId", "userId") VALUES (1, 7)`);
    expect(await color()).toBe('#123456');
    await db.getRepository(Alliance).update(1, { color: null });
    expect(await color()).toBe('#aabbcc');
    await db.getRepository(Alliance).update(1, { color: '#123456' });
    await settings.updateSettings(7, { rgb_code: '#FEDCBA' });
    expect(await color()).toBe('#123456');
    await db.query(`DELETE FROM "${schema}".alliance_memberships WHERE "userId" = 7`);
    expect(await color()).toBe('#fedcba');
    await settings.updateSettings(7, { rgb_code: '' });
    expect(await color()).toBe('#64748b');
  });
});
