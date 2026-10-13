import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AllianceRole, Faction } from '@swuniverse/shared';
import {
  connectIntegrationDatabase,
  createUser,
  factionId,
  resetDatabase,
} from '../../testing/integration/database';
import { User } from '../auth/user.entity';
import { JwtStrategy } from '../auth/jwt.strategy';
import { MessagingService } from '../messaging/messaging.service';
import { ALLIANCE_ASSET_STORAGE } from './alliance-asset.port';
import { AllianceBannerController } from './alliance-banner.controller';
import { AllianceBannerService } from './alliance-banner.service';
import { AllianceRateLimiterService } from './alliance-rate-limiter.service';
import { AllianceController } from './alliance.controller';
import { AllianceService } from './alliance.service';
import { ALLIANCE_STORE } from './alliance.store';
import { FORUM_STORE } from './forum.store';
import { ForumService } from './forum.service';
import { MemberOverviewService } from './member-overview.service';
import { MEMBER_OPERATIONS_READER } from './member-operations.port';
import { InMemoryAssetStorage } from './testing/in-memory-asset-storage';
import { makePng } from './testing/png-fixtures';
import { TypeOrmAllianceStore } from './typeorm-alliance.store';
import { TypeOrmForumStore } from './typeorm-forum.store';

const { NONE, PRESIDENT, VICE, DIPLOMAT } = AllianceRole;
const JWT_SECRET = 'integration-secret';

type Actor =
  | 'president'
  | 'vice'
  | 'diplomat'
  | 'member'
  | 'loner'
  | 'foreignPresident'
  | 'anonymous';

/**
 * Direct HTTP requests against the real banner controller, JWT guard, services
 * and Postgres: the server alone decides who may change a banner.
 */
