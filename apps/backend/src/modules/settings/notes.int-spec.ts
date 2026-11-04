import type { NoteDto } from '@swuniverse/shared';
import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Entity, PrimaryColumn } from 'typeorm';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { Note } from './entities/note.entity';

@Entity('users')
class User {
  @PrimaryColumn({ type: 'int' })
  id!: number;
}

describe('Personal note collection API', () => {
  let app: INestApplication;
  let db: DataSource;
  let baseUrl: string;
  const schema = `notes_api_${process.pid}`;

  beforeAll(async () => {
    db = new DataSource({
      type: 'postgres',
      url: process.env.INTEGRATION_DATABASE_URL,
      schema,
      entities: [Note, User],
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.synchronize();
    await db.query(`INSERT INTO "${schema}"."users" (id) VALUES (7), (8)`);
    const module = await Test.createTestingModule({
      controllers: [NotesController],
      providers: [
        NotesService,
        { provide: getRepositoryToken(Note), useValue: db.getRepository(Note) },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context
            .switchToHttp()
            .getRequest<{
              headers: Record<string, string>;
              user: { sub: number };
            }>();
          if (!req.headers['x-test-user']) return false;
          req.user = { sub: Number(req.headers['x-test-user']) };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA "${schema}" CASCADE`);
      await db.destroy();
    }
  });

  const request = (path = '', method = 'GET', body?: unknown, userId = 7) =>
    fetch(`${baseUrl}/user/notes${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-test-user': String(userId),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  beforeEach(async () => {
    await db.getRepository(Note).clear();
  });

  it('creates a titled note with text and server dates that can be read again', async () => {
    const response = await request('', 'POST', {
      title: 'Briefing',
      text: 'Treffpunkt Hoth',
      userId: 8,
    });
    expect(response.status).toBe(201);
    const note = (await response.json()) as NoteDto;
    expect(note).toMatchObject({
      title: 'Briefing',
      text: 'Treffpunkt Hoth',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(note).not.toHaveProperty('userId');
    const read = await request(`/${note.id}`);
    expect(read.status).toBe(200);
    expect(await read.json()).toEqual(note);
    expect(await (await request()).json()).toEqual([note]);
    expect(await (await request('', 'GET', undefined, 8)).json()).toEqual([]);
  });

  it.each(['', 'x'.repeat(101), null, 12])(
    'rejects invalid title %# on creation',
    async (title) => {
      expect((await request('', 'POST', { title, text: '' })).status).toBe(400);
      expect(await (await request()).json()).toEqual([]);
    },
  );

  it.each(['a', 'x'.repeat(100)])(
    'accepts title boundary %#',
    async (title) => {
      expect((await request('', 'POST', { title, text: '' })).status).toBe(201);
    },
  );

  it('rejects invalid text and oversized text', async () => {
    expect(
      (await request('', 'POST', { title: 'Plan', text: null })).status,
    ).toBe(400);
    expect(
      (await request('', 'POST', { title: 'Plan', text: 'x'.repeat(100_001) }))
        .status,
    ).toBe(400);
  });

  it('updates title and text without changing the creation date', async () => {
    const note = (await (
      await request('', 'POST', { title: 'Plan', text: '' })
    ).json()) as NoteDto;
    const response = await request(`/${note.id}`, 'PATCH', {
      title: 'Route',
      text: 'Hoth → Endor',
    });
    expect(response.status).toBe(200);
    const updated = (await response.json()) as NoteDto;
    expect(updated).toMatchObject({
      id: note.id,
      title: 'Route',
      text: 'Hoth → Endor',
      createdAt: note.createdAt,
    });
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(
      Date.parse(note.updatedAt),
    );
    expect(await (await request(`/${note.id}`)).json()).toEqual(updated);
    expect(
      (await request(`/${note.id}`, 'PATCH', { title: '', text: '' })).status,
    ).toBe(400);
    expect(
      (
        await request(`/${note.id}`, 'PATCH', {
          title: 'x'.repeat(101),
          text: '',
        })
      ).status,
    ).toBe(400);
  });

  it('deletes a single own note and reports missing notes', async () => {
    const note = (await (
      await request('', 'POST', { title: 'Plan', text: '' })
    ).json()) as NoteDto;
    expect((await request(`/${note.id}`, 'DELETE')).status).toBe(200);
    expect((await request(`/${note.id}`)).status).toBe(404);
    expect((await request(`/${note.id}`, 'DELETE')).status).toBe(404);
  });

  it('bulk deletes only selected own notes, preserving unselected and foreign notes', async () => {
    const first = (await (
      await request('', 'POST', { title: 'First', text: '' })
    ).json()) as NoteDto;
    const second = (await (
      await request('', 'POST', { title: 'Second', text: '' })
    ).json()) as NoteDto;
    const keep = (await (
      await request('', 'POST', { title: 'Keep', text: '' })
    ).json()) as NoteDto;
    const foreign = (await (
      await request('', 'POST', { title: 'Foreign', text: '' }, 8)
    ).json()) as NoteDto;
    const response = await request('', 'DELETE', {
      ids: [first.id, second.id, first.id, foreign.id],
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: 2 });
    expect(await (await request()).json()).toEqual([keep]);
    expect(await (await request('', 'GET', undefined, 8)).json()).toEqual([
      foreign,
    ]);
  });

  it.each([
    {},
    { ids: [] },
    { ids: ['1'] },
    { ids: [0] },
    { ids: [-1] },
    { ids: [1.5] },
  ])('rejects invalid bulk deletion %#', async (body) => {
    expect((await request('', 'DELETE', body)).status).toBe(400);
  });

  it('cannot read, edit or delete another player’s note', async () => {
    const note = (await (
      await request('', 'POST', { title: 'Private', text: 'Secret' }, 8)
    ).json()) as NoteDto;
    expect((await request(`/${note.id}`)).status).toBe(404);
    expect(
      (await request(`/${note.id}`, 'PATCH', { title: 'Stolen', text: '' }))
        .status,
    ).toBe(404);
    expect((await request(`/${note.id}`, 'DELETE')).status).toBe(404);
    expect(
      await (await request(`/${note.id}`, 'GET', undefined, 8)).json(),
    ).toEqual(note);
  });

  it('requires authentication and rejects invalid note IDs', async () => {
    expect((await fetch(`${baseUrl}/user/notes`)).status).toBe(403);
    expect((await request('/not-an-id')).status).toBe(400);
  });

  it('returns an empty collection instead of a single text field', async () => {
    const response = await request();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});
