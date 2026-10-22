import { getRepositoryToken } from '@nestjs/typeorm';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { Faction } from '@swuniverse/shared';
import { connectIntegrationDatabase, createUser, factionId, resetDatabase } from '../../testing/integration/database';
import { User } from '../auth/user.entity';
import { JwtStrategy } from '../auth/jwt.strategy';
import { AdminGuard } from '../auth/admin.guard';
import { NewsController } from './news.controller';
import { News } from './entities/news.entity';
import { NewsService } from './news.service';

const JWT_SECRET = 'integration-secret';
type Actor = 'admin' | 'player' | 'anonymous';

describe('system news HTTP access (Postgres, HTTP)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let users: Record<Exclude<Actor, 'anonymous'>, User>;
  const jwt = new JwtService({ secret: JWT_SECRET });

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [NewsController],
      providers: [
        { provide: ConfigService, useValue: { get: () => JWT_SECRET } },
        { provide: getRepositoryToken(User), useValue: { findOneBy: ({ id }: { id: number }) => dataSource.getRepository(User).findOneBy({ id }) } },
        JwtStrategy,
        AdminGuard,
        { provide: NewsService, useFactory: () => new NewsService(dataSource.getRepository(News)) },
      ],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => { await app.close(); await dataSource.destroy(); });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    const rebels = await factionId(dataSource, Faction.REBEL_ALLIANCE);
    users = {
      admin: await createUser(dataSource, { username: 'admin', faction: Faction.REBEL_ALLIANCE, factionId: rebels, isAdmin: true }),
      player: await createUser(dataSource, { username: 'player', faction: Faction.REBEL_ALLIANCE, factionId: rebels }),
    };
  });

  async function call(actor: Actor, method: string, path: string, body?: unknown) {
    const user = actor === 'anonymous' ? null : users[actor];
    const response = await fetch(`${await app.getUrl()}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${jwt.sign({ sub: user.id, username: user.username, faction: user.faction, isAdmin: user.isAdmin })}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }

  it('allows only administrators to publish and keeps the latest five public in newest-first order', async () => {
    expect((await call('player', 'POST', '/news', { title: 'No', text: 'No', links: [], isChangelog: false })).status).toBe(403);
    for (let index = 1; index <= 6; index += 1) {
      const result = await call('admin', 'POST', '/news', {
        title: `News ${index}`,
        text: `[b]Text ${index}[/b]`,
        links: ['https://example.com/update', 'javascript:alert(1)'],
        isChangelog: index === 6,
      });
      expect(result.status).toBe(201);
    }
    const result = await call('anonymous', 'GET', '/news');
    expect(result.status).toBe(200);
    expect(result.body).toHaveLength(5);
    expect(result.body.map((item: { title: string }) => item.title)).toEqual(['News 6', 'News 5', 'News 4', 'News 3', 'News 2']);
    expect(result.body[0]).toMatchObject({ renderedText: '<strong>Text 6</strong>', links: ['https://example.com/update'], isChangelog: true });
    expect(result.body[0].authorId).toBeUndefined();
  });
});