describe('alliance banner requests (Postgres, HTTP)', () => {
  let dataSource: DataSource;
  let app: INestApplication;
  let assets: InMemoryAssetStorage;
  let users: Record<Exclude<Actor, 'anonymous'>, User>;
  let rogueId: number;
  let redId: number;
  const jwt = new JwtService({ secret: JWT_SECRET });

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
    assets = new InMemoryAssetStorage();
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [AllianceBannerController, AllianceController],
      providers: [
        { provide: ConfigService, useValue: { get: () => JWT_SECRET } },
        JwtStrategy,
        AllianceService,
        AllianceBannerService,
        ForumService,
        {
          provide: AllianceRateLimiterService,
          useFactory: () => new AllianceRateLimiterService(dataSource),
        },
        { provide: ALLIANCE_ASSET_STORAGE, useValue: assets },
        {
          provide: ALLIANCE_STORE,
          useFactory: () => new TypeOrmAllianceStore(dataSource),
        },
        {
          provide: FORUM_STORE,
          useFactory: () => new TypeOrmForumStore(dataSource),
        },
        { provide: MemberOverviewService, useValue: {} },
        { provide: MEMBER_OPERATIONS_READER, useValue: {} },
        {
          provide: MessagingService,
          useValue: { sendSystem: async () => undefined },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
  });
  afterAll(async () => {
    await app.close();
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    assets.keys().forEach((key) => void assets.delete(key));
    const rebels = await factionId(dataSource, Faction.REBEL_ALLIANCE);
    const store = new TypeOrmAllianceStore(dataSource);
    const player = (username: string) =>
      createUser(dataSource, {
        username,
        displayName: username,
        faction: Faction.REBEL_ALLIANCE,
        factionId: rebels,
      });
    users = {
      president: await player('leia'),
      vice: await player('mon'),
      diplomat: await player('bail'),
      member: await player('han'),
      loner: await player('lando'),
      foreignPresident: await player('wedge'),
    };
    const found = async (
      name: string,
      members: [User, AllianceRole][],
    ): Promise<number> => {
      const alliance = await store.insertAlliance({
        name,
        description: 'Hallo $ALLIANCE_BANNER',
        factionId: rebels,
      });
      for (const [user, role] of members) {
        await store.insertMembership({
          allianceId: alliance.id,
          userId: user.id,
          role,
        });
      }
      return alliance.id;
    };
    rogueId = await found('Rogue Squadron', [
      [users.president, PRESIDENT],
      [users.vice, VICE],
      [users.diplomat, DIPLOMAT],
      [users.member, NONE],
    ]);
    redId = await found('Red Squadron', [[users.foreignPresident, PRESIDENT]]);
  });

  const authorization = (actor: Actor): Record<string, string> => {
    if (actor === 'anonymous') return {};
    const user = users[actor];
    return {
      Authorization: `Bearer ${jwt.sign({
        sub: user.id,
        username: user.username,
        faction: user.faction,
      })}`,
    };
  };

  async function upload(
    actor: Actor,
    allianceId: number,
    file: Buffer | null,
    options: { filename?: string; type?: string } = {},
  ) {
    const form = new FormData();
    if (file) {
      form.append(
        'file',
        new Blob([new Uint8Array(file)], {
          type: options.type ?? 'image/png',
        }),
        options.filename ?? 'banner.png',
      );
    }
    const response = await fetch(
      `${await app.getUrl()}/api/alliances/${allianceId}/banner`,
      { method: 'POST', headers: authorization(actor), body: form },
    );
    const text = await response.text();
    return { status: response.status, text };
  }

  async function remove(actor: Actor, allianceId: number) {
    const response = await fetch(
      `${await app.getUrl()}/api/alliances/${allianceId}/banner`,
      { method: 'DELETE', headers: authorization(actor) },
    );
    return response.status;
  }

  const bannerKeyOf = async (allianceId: number) =>
    (
      await dataSource.query(
        'SELECT "bannerKey" FROM "alliances" WHERE id = $1',
        [allianceId],
      )
    )[0].bannerKey as string | null;

  it('lets only president and vice upload, whoever the actor claims to be', async () => {
    const png = makePng(600, 150);
    const statuses: Record<string, number> = {};
    for (const actor of [
      'diplomat',
      'member',
      'loner',
      'foreignPresident',
      'anonymous',
    ] as const) {
      statuses[actor] = (await upload(actor, rogueId, png)).status;
    }
    expect(statuses).toEqual({
      diplomat: 403,
      member: 403,
      loner: 403,
      foreignPresident: 403,
      anonymous: 401,
    });
    expect(await bannerKeyOf(rogueId)).toBeNull();
    expect(assets.size).toBe(0);

    expect((await upload('vice', rogueId, png)).status).toBe(204);
    expect((await upload('president', rogueId, png)).status).toBe(204);
    expect(await bannerKeyOf(rogueId)).not.toBeNull();
    expect(assets.size).toBe(1);
    expect(await bannerKeyOf(redId)).toBeNull();
  });

  it('rejects removal by diplomat, member and foreign president', async () => {
    await upload('president', rogueId, makePng(10, 10));

    for (const actor of ['diplomat', 'member', 'foreignPresident'] as const) {
      expect(await remove(actor, rogueId)).toBe(403);
    }
    expect(await remove('anonymous', rogueId)).toBe(401);
    expect(await bannerKeyOf(rogueId)).not.toBeNull();

    expect(await remove('vice', rogueId)).toBe(204);
    expect(await bannerKeyOf(rogueId)).toBeNull();
    expect(assets.size).toBe(0);
  });

  it('never lets a manipulated id reach a foreign alliance, in the path or in the form', async () => {
    const png = makePng(10, 10);
    // The own president aims at the other alliance.
    expect((await upload('president', redId, png)).status).toBe(403);
    expect(await remove('president', redId)).toBe(403);
    // Ids that are no ids at all.
    const base = `${await app.getUrl()}/api/alliances`;
    for (const id of ['abc', '1.5', '-1', '0']) {
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(png)]), 'banner.png');
      const response = await fetch(`${base}/${id}/banner`, {
        method: 'POST',
        headers: authorization('president'),
        body: form,
      });
      expect([400, 404]).toContain(response.status);
    }
    // Smuggled ids and actor fields in the form are ignored.
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(png)]), 'banner.png');
    form.append('allianceId', String(redId));
    form.append('userId', String(users.foreignPresident.id));
    const smuggled = await fetch(`${base}/${rogueId}/banner`, {
      method: 'POST',
      headers: authorization('member'),
      body: form,
    });
    expect(smuggled.status).toBe(403);
    expect(await bannerKeyOf(redId)).toBeNull();
    expect(await bannerKeyOf(rogueId)).toBeNull();
    expect(assets.size).toBe(0);
    // Removal without a banner and in unknown alliances is a plain error.
    expect(await remove('president', rogueId)).toBe(400);
    expect(await remove('president', 99999)).toBe(404);
    expect(await remove('loner', rogueId)).toBe(403);
  });

  it('answers unknown alliances with 404 and a missing file with a clear message', async () => {
    expect((await upload('president', 99999, makePng(10, 10))).status).toBe(
      404,
    );
    const missing = await upload('president', rogueId, null);
    expect(missing.status).toBe(400);
    expect(JSON.parse(missing.text).message).toBe(
      'Bitte wähle eine PNG-Datei aus',
    );
  });

  it('decides by content: disguised files are refused whatever name and type say', async () => {
    const cases: Array<[Buffer, string, string]> = [
      [Buffer.from('<svg onload="alert(1)"/>'), 'banner.png', 'image/png'],
      [
        Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]),
        'banner.png',
        'image/png',
      ],
      [
        Buffer.concat([makePng(10, 10), Buffer.from('<script>x</script>')]),
        'banner.png',
        'image/png',
      ],
    ];
    for (const [file, filename, type] of cases) {
      const result = await upload('president', rogueId, file, {
        filename,
        type,
      });
      expect(result.status).toBe(400);
    }
    // A real PNG with a wrong name and content type is accepted.
    expect(
      (
        await upload('president', rogueId, makePng(10, 10), {
          filename: 'banner.txt',
          type: 'text/plain',
        })
      ).status,
    ).toBe(204);
  });

  it('decides the 200 KB and 600 x 150 limits at the boundary', async () => {
    expect((await upload('president', rogueId, makePng(601, 150))).status).toBe(
      400,
    );
    expect((await upload('president', rogueId, makePng(600, 151))).status).toBe(
      400,
    );
    expect((await upload('president', rogueId, makePng(600, 150))).status).toBe(
      204,
    );
  });

  it('answers an upload beyond the transport cap with the German size message', async () => {
    const huge = Buffer.alloc(3 * 1024 * 1024, 1);
    const result = await upload('president', rogueId, huge);
    expect(result.status).toBe(400);
    expect(JSON.parse(result.text).message).toBe(
      'Das Banner darf höchstens 200 KB groß sein',
    );
  });

  it('serves the banner publicly as image/png with nosniff, and 404 without banner', async () => {
    const url = `${await app.getUrl()}/api/alliances/${rogueId}/banner`;
    expect((await fetch(url)).status).toBe(404);

    await upload('president', rogueId, makePng(30, 15));

    for (const actor of ['anonymous', 'loner', 'foreignPresident'] as const) {
      const response = await fetch(url, { headers: authorization(actor) });
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/png');
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('cache-control')).toBe('no-cache');
      const bytes = Buffer.from(await response.arrayBuffer());
      expect(bytes.subarray(1, 4).toString()).toBe('PNG');
    }
    const versioned = await fetch(`${url}?v=123`);
    expect(versioned.headers.get('cache-control')).toBe(
      'public, max-age=31536000, immutable',
    );
    expect(
      (await fetch(`${await app.getUrl()}/api/alliances/${redId}/banner`))
        .status,
    ).toBe(404);
  });

  it('exposes uploaded banner data through the alliance list', async () => {
    expect((await upload('vice', rogueId, makePng(30, 15))).status).toBe(204);

    const list = (await (
      await fetch(`${await app.getUrl()}/api/alliances`, {
        headers: authorization('member'),
      })
    ).json()) as Array<{
      id: number;
      banner: { url: string } | null;
      members: Array<{
        userId: number;
        name: string;
        avatar: string | null;
        faction: Faction | null;
      }>;
    }>;

    expect(list).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: rogueId,
          banner: expect.objectContaining({
            url: expect.stringMatching(
              new RegExp(`^/api/alliances/${rogueId}/banner\\?v=\\d+$`),
            ),
          }),
          members: [
            {
              userId: users.president.id,
              name: 'leia',
              avatar: null,
              faction: Faction.REBEL_ALLIANCE,
            },
            {
              userId: users.vice.id,
              name: 'mon',
              avatar: null,
              faction: Faction.REBEL_ALLIANCE,
            },
            {
              userId: users.diplomat.id,
              name: 'bail',
              avatar: null,
              faction: Faction.REBEL_ALLIANCE,
            },
            {
              userId: users.member.id,
              name: 'han',
              avatar: null,
              faction: Faction.REBEL_ALLIANCE,
            },
          ],
        }),
        expect.objectContaining({
          id: redId,
          banner: null,
          members: [
            {
              userId: users.foreignPresident.id,
              name: 'wedge',
              avatar: null,
              faction: Faction.REBEL_ALLIANCE,
            },
          ],
        }),
      ]),
    );
  });

  it('exposes banner data and the capability in the shared detail DTO', async () => {
    await upload('vice', rogueId, makePng(30, 15));
    const detail = async (actor: Actor) =>
      (
        await fetch(`${await app.getUrl()}/api/alliances/${rogueId}`, {
          headers: authorization(actor),
        })
      ).json();

    const asVice = (await detail('vice')) as any;
    expect(asVice.banner.url).toMatch(
      new RegExp(`^/api/alliances/${rogueId}/banner\\?v=\\d+$`),
    );
    expect(asVice.viewer.actions.manageBanner).toBe(true);
    expect(
      ((await detail('diplomat')) as any).viewer.actions.manageBanner,
    ).toBe(false);
    expect(((await detail('member')) as any).viewer.actions.manageBanner).toBe(
      false,
    );
  });

  it('persists the chronicle with small metadata and the actor', async () => {
    await upload('vice', rogueId, makePng(30, 15));
    await remove('president', rogueId);

    const rows = await dataSource.query(
      `SELECT "eventType", "actorName", "metadata" FROM "alliance_chronicle_entries"
       WHERE "allianceId" = $1 AND "eventType" LIKE 'BANNER_%' ORDER BY id`,
      [rogueId],
    );
    expect(rows).toEqual([
      {
        eventType: 'BANNER_SET',
        actorName: 'mon',
        metadata: { width: 30, height: 15, replaced: false },
      },
      { eventType: 'BANNER_REMOVED', actorName: 'leia', metadata: null },
    ]);
  });

  it('rate limits banner changes durably per actor', async () => {
    const png = makePng(10, 10);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await upload('president', rogueId, png)).status).toBe(204);
    }
    const limited = await upload('president', rogueId, png);
    expect(limited.status).toBe(400);
    expect(JSON.parse(limited.text).message).toBe(
      'Du änderst das Banner zu schnell. Bitte warte einen Moment',
    );
    // Another actor keeps their own budget.
    expect((await upload('vice', rogueId, png)).status).toBe(204);
  });

  it('keeps unauthorised attempts out of the rate limit budget', async () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await upload('member', rogueId, makePng(10, 10));
    }
    const rows = await dataSource.query(
      `SELECT COUNT(*)::int AS n FROM "diplomacy_rate_limits" WHERE "command" = 'banner'`,
    );
    expect(rows[0].n).toBe(0);
  });
});
