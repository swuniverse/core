jest.mock('./entities/holonet-post.entity', () => ({
  HolonetPost: class HolonetPost {},
  PostCategory: { NEWS: 'NEWS', ROLEPLAY: 'ROLEPLAY', TRADE: 'TRADE', RECRUITMENT: 'RECRUITMENT' },
}));
jest.mock('./entities/holonet-comment.entity', () => ({ HolonetComment: class HolonetComment {} }));
jest.mock('./entities/holonet-rating.entity', () => ({ HolonetRating: class HolonetRating {} }));
jest.mock('./entities/holonet-checkpoint.entity', () => ({ HolonetCheckpoint: class HolonetCheckpoint {} }));
jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../rpg/rpg-plot.entity', () => ({ RpgPlot: class RpgPlot {} }));
jest.mock('../rpg/rpg-plot-member.entity', () => ({ RpgPlotMember: class RpgPlotMember {} }));
jest.mock('../rpg/user-character.entity', () => ({ UserCharacter: class UserCharacter {} }));

import { MessageTargetKind } from '@swuniverse/shared';
import { HolonetController } from './holonet.controller';
import { HolonetService } from './holonet.service';

describe('HoloNet character mentions', () => {
  const characters = [
    { id: 1, userId: 7, name: 'Leia', avatar: null, description: 'Prinzessin', user: { id: 7, username: 'Autor' } },
    { id: 2, userId: 8, name: 'Han', avatar: null, description: 'Pilot', user: { id: 8, username: 'Spieler' } },
  ];
  const posts = {
    create: jest.fn((value) => ({ id: 42, createdAt: new Date(), ...value })),
    save: jest.fn(async (value) => value),
    findOne: jest.fn(),
  };
  const characterRepo = { find: jest.fn() };
  const messages = { sendSystem: jest.fn().mockResolvedValue(undefined) };
  let controller: HolonetController;

  beforeEach(() => {
    jest.clearAllMocks();
    characterRepo.find.mockResolvedValue(characters);
    const service = new HolonetService(
      posts as never, {} as never, {} as never, {} as never, {} as never,
      messages as never, {} as never, {} as never, {} as never, characterRepo as never,
      {} as never,
    );
    controller = new HolonetController(service);
  });

  it('persists selected characters and notifies the foreign owner with a post target', async () => {
    const result = await controller.create(
      { user: { sub: 7 } }, 'Ein Beitrag', 'x'.repeat(50), 'NEWS' as never, undefined, [1, 2],
    );

    expect(result.characters).toEqual(characters);
    expect(posts.save).toHaveBeenCalledWith(expect.objectContaining({ characters }));
    expect(messages.sendSystem).toHaveBeenCalledTimes(1);
    expect(messages.sendSystem).toHaveBeenCalledWith(
      8, expect.any(String), 'Dein Charakter Han wurde im HoloNet-Beitrag Ein Beitrag erwähnt',
      expect.any(String), undefined, { kind: MessageTargetKind.HOLONET_POST, id: 42 },
    );
  });

  it('only notifies newly mentioned foreign owners on edit, excluding the post author even for an admin', async () => {
    const oldPost = { id: 42, authorId: 7, title: 'Ein Beitrag', body: 'Alter Beitrag', createdAt: new Date(), characters: [characters[1]] };
    posts.findOne.mockResolvedValue(oldPost);
    characterRepo.find.mockResolvedValue([...characters, { id: 3, userId: 9, name: 'Luke', avatar: null, description: '', user: { id: 9, username: 'Jedi' } }]);

    const result = await controller.update(42, { user: { sub: 99, isAdmin: true } }, 'Neuer Titel', 'Neuer Beitrag', [1, 2, 3]);
    expect(result.characters.map((character) => character.id)).toEqual([1, 2, 3]);
    expect(messages.sendSystem).toHaveBeenCalledTimes(1);
    expect(messages.sendSystem).toHaveBeenCalledWith(9, expect.any(String), expect.stringContaining('Luke'), expect.any(String), undefined, { kind: MessageTargetKind.HOLONET_POST, id: 42 });
  });

  it.each([null, '2', [0], [1.5], Array(11).fill(1)])('rejects malformed or oversized character IDs on create and edit: %p', async (ids) => {
    posts.findOne.mockResolvedValue({ id: 42, authorId: 7, createdAt: new Date(), characters: [] });
    await expect(controller.create({ user: { sub: 7 } }, 'Ein Beitrag', 'x'.repeat(50), 'NEWS' as never, undefined, ids as never)).rejects.toThrow('Charakter-IDs');
    await expect(controller.update(42, { user: { sub: 7 } }, 'Ein Beitrag', 'Ein neuer Beitrag', ids as never)).rejects.toThrow('Charakter-IDs');
    expect(posts.save).not.toHaveBeenCalled();
  });

  it('reports an unknown character ID on create and edit without saving', async () => {
    posts.findOne.mockResolvedValue({ id: 42, authorId: 7, createdAt: new Date(), characters: [] });
    await expect(controller.create({ user: { sub: 7 } }, 'Ein Beitrag', 'x'.repeat(50), 'NEWS' as never, undefined, [2, 99])).rejects.toThrow('99');
    await expect(controller.update(42, { user: { sub: 7 } }, 'Ein Beitrag', 'Ein neuer Beitrag', [99])).rejects.toThrow('99');
    expect(posts.save).not.toHaveBeenCalled();
  });

  it('notifies an owner only once for duplicate IDs and multiple characters', async () => {
    characterRepo.find.mockResolvedValue([characters[1], { ...characters[1], id: 3, name: 'Chewie' }]);
    await controller.create({ user: { sub: 7 } }, 'Ein Beitrag', 'x'.repeat(50), 'NEWS' as never, undefined, [2, 2, 3]);
    expect(messages.sendSystem).toHaveBeenCalledTimes(1);
    expect(messages.sendSystem).toHaveBeenCalledWith(8, expect.any(String), expect.any(String), 'holonet-character:42:8', undefined, expect.anything());
  });

  it('preserves mentions when characterIds is omitted on edit', async () => {
    const oldPost = { id: 42, authorId: 7, title: 'Ein Beitrag', body: 'Alter Beitrag', createdAt: new Date(), characters: [characters[1]] };
    posts.findOne.mockResolvedValue(oldPost);
    const result = await controller.update(42, { user: { sub: 7 } }, 'Neuer Titel', 'Neuer Beitrag');
    expect(result.characters).toEqual([characters[1]]);
    expect(messages.sendSystem).not.toHaveBeenCalled();
  });
});
