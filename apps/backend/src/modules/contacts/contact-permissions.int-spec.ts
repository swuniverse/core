import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AllianceRelationshipType, AllianceRole, ContactMode, Faction, type ContactDto } from '@swuniverse/shared';
import { DataSource } from 'typeorm';
import { createUser, factionId } from '../../testing/integration/database';
import { FactionEntity } from '../faction/entities/faction.entity';
import { createIntegrationDataSource, INTEGRATION_ENTITIES } from '../../testing/integration/data-source';
import { User } from '../auth/user.entity';
import { JwtStrategy } from '../auth/jwt.strategy';
import { MessagingService } from '../messaging/messaging.service';
import { ContactController } from './contact.controller';
import { ContactStatusAdapter } from './contact-status.adapter';
import { RelationshipResolverService } from '../alliance/relationship-resolver.service';
import { TypeOrmAllianceStore } from '../alliance/typeorm-alliance.store';
import { StarmapVisibilityService } from '../spacecraft/starmap-visibility.service';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { GalaxyFieldType } from '../starmap/entities/galaxy-field-type.entity';
import { SpaceLocation, SpaceLocationKind } from '../starmap/entities/space-location.entity';
import { AddContactPermissions20261104160000 } from '../../database/migrations/20261104160000-add-contact-permissions';
import { ContactService } from './contact.service';
import { Contact } from './entities/contact.entity';

const JWT_SECRET = 'contact-permissions-test';

