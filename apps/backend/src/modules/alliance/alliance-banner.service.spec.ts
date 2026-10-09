jest.mock('../messaging/messaging.service', () => ({
  MessagingService: class MessagingService {},
}));

import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AllianceChronicleEventType, AllianceRole } from '@swuniverse/shared';
import { AllianceBannerService } from './alliance-banner.service';
import { AllianceRateLimiterService } from './alliance-rate-limiter.service';
import { AllianceContextCleanup } from './alliance-context-cleanup';
import { AllianceService } from './alliance.service';
import { InMemoryAllianceStore } from './testing/in-memory-alliance.store';
import { InMemoryAssetStorage } from './testing/in-memory-asset-storage';
import { makePng } from './testing/png-fixtures';

const { NONE, PRESIDENT, VICE, DIPLOMAT } = AllianceRole;
const FAR_FUTURE = new Date(Date.UTC(2100, 0, 1));

function setup() {
  const store = new InMemoryAllianceStore();
  const assets = new InMemoryAssetStorage();
  const banners = new AllianceBannerService(store, assets);
  const alliances = new AllianceService(store, {
    sendSystem: jest.fn(),
  } as never);
  store.addPlayer(1, 'Leia');
  store.addPlayer(2, 'Han');
  store.addPlayer(3, 'Lando');
  store.addPlayer(4, 'Chewie');
  store.addPlayer(5, 'Wedge');
  const rogue = store.seedAlliance({ name: 'Rogue Squadron' }, [
    [1, PRESIDENT],
    [2, VICE],
    [3, DIPLOMAT],
    [4, NONE],
  ]);
  const red = store.seedAlliance({ name: 'Red Squadron' }, [[5, PRESIDENT]]);
  return { store, assets, banners, alliances, rogue, red };
}

