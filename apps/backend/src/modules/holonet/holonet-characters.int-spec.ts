import { DataSource } from 'typeorm';
import { MessageTargetKind } from '@swuniverse/shared';
import { createUser } from '../../testing/integration/database';
import { INTEGRATION_ENTITIES } from '../../testing/integration/data-source';
import { AddHolonetPostCharacters20261104120000 } from '../../database/migrations/20261104120000-add-holonet-post-characters';
import { HolonetPost, PostCategory } from './entities/holonet-post.entity';
import { HolonetComment } from './entities/holonet-comment.entity';
import { HolonetRating } from './entities/holonet-rating.entity';
import { HolonetCheckpoint } from './entities/holonet-checkpoint.entity';
import { User } from '../auth/user.entity';
import { UserCharacter } from '../rpg/user-character.entity';
import { RpgPlot } from '../rpg/rpg-plot.entity';
import { RpgPlotMember } from '../rpg/rpg-plot-member.entity';
import { Message } from '../messaging/entities/message.entity';
import { MessagingService } from '../messaging/messaging.service';
import { HolonetService } from './holonet.service';

describe('HoloNet character mentions (Postgres)', () => {
  let db: DataSource;
  let admin: DataSource;
  let service: HolonetService;
  const schema = `holonet_characters_${process.pid}`;

  beforeAll(async () => {
    admin = await new DataSource({ type: 'postgres', url: process.env.INTEGRATION_DATABASE_URL }).initialize();
    await admin.query(`CREATE SCHEMA "${schema}"`);
    db = await new DataSource({
      type: 'postgres',
      url: process.env.INTEGRATION_DATABASE_URL,
      schema,
      entities: [...INTEGRATION_ENTITIES, HolonetPost, HolonetComment, HolonetRating, HolonetCheckpoint, UserCharacter, RpgPlot, RpgPlotMember],
      synchronize: true,
    }).initialize();
    await db.query(`DROP TABLE "${schema}"."holonet_post_characters"`);
    const runner = db.createQueryRunner();
    await runner.query(`SET search_path TO "${schema}"`);
    await new AddHolonetPostCharacters20261104120000().up(runner);
    await runner.release();
    const messages = new MessagingService(db.getRepository(Message), db.getRepository(User), {} as never, { emitToUser: jest.fn() } as never, {} as never);
    service = new HolonetService(db.getRepository(HolonetPost), db.getRepository(HolonetComment), db.getRepository(HolonetRating), db.getRepository(HolonetCheckpoint), db.getRepository(User), messages, {} as never, db.getRepository(RpgPlot), db.getRepository(RpgPlotMember), db.getRepository(UserCharacter));
  });
  afterAll(async () => {
    await db?.destroy();
    if (admin?.isInitialized) {
      await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
      await admin.destroy();
    }
  });

  it('persists and loads mentions, deduplicates messages across edits, and removes deleted characters', async () => {
    const author = await createUser(db, { username: 'author' });
    const owner = await createUser(db, { username: 'owner' });
    const repo = db.getRepository(UserCharacter);
    const [own, first, second] = await repo.save([
      repo.create({ userId: author.id, name: 'Leia', description: '' }),
      repo.create({ userId: owner.id, name: 'Han', description: 'Pilot' }),
      repo.create({ userId: owner.id, name: 'Chewie', description: '' }),
    ]);
    const post = await service.create(author.id, 'Ein Beitrag', 'x'.repeat(50), PostCategory.NEWS, undefined, [own.id, first.id]);
    const loaded = await service.findOne(post.id);
    expect(loaded.characters.map((character) => character.name).sort()).toEqual(['Han', 'Leia']);
    const foreign = loaded.characters.find((character) => character.id === first.id);
    expect(foreign?.user).toEqual({ id: owner.id, username: 'owner' });

    await service.update(post.id, author.id, 'Ein Beitrag', 'Neuer Beitrag', true, [own.id, first.id, second.id]);
    await service.update(post.id, author.id, 'Ein Beitrag', 'Neuer Beitrag', true, [own.id, second.id]);
    await service.update(post.id, author.id, 'Ein Beitrag', 'Neuer Beitrag', true, [own.id, first.id, second.id]);
    const messages = await db.getRepository(Message).findBy({ recipientId: owner.id });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ targetKind: MessageTargetKind.HOLONET_POST, targetId: post.id });
    expect(await db.getRepository(Message).countBy({ recipientId: author.id })).toBe(0);

    await repo.remove(first);
    const afterDeletion = await service.findOne(post.id);
    expect(afterDeletion.characters.map((character) => character.name).sort()).toEqual(['Chewie', 'Leia']);
    const list = await service.findAll(author.id);
    expect(list.data[0].characters.map((character) => character.name).sort()).toEqual(['Chewie', 'Leia']);
    const runner = db.createQueryRunner();
    await runner.query(`SET search_path TO "${schema}"`);
    await new AddHolonetPostCharacters20261104120000().down(runner);
    expect(await runner.hasTable('holonet_post_characters')).toBe(false);
    await runner.release();
  });
});