describe('one-sided contact permissions (Postgres, HTTP)', () => {
  let database: DataSource;
  let observer: DataSource;
  let publicSchemaBefore: unknown;
  const schema = `contact_permissions_${randomUUID().replace(/-/g, '')}`;
  let schemaCreated = false;
  let app: INestApplication;
  let grantor: User;
  let recipient: User;
  const jwt = new JwtService({ secret: JWT_SECRET });

  beforeAll(async () => {
    const url = process.env.INTEGRATION_DATABASE_URL;
    if (!url) throw new Error('Integration database URL missing');
    observer = await new DataSource({ type: 'postgres', url }).initialize();
    publicSchemaBefore = await publicSchemaObjects();
    await observer.query(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    database = createIntegrationDataSource(url);
    database.setOptions({
      migrations: [],
      entities: [...INTEGRATION_ENTITIES, Contact],
      schema,
      // Raw SQL in the migration and store must use the same isolated schema
      // on every pooled connection, without falling back to public.
      extra: { options: `-c search_path=${schema}` },
      synchronize: true,
      installExtensions: false,
    });
    await database.initialize();
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [ContactController],
      providers: [
        ContactService,
        JwtStrategy,
        { provide: ConfigService, useValue: { get: () => JWT_SECRET } },
        { provide: getRepositoryToken(User), useValue: database.getRepository(User) },
        { provide: getRepositoryToken(Contact), useValue: database.getRepository(Contact) },
        { provide: MessagingService, useValue: { sendSystem: async () => undefined } },
      ],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      try {
        if (database?.isInitialized) await database.destroy();
      } finally {
        if (observer?.isInitialized) {
          try {
            if (schemaCreated) await observer.query(`DROP SCHEMA "${schema}" CASCADE`);
            if (publicSchemaBefore !== undefined) {
              expect(await publicSchemaObjects()).toEqual(publicSchemaBefore);
            }
          } finally {
            await observer.destroy();
          }
        }
      }
    }
  });

  async function publicSchemaObjects() {
    return {
      relations: await observer.query(`
        SELECT c.relname, c.relkind, a.attname, pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
          a.attnotnull, pg_get_expr(d.adbin, d.adrelid) AS default_value,
          CASE WHEN c.relkind IN ('i', 'I') THEN pg_get_indexdef(c.oid) END AS index_definition,
          CASE WHEN c.relkind IN ('v', 'm') THEN pg_get_viewdef(c.oid) END AS view_definition
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
        LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'i', 'I', 'f')
        ORDER BY c.relname, a.attnum
      `),
      constraints: await observer.query(`
        SELECT c.relname, con.conname, pg_get_constraintdef(con.oid) AS definition
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        ORDER BY c.relname, con.conname
      `),
      enums: await observer.query(`
        SELECT t.typname, e.enumlabel, e.enumsortorder
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE n.nspname = 'public'
        ORDER BY t.typname, e.enumsortorder
      `),
      routines: await observer.query(`
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS arguments,
          pg_get_functiondef(p.oid) AS definition
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p', 'w')
        ORDER BY p.proname, arguments
      `),
    };
  }

  it('does not create or alter public schema objects when starting the harness', async () => {
    expect(await publicSchemaObjects()).toEqual(publicSchemaBefore);
  });

  beforeEach(async () => {
    const tables: Array<{ tablename: string }> = await database.query(
      'SELECT tablename FROM pg_tables WHERE schemaname = $1', [schema],
    );
    if (tables.length) {
      await database.query(`TRUNCATE ${tables.map(({ tablename }) => `"${schema}"."${tablename.replace(/"/g, '""')}"`).join(', ')} RESTART IDENTITY CASCADE`);
    }
    await database.getRepository(FactionEntity).insert([
      { key: Faction.REBEL_ALLIANCE, name: 'Rebellenallianz', colorPrimary: '#ffffff', colorSecondary: '#000000' },
      { key: Faction.GALACTIC_EMPIRE, name: 'Galaktisches Imperium', colorPrimary: '#ffffff', colorSecondary: '#000000' },
    ]);
    const rebels = await factionId(database, Faction.REBEL_ALLIANCE);
    grantor = await createUser(database, { username: 'grantor', factionId: rebels });
    recipient = await createUser(database, { username: 'recipient', factionId: rebels });
  });

  async function request(user: User, path: string, method = 'GET', body?: unknown) {
    const response = await fetch(`${await app.getUrl()}/contacts${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${jwt.sign({ sub: user.id })}`,
        'Content-Type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  }

  async function createContact(): Promise<ContactDto> {
    const response = await request(grantor, '', 'POST', { playerId: recipient.id, mode: ContactMode.NEUTRAL });
    expect(response.status).toBe(201);
    return response.body as ContactDto;
  }

  it('migrates existing contacts with closed defaults and reverts without losing contacts', async () => {
    const contact = await createContact();
    const runner = database.createQueryRunner();
    const migration = new AddContactPermissions20261104160000();
    await runner.startTransaction();
    try {
      await runner.query('ALTER TABLE "contacts" DROP COLUMN "treatAsFriend", DROP COLUMN "shareLivePositions"');
      await migration.up(runner);
      const migrated = await runner.manager.getRepository(Contact).findOneByOrFail({ id: contact.id });
      expect(migrated).toMatchObject({ mode: ContactMode.NEUTRAL, treatAsFriend: false, shareLivePositions: false });
      await migration.down(runner);
      expect(await runner.hasColumn('contacts', 'treatAsFriend')).toBe(false);
      expect(await runner.hasColumn('contacts', 'shareLivePositions')).toBe(false);
      expect(await runner.query('SELECT "id", "mode" FROM "contacts"')).toEqual([{ id: contact.id, mode: 'NEUTRAL' }]);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });

  function resolver() {
    return new RelationshipResolverService(
      new TypeOrmAllianceStore(database),
      new ContactStatusAdapter(app.get(ContactService)),
    );
  }

  it('treats a neutral contact as Freund only from the grantor’s perspective', async () => {
    const contact = await createContact();
    const relationships = resolver();
    expect((await relationships.resolve(grantor.id, recipient.id)).status).toBe('NEUTRAL');
    await request(grantor, `/${contact.id}/permissions`, 'PATCH', { treatAsFriend: true });
    expect(await relationships.resolve(grantor.id, recipient.id)).toMatchObject({
      status: 'FRIEND', mayTransferSafely: true, mayShareLivePosition: false,
      mayShareHistoricalScans: false, mayShareAllianceMap: false,
    });
    expect((await relationships.resolve(recipient.id, grantor.id)).status).toBe('NEUTRAL');
    await request(grantor, `/${contact.id}/permissions`, 'PATCH', { treatAsFriend: false });
    expect((await relationships.resolve(grantor.id, recipient.id)).status).toBe('NEUTRAL');
  });

  it('keeps faction hostility and Allianzkrieg above contact grants', async () => {
    const contact = await createContact();
    await request(grantor, `/${contact.id}/mode`, 'PATCH', { mode: ContactMode.ENEMY });
    await request(grantor, `/${contact.id}/permissions`, 'PATCH', { treatAsFriend: true, shareLivePositions: true });
    const relationships = resolver();
    expect((await relationships.resolve(grantor.id, recipient.id)).status).toBe('FRIEND');
    expect(await relationships.resolve(recipient.id, grantor.id)).toMatchObject({ status: 'NEUTRAL', mayShareLivePosition: true });
    const empire = await factionId(database, Faction.GALACTIC_EMPIRE);
    await database.getRepository(User).update(recipient.id, { factionId: empire });
    expect(await relationships.resolve(grantor.id, recipient.id)).toMatchObject({ status: 'ENEMY', mayShareLivePosition: false });
    expect(await relationships.resolve(recipient.id, grantor.id)).toMatchObject({ status: 'ENEMY', mayShareLivePosition: false });
    await database.getRepository(User).update(recipient.id, { factionId: grantor.factionId });
    const store = new TypeOrmAllianceStore(database);
    const faction = await factionId(database, Faction.REBEL_ALLIANCE);
    const first = await store.insertAlliance({ name: 'First', description: '', factionId: faction });
    const second = await store.insertAlliance({ name: 'Second', description: '', factionId: faction });
    await store.insertMembership({ allianceId: first.id, userId: grantor.id, role: AllianceRole.PRESIDENT });
    await store.insertMembership({ allianceId: second.id, userId: recipient.id, role: AllianceRole.PRESIDENT });
    await store.transaction((tx) => tx.replaceRelationshipsWithWar(first.id, second.id));
    expect(await relationships.resolve(grantor.id, recipient.id)).toMatchObject({ status: 'ENEMY', mayShareLivePosition: false });
    expect(await relationships.resolve(recipient.id, grantor.id)).toMatchObject({ status: 'ENEMY', mayShareLivePosition: false });
  });

  it('preserves negotiated grants after contact revocation', async () => {
    const contact = await createContact();
    const store = new TypeOrmAllianceStore(database);
    const faction = await factionId(database, Faction.REBEL_ALLIANCE);
    const first = await store.insertAlliance({ name: 'First', description: '', factionId: faction });
    const second = await store.insertAlliance({ name: 'Second', description: '', factionId: faction });
    await store.insertMembership({ allianceId: first.id, userId: grantor.id, role: AllianceRole.PRESIDENT });
    await store.insertMembership({ allianceId: second.id, userId: recipient.id, role: AllianceRole.PRESIDENT });
    const proposal = await store.insertRelationshipProposal({
      senderAllianceId: first.id, recipientAllianceId: second.id,
      type: AllianceRelationshipType.ALLIANCE, contract: '', treatAsFriend: true, shareLivePositions: true,
    });
    await store.transaction((tx) => tx.acceptRelationshipProposal(proposal.id));
    await request(grantor, `/${contact.id}/permissions`, 'PATCH', { treatAsFriend: true, shareLivePositions: true });
    await request(grantor, `/${contact.id}/permissions`, 'PATCH', { treatAsFriend: false, shareLivePositions: false });
    expect(await resolver().resolve(recipient.id, grantor.id)).toMatchObject({ status: 'FRIEND', mayShareLivePosition: true });
    expect(await resolver().resolve(grantor.id, recipient.id)).toMatchObject({ status: 'FRIEND', mayShareLivePosition: true });
  });

  it('shares only the grantor’s ships with the recipient on both visibility interfaces', async () => {
    const contact = await createContact();
    const layer = await database.getRepository(Layer).save({ name: 'Contacts', width: 10, height: 10 });
    let fieldType = await database.getRepository(GalaxyFieldType).findOneBy({ key: 'contact-test-space' });
    fieldType ??= await database.getRepository(GalaxyFieldType).save({ key: 'contact-test-space', name: 'Space' });
    const shipClass = await database.getRepository(ShipClassDef).save({ key: 'test-ship', name: 'Test', category: 'SHIP', role: 'SCOUT' });
    for (const owner of [grantor, recipient]) {
      const field = await database.getRepository(GalaxyField).save({ layerId: layer.id, cx: owner.id, cy: 1, fieldTypeId: fieldType.id });
      const location = await database.getRepository(SpaceLocation).save({ kind: SpaceLocationKind.GALAXY_FIELD, galaxyFieldId: field.id });
      await database.getRepository(Spacecraft).save({ name: `${owner.username}-ship`, userId: owner.id, shipClassId: shipClass.id, locationId: location.id });
    }
    const visibility = new StarmapVisibilityService(
      database.getRepository(Spacecraft), resolver(), database.getRepository(Layer),
      { getSensorRange: async () => 0 },
    );
    expect(await visibility.listSharedLivePositions(recipient.id)).toEqual([]);
    await request(grantor, `/${contact.id}/permissions`, 'PATCH', { shareLivePositions: true });
    expect(await visibility.listSharedLivePositions(recipient.id)).toEqual([
      expect.objectContaining({ ownerId: grantor.id, spacecraftName: 'grantor-ship' }),
    ]);
    expect(await visibility.listSharedLivePositions(grantor.id)).toEqual([]);
    const map = await visibility.listContacts(recipient.id, layer.id);
    expect(map.contacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ ownerId: grantor.id, reason: 'SHARED_LIVE_POSITION', stance: 'NEUTRAL' }),
      expect.objectContaining({ ownerId: recipient.id, reason: 'OWN' }),
    ]));
    expect(map.contacts.find((ship) => ship.ownerId === grantor.id)?.management).toBeUndefined();
    expect((await visibility.listContacts(grantor.id, layer.id)).contacts.map((ship) => ship.ownerId)).toEqual([grantor.id]);
    await request(grantor, `/${contact.id}/permissions`, 'PATCH', { shareLivePositions: false });
    expect(await visibility.listSharedLivePositions(recipient.id)).toEqual([]);
    expect((await visibility.listContacts(recipient.id, layer.id)).contacts.map((ship) => ship.ownerId)).toEqual([recipient.id]);

    // Contact sharing is individual, even when the grantor has an alliance.
    const store = new TypeOrmAllianceStore(database);
    const faction = await factionId(database, Faction.REBEL_ALLIANCE);
    const mate = await createUser(database, { username: 'mate', factionId: faction });
    const alliance = await store.insertAlliance({ name: 'Sharers', description: '', factionId: faction });
    await store.insertMembership({ allianceId: alliance.id, userId: grantor.id, role: AllianceRole.PRESIDENT });
    await store.insertMembership({ allianceId: alliance.id, userId: mate.id, role: AllianceRole.NONE });
    await request(grantor, `/${contact.id}/permissions`, 'PATCH', { shareLivePositions: true });
    expect((await resolver().starmapCandidates(recipient.id)).partnerIds).toEqual([grantor.id]);
    await store.insertMembership({ allianceId: alliance.id, userId: recipient.id, role: AllianceRole.NONE });
    expect((await visibility.listContacts(recipient.id, layer.id)).contacts.find((ship) => ship.ownerId === grantor.id)).toMatchObject({ reason: 'ALLIANCE' });
    expect(await resolver().resolve(recipient.id, grantor.id)).toMatchObject({ status: 'FRIEND', mayShareLivePosition: true, mayShareAllianceMap: true });
  });

  it('rejects foreign edits and malformed permission values without granting access', async () => {
    const contact = await createContact();
    expect((await request(recipient, `/${contact.id}/permissions`, 'PATCH', { shareLivePositions: true })).status).toBe(404);
    for (const body of [
      { treatAsFriend: 'false' },
      { shareLivePositions: 1 },
      { treatAsFriend: null },
      null,
      {},
      { shareLivePositions: true, userId: recipient.id },
    ]) {
      expect((await request(grantor, `/${contact.id}/permissions`, 'PATCH', body)).status).toBe(400);
    }
    expect((await request(grantor, '')).body).toEqual([
      expect.objectContaining({ treatAsFriend: false, shareLivePositions: false }),
    ]);
  });

  it('persists independent permissions only on the grantor’s contact', async () => {
    const contact = await createContact();
    expect(contact).toMatchObject({ treatAsFriend: false, shareLivePositions: false });
    const updated = await request(grantor, `/${contact.id}/permissions`, 'PATCH', { treatAsFriend: true });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ treatAsFriend: true, shareLivePositions: false, mode: ContactMode.NEUTRAL });
    await request(grantor, `/${contact.id}/permissions`, 'PATCH', { shareLivePositions: true });
    expect((await request(grantor, '')).body).toEqual([
      expect.objectContaining({ treatAsFriend: true, shareLivePositions: true }),
    ]);
    expect((await request(recipient, '')).body).toEqual([]);
    await request(grantor, `/${contact.id}/permissions`, 'PATCH', { treatAsFriend: false, shareLivePositions: false });
    expect((await request(grantor, '')).body).toEqual([
      expect.objectContaining({ treatAsFriend: false, shareLivePositions: false }),
    ]);
  });
});