async function expectError(
  promise: Promise<unknown>,
  type: new (...args: never[]) => Error,
  message?: string,
) {
  const error = await promise.then(
    () => {
      throw new Error('expected rejection');
    },
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(type);
  if (message) expect((error as Error).message).toBe(message);
}

describe('AllianceBannerService', () => {
  describe('upload', () => {
    it.each([
      ['president', 1],
      ['vice', 2],
    ])(
      'lets the %s set a banner shown in the alliance detail',
      async (_, actor) => {
        const { banners, alliances, assets, rogue } = setup();

        await banners.upload(actor, rogue.id, makePng(600, 150));

        const detail = await alliances.getDetail(actor, rogue.id);
        expect(detail.banner).toEqual({
          url: expect.stringMatching(
            new RegExp(`^/api/alliances/${rogue.id}/banner\\?v=\\d+$`),
          ),
          updatedAt: expect.any(String),
        });
        expect(detail.viewer.actions.manageBanner).toBe(true);
        expect(assets.size).toBe(1);
      },
    );

    it.each([
      ['diplomat', 3],
      ['member without office', 4],
    ])('forbids the %s and stores nothing', async (_, actor) => {
      const { banners, assets, rogue } = setup();

      await expectError(
        banners.upload(actor, rogue.id, makePng(10, 10)),
        ForbiddenException,
      );
      await expectError(banners.remove(actor, rogue.id), ForbiddenException);

      expect(assets.size).toBe(0);
    });

    it('forbids acting on a foreign alliance with a manipulated id', async () => {
      const { banners, assets, red } = setup();

      await expectError(
        banners.upload(1, red.id, makePng(10, 10)),
        ForbiddenException,
      );
      expect(assets.size).toBe(0);
    });

    it('rejects an unknown alliance and a missing file', async () => {
      const { banners, rogue } = setup();

      await expectError(
        banners.upload(1, 9999, makePng(10, 10)),
        NotFoundException,
      );
      await expectError(
        banners.upload(1, rogue.id, undefined),
        BadRequestException,
        'Bitte wähle eine PNG-Datei aus',
      );
    });

    it('rejects invalid files with the validation message and stores nothing', async () => {
      const { banners, assets, store, rogue } = setup();

      await expectError(
        banners.upload(1, rogue.id, makePng(601, 150)),
        BadRequestException,
        'Das Banner darf höchstens 600 × 150 Pixel groß sein',
      );
      await expectError(
        banners.upload(1, rogue.id, Buffer.from('GIF89a')),
        BadRequestException,
        'Das Banner muss eine PNG-Datei sein',
      );

      expect(assets.size).toBe(0);
      expect((await store.findAlliance(rogue.id))?.bannerKey).toBeNull();
    });

    it('stores the re-encoded image under an opaque random key', async () => {
      const { banners, assets, store, rogue } = setup();

      await banners.upload(1, rogue.id, makePng(20, 10, []));

      const key = (await store.findAlliance(rogue.id))?.bannerKey as string;
      expect(key).toMatch(/^[0-9a-f]{32}$/);
      const read = await banners.read(rogue.id);
      expect(read.equals((await assets.read(key)) as Buffer)).toBe(true);
    });

    it('records the chronicle without image data', async () => {
      const { banners, alliances, rogue } = setup();

      await banners.upload(2, rogue.id, makePng(30, 15));
      await banners.upload(1, rogue.id, makePng(40, 20));

      const { entries } = await alliances.listChronicle(1, rogue.id);
      const banner = entries.filter(
        (e) => e.type === AllianceChronicleEventType.BANNER_SET,
      );
      expect(banner.map((e) => [e.actor?.name, e.metadata])).toEqual([
        ['Leia', { width: 40, height: 20, replaced: true }],
        ['Han', { width: 30, height: 15, replaced: false }],
      ]);
    });

    it('replacing stores the new asset first and removes the old one', async () => {
      const { banners, assets, store, rogue } = setup();
      await banners.upload(1, rogue.id, makePng(30, 15));
      const oldKey = (await store.findAlliance(rogue.id))?.bannerKey as string;

      await banners.upload(1, rogue.id, makePng(31, 15));

      const newKey = (await store.findAlliance(rogue.id))?.bannerKey as string;
      expect(newKey).not.toBe(oldKey);
      expect(await assets.read(oldKey)).toBeNull();
      expect(await assets.read(newKey)).not.toBeNull();
    });

    it('keeps the old banner and the chronicle when saving the new asset fails', async () => {
      const { banners, assets, store, alliances, rogue } = setup();
      await banners.upload(1, rogue.id, makePng(30, 15));
      const oldKey = (await store.findAlliance(rogue.id))?.bannerKey as string;
      assets.failNextSave = true;

      await expectError(banners.upload(1, rogue.id, makePng(31, 15)), Error);

      expect((await store.findAlliance(rogue.id))?.bannerKey).toBe(oldKey);
      expect(await assets.read(oldKey)).not.toBeNull();
      const { entries } = await alliances.listChronicle(1, rogue.id);
      expect(
        entries.filter((e) => e.type === AllianceChronicleEventType.BANNER_SET),
      ).toHaveLength(1);
    });

    it('does not leave an orphaned asset when the database write fails', async () => {
      const { banners, assets, store, rogue } = setup();
      jest
        .spyOn(store, 'updateAlliance')
        .mockRejectedValueOnce(new Error('db down'));

      await expectError(banners.upload(1, rogue.id, makePng(30, 15)), Error);

      expect(assets.size).toBe(0);
      expect((await store.findAlliance(rogue.id))?.bannerKey).toBeNull();
    });

    it('still succeeds when removing the replaced asset fails', async () => {
      const { banners, assets, store, rogue } = setup();
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
      await banners.upload(1, rogue.id, makePng(30, 15));
      assets.failNextDelete = true;

      await banners.upload(1, rogue.id, makePng(31, 15));

      expect((await store.findAlliance(rogue.id))?.bannerKey).not.toBeNull();
    });

    it('is rate limited per actor through the durable limiter', async () => {
      const store = new InMemoryAllianceStore();
      store.addPlayer(1, 'Leia');
      const rogue = store.seedAlliance({ name: 'Rogue Squadron' }, [
        [1, PRESIDENT],
      ]);
      const assets = new InMemoryAssetStorage();
      const banners = new AllianceBannerService(
        store,
        assets,
        AllianceRateLimiterService.forTesting({
          commands: {
            banner: {
              windowMs: 1000,
              maximumAttempts: 1,
              message: 'zu schnell',
            },
          },
        }),
      );

      await banners.upload(1, rogue.id, makePng(10, 10));
      await expectError(
        banners.upload(1, rogue.id, makePng(10, 10)),
        BadRequestException,
        'zu schnell',
      );
      await expectError(
        banners.remove(1, rogue.id),
        BadRequestException,
        'zu schnell',
      );
    });
  });

  describe('remove', () => {
    it('clears the reference, deletes the asset and records the chronicle', async () => {
      const { banners, assets, store, alliances, rogue } = setup();
      await banners.upload(1, rogue.id, makePng(30, 15));

      await banners.remove(2, rogue.id);

      expect((await store.findAlliance(rogue.id))?.bannerKey).toBeNull();
      expect(assets.size).toBe(0);
      expect((await alliances.getDetail(1, rogue.id)).banner).toBeNull();
      const { entries } = await alliances.listChronicle(1, rogue.id);
      expect(entries[0]).toMatchObject({
        type: AllianceChronicleEventType.BANNER_REMOVED,
        actor: { name: 'Han' },
        metadata: null,
      });
    });

    it('is rejected without a banner', async () => {
      const { banners, rogue } = setup();

      await expectError(
        banners.remove(1, rogue.id),
        BadRequestException,
        'Die Allianz hat kein Banner',
      );
    });
  });

  describe('read', () => {
    it('returns the stored png for anyone and 404 without banner', async () => {
      const { banners, rogue, red } = setup();
      await banners.upload(1, rogue.id, makePng(30, 15));

      expect((await banners.read(rogue.id)).subarray(1, 4).toString()).toBe(
        'PNG',
      );
      await expectError(banners.read(red.id), NotFoundException);
      await expectError(banners.read(9999), NotFoundException);
    });
  });

  describe('viewer capability', () => {
    it('is only offered to president and vice', async () => {
      const { alliances, rogue } = setup();

      const flags = await Promise.all(
        [1, 2, 3, 4, 5].map(
          async (id) =>
            (await alliances.getDetail(id, rogue.id)).viewer.actions
              .manageBanner,
        ),
      );

      expect(flags).toEqual([true, true, false, false, false]);
    });
  });

  describe('durable asset deletion', () => {
    it('keeps a replaced asset as a pending task when deletion fails and removes it on retry', async () => {
      const { banners, assets, store, rogue } = setup();
      await banners.upload(1, rogue.id, makePng(10, 10));
      const oldKey = (await store.findAlliance(rogue.id))!.bannerKey!;

      assets.failNextDelete = true;
      await banners.upload(1, rogue.id, makePng(20, 10));

      expect((await store.findAlliance(rogue.id))?.bannerKey).not.toBe(oldKey);
      expect(assets.keys()).toContain(oldKey);
      const pending = await store.listPendingAssetDeletions();
      expect(pending.map((task) => task.assetKey)).toEqual([oldKey]);
      expect(pending[0].attempts).toBe(1);

      await banners.retryAssetDeletions({ now: FAR_FUTURE });

      expect(assets.keys()).not.toContain(oldKey);
      expect(await store.listPendingAssetDeletions()).toEqual([]);
    });

    it('keeps a removed banner as a pending task when deletion fails', async () => {
      const { banners, assets, store, rogue } = setup();
      await banners.upload(1, rogue.id, makePng(10, 10));
      const key = (await store.findAlliance(rogue.id))!.bannerKey!;

      assets.failNextDelete = true;
      await banners.remove(1, rogue.id);

      expect((await store.findAlliance(rogue.id))?.bannerKey).toBeNull();
      expect(assets.keys()).toEqual([key]);
      await banners.retryAssetDeletions({ now: FAR_FUTURE });
      expect(assets.size).toBe(0);
    });

    it('waits for the backoff before retrying a failed deletion', async () => {
      const { banners, assets, store, rogue } = setup();
      await banners.upload(1, rogue.id, makePng(10, 10));
      assets.failNextDelete = true;
      await banners.remove(1, rogue.id);

      await banners.retryAssetDeletions();

      expect(assets.size).toBe(1);
      expect(await store.listPendingAssetDeletions()).toHaveLength(1);
    });

    it('persists the banner deletion when the alliance is dissolved and deletes it on retry', async () => {
      const { banners, alliances, assets, store, rogue } = setup();
      await banners.upload(1, rogue.id, makePng(10, 10));
      const key = (await store.findAlliance(rogue.id))!.bannerKey!;

      await alliances.dissolve(1, rogue.id);

      expect(await store.findAlliance(rogue.id)).toBeNull();
      expect(
        (await store.listPendingAssetDeletions()).map((t) => t.assetKey),
      ).toEqual([key]);
      await banners.retryAssetDeletions({ now: FAR_FUTURE });
      expect(assets.size).toBe(0);
      expect(await store.listPendingAssetDeletions()).toEqual([]);
    });

    it('deletes the banner file right after the dissolution commit when the banner service is wired', async () => {
      const { banners, assets, store, rogue } = setup();
      const wired = new AllianceService(
        store,
        { sendSystem: jest.fn() } as never,
        undefined,
        undefined,
        undefined,
        banners,
      );
      await banners.upload(1, rogue.id, makePng(10, 10));

      await wired.dissolve(1, rogue.id);

      expect(assets.size).toBe(0);
      expect(await store.listPendingAssetDeletions()).toEqual([]);
    });

    it('keeps a dissolution successful when the immediate file deletion fails', async () => {
      const { banners, assets, store, rogue } = setup();
      const wired = new AllianceService(
        store,
        { sendSystem: jest.fn() } as never,
        undefined,
        undefined,
        undefined,
        banners,
      );
      await banners.upload(1, rogue.id, makePng(10, 10));
      assets.failNextDelete = true;

      await expect(wired.dissolve(1, rogue.id)).resolves.toBeUndefined();

      expect(await store.findAlliance(rogue.id)).toBeNull();
      expect(await store.listPendingAssetDeletions()).toHaveLength(1);
      await banners.retryAssetDeletions({ now: FAR_FUTURE });
      expect(assets.size).toBe(0);
    });

    it('does not let a throwing banner service affect the dissolution result', async () => {
      const { store, rogue } = setup();
      const wired = new AllianceService(
        store,
        { sendSystem: jest.fn() } as never,
        undefined,
        undefined,
        undefined,
        {
          retryAssetDeletions: async () => {
            throw new Error('boom');
          },
        } as never,
      );

      await expect(wired.dissolve(1, rogue.id)).resolves.toBeUndefined();
      expect(await store.findAlliance(rogue.id)).toBeNull();
    });

    it('treats an already missing asset as deleted and a repeated retry as a no-op', async () => {
      const { banners, assets, store, alliances, rogue } = setup();
      await banners.upload(1, rogue.id, makePng(10, 10));
      const key = (await store.findAlliance(rogue.id))!.bannerKey!;
      await alliances.dissolve(1, rogue.id);
      await assets.delete(key);

      await banners.retryAssetDeletions({ now: FAR_FUTURE });
      await banners.retryAssetDeletions({ now: FAR_FUTURE });

      expect(await store.listPendingAssetDeletions()).toEqual([]);
    });

    it('does not persist a deletion task when the dissolution rolls back', async () => {
      const { banners, store, rogue } = setup();
      await banners.upload(1, rogue.id, makePng(10, 10));
      const registry = new AllianceContextCleanup();
      registry.register({
        allianceDissolved: async () => {
          throw new Error('consumer failed');
        },
      });
      const failing = new AllianceService(
        store,
        { sendSystem: jest.fn() } as never,
        undefined,
        undefined,
        registry,
      );

      await expect(failing.dissolve(1, rogue.id)).rejects.toThrow(
        'consumer failed',
      );

      expect(await store.listPendingAssetDeletions()).toEqual([]);
      expect((await store.findAlliance(rogue.id))?.bannerKey).not.toBeNull();
    });
  });
});
