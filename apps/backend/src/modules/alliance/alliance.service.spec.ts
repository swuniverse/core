jest.mock('../messaging/messaging.service', () => ({
  MessagingService: class MessagingService {},
}));

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AllianceRelationshipType, AllianceRole } from '@swuniverse/shared';
import { AllianceService } from './alliance.service';
import { AllianceConstraintViolation } from './alliance.store';
import {
  EMPIRE,
  InMemoryAllianceStore,
  REBELS,
} from './testing/in-memory-alliance.store';

const { NONE, PRESIDENT, VICE, DIPLOMAT } = AllianceRole;

interface SentMessage {
  to: number;
  subject: string;
  body: string;
}

function setup() {
  const store = new InMemoryAllianceStore();
  const sent: SentMessage[] = [];
  const messaging = {
    sendSystem: jest.fn(async (to: number, subject: string, body: string) => {
      sent.push({ to, subject, body });
    }),
  };
  const service = new AllianceService(store, messaging as never);
  return { store, sent, service };
}

function messagesTo(sent: SentMessage[], userId: number) {
  return sent.filter((m) => m.to === userId).map((m) => m.body);
}

async function expectError(
  promise: Promise<unknown>,
  type: new (...args: never[]) => Error,
  message?: string | RegExp,
) {
  const error = await promise.then(
    () => {
      throw new Error('expected rejection');
    },
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(type);
  if (message) expect((error as Error).message).toMatch(message);
}

describe('AllianceService', () => {
  describe('found', () => {
    it('returns public active relationship summaries and contracts', async () => {
      const { store, service } = setup();
      store.addPlayer(1, 'Leia');
      const rogue = store.seedAlliance({ name: 'Rogue Squadron', color: '#ff0000' }, [[1, PRESIDENT]]);
      const red = store.seedAlliance({ name: 'Red Squadron', color: '#00ff00' }, []);
      const relationship = store.seedActiveAllianceRelationship({
        firstAllianceId: rogue.id,
        secondAllianceId: red.id,
        type: AllianceRelationshipType.ALLIANCE,
        contract: '  [b]Gemeinsam[/b]  ',
        treatAsFriend: true,
        shareLivePositions: true,
      });

      const detail = await service.getDetail(1, rogue.id);
      expect(detail.relationships).toEqual([
        expect.objectContaining({
          id: relationship.id,
          counterparty: { id: red.id, name: 'Red Squadron', color: '#00ff00' },
          type: AllianceRelationshipType.ALLIANCE,
          permissions: { treatAsFriend: true, shareLivePositions: true },
          vassalage: null,
          hasContract: true,
        }),
      ]);
      await expect(service.getPublicRelationshipContract(rogue.id, relationship.id)).resolves.toEqual({
        relationshipId: relationship.id,
        contract: '[b]Gemeinsam[/b]',
      });
    });

      it('projects vassalage direction publicly and hides missing contracts', async () => {
      const { store, service } = setup();
      store.addPlayer(1, 'Leia');
      const rogue = store.seedAlliance({ name: 'Rogue Squadron' }, [[1, PRESIDENT]]);
      const red = store.seedAlliance({ name: 'Red Squadron' }, []);
      store.seedActiveAllianceRelationship({
        firstAllianceId: rogue.id,
        secondAllianceId: red.id,
        type: AllianceRelationshipType.VASSALAGE,
        lordAllianceId: rogue.id,
        vassalAllianceId: red.id,
      });

      const detail = await service.getDetail(1, red.id);
      expect(detail.relationships[0]).toMatchObject({
        counterparty: { id: rogue.id },
        vassalage: { lordAllianceId: rogue.id, vassalAllianceId: red.id },
        hasContract: false,
      });
      await expectError(
        service.getPublicRelationshipContract(red.id, detail.relationships[0].id),
        NotFoundException,
        'Das Vertragswerk ist nicht verfügbar',
      );
    });

    it('makes the founder president of a new alliance of their faction', async () => {
      const { store, service } = setup();
      store.addPlayer(1, 'Leia', REBELS.id);

      const { id } = await service.found(1, {
        name: 'Rogue Squadron',
        description: 'Wir fliegen.',
      });

      const detail = await service.getDetail(1, id);
      expect(detail).toMatchObject({
        name: 'Rogue Squadron',
        description: 'Wir fliegen.',
        faction: REBELS.key,
        factionName: 'Rebellenallianz',
        memberCount: 1,
        acceptsApplications: false,
        titles: {
          president: 'Präsident',
          vice: 'Vize-Präsident',
          diplomat: 'Diplomat',
        },
      });
      expect(detail.members).toEqual([
        expect.objectContaining({
          userId: 1,
          name: 'Leia',
          role: PRESIDENT,
          roleTitle: 'Präsident',
        }),
      ]);
      expect(detail.viewer.role).toBe(PRESIDENT);
    });

    it('trims the name', async () => {
      const { store, service } = setup();
      store.addPlayer(1, 'Leia');

      const { id } = await service.found(1, {
        name: '  Rogue Squadron  ',
        description: '',
      });

      expect((await service.getDetail(1, id)).name).toBe('Rogue Squadron');
    });

    it.each([
      ['Rogu', /mindestens 5 Zeichen/],
      ['    Rogu   ', /mindestens 5 Zeichen/],
      ['x'.repeat(41), /höchstens 40 Zeichen/],
    ])('rejects the name %j', async (name, message) => {
      const { store, service } = setup();
      store.addPlayer(1, 'Leia');

      await expectError(
        service.found(1, { name, description: '' }),
        BadRequestException,
        message,
      );
      expect(store.snapshot().alliances).toHaveLength(0);
    });

    it('accepts names of exactly 5 and 40 characters', async () => {
      const { store, service } = setup();
      store.addPlayer(1, 'Leia');
      store.addPlayer(2, 'Han');

      await service.found(1, { name: 'Rogue', description: '' });
      await service.found(2, { name: 'y'.repeat(40), description: '' });

      expect(store.snapshot().alliances).toHaveLength(2);
    });

    it('rejects a name already taken, ignoring case', async () => {
      const { store, service } = setup();
      store.addPlayer(1, 'Leia');
      store.seedAlliance({ name: 'Rogue Squadron' }, []);

      await expectError(
        service.found(1, { name: 'rogue squadron', description: '' }),
        BadRequestException,
        'Dieser Allianzname ist bereits vergeben',
      );
    });

    it('rejects a description over 10.000 characters', async () => {
      const { store, service } = setup();
      store.addPlayer(1, 'Leia');

      await expectError(
        service.found(1, { name: 'Rogue Squadron', description: 'x'.repeat(10001) }),
        BadRequestException,
        /10\.000 Zeichen/,
      );
      await service.found(1, {
        name: 'Rogue Squadron',
        description: 'x'.repeat(10000),
      });
    });

    it('rejects a player who is already member of an alliance', async () => {
      const { store, service } = setup();
      store.addPlayer(1, 'Leia');
      store.seedAlliance({ name: 'Rogue Squadron' }, [[1, NONE]]);

      await expectError(
        service.found(1, { name: 'Red Squadron', description: '' }),
        BadRequestException,
        'Du bist bereits Mitglied einer Allianz',
      );
    });

    it('rejects a player without faction', async () => {
      const { store, service } = setup();
      store.addPlayer(1, 'Leia', null);

      await expectError(
        service.found(1, { name: 'Rogue Squadron', description: '' }),
        BadRequestException,
        /Fraktion/,
      );
    });

    it('drops the founder’s open applications without notifying anyone', async () => {
      const { store, service, sent } = setup();
      store.addPlayer(1, 'Leia');
      store.addPlayer(2, 'Mon');
      const other = store.seedAlliance({ name: 'Red Squadron' }, [
        [2, PRESIDENT],
      ]);
      store.seedApplication(other.id, 1);

      await service.found(1, { name: 'Rogue Squadron', description: '' });

      expect(store.snapshot().applications).toHaveLength(0);
      expect(sent).toHaveLength(0);
    });
  });

  describe('list', () => {
    it('lists alliances of both factions with member count and status', async () => {
      const { store, service } = setup();
      store.seedAlliance(
        { name: 'Rogue Squadron', color: '#ff0000', acceptsApplications: true },
        [
          [1, PRESIDENT],
          [2, NONE],
        ],
      );
      store.seedAlliance(
        { name: 'Black Squadron', factionId: EMPIRE.id, acceptsApplications: false },
        [[3, PRESIDENT]],
      );

      const list = await service.list();

      expect(list).toEqual([
        expect.objectContaining({
          name: 'Rogue Squadron',
          faction: REBELS.key,
          factionName: 'Rebellenallianz',
          memberCount: 2,
          color: '#ff0000',
          acceptsApplications: true,
        }),
        expect.objectContaining({
          name: 'Black Squadron',
          faction: EMPIRE.key,
          factionName: 'Galaktisches Imperium',
          memberCount: 1,
          color: null,
          acceptsApplications: false,
        }),
      ]);
    });
  });

  describe('getDetail', () => {
    it('throws NotFound for an unknown alliance', async () => {
      const { service } = setup();
      await expectError(service.getDetail(1, 99), NotFoundException);
    });

    it('shows members with the alliance’s own office titles, president first', async () => {
      const { store, service } = setup();
      store.addPlayer(1, 'Leia');
      store.addPlayer(2, 'Wedge');
      store.addPlayer(3, 'Mon');
      store.addPlayer(4, 'Biggs');
      const alliance = store.seedAlliance(
        { name: 'Rogue Squadron', presidentTitle: 'Großadmiral' },
        [
          [2, NONE],
          [3, DIPLOMAT],
          [1, PRESIDENT],
          [4, VICE],
        ],
      );

      const detail = await service.getDetail(2, alliance.id);

      expect(
        detail.members.map((m) => [m.name, m.role, m.roleTitle]),
      ).toEqual([
        ['Leia', PRESIDENT, 'Großadmiral'],
        ['Biggs', VICE, 'Vize-Präsident'],
        ['Mon', DIPLOMAT, 'Diplomat'],
        ['Wedge', NONE, null],
      ]);
    });

    describe('viewer actions', () => {
      function scenario() {
        const ctx = setup();
        const { store } = ctx;
        store.addPlayer(1, 'Leia');
        store.addPlayer(2, 'Wedge');
        store.addPlayer(3, 'Mon');
        store.addPlayer(4, 'Biggs');
        store.addPlayer(5, 'Han');
        store.addPlayer(6, 'Vader', EMPIRE.id);
        const alliance = store.seedAlliance(
          { name: 'Rogue Squadron', acceptsApplications: true },
          [
            [1, PRESIDENT],
            [2, VICE],
            [3, DIPLOMAT],
            [4, NONE],
          ],
        );
        return { ...ctx, alliance };
      }

      it('lets an alliance-less player of the same faction apply', async () => {
        const { service, alliance } = scenario();

        const { viewer, members } = await service.getDetail(5, alliance.id);

        expect(viewer).toEqual({
          role: null,
          actions: {
            apply: true,
            withdrawApplication: false,
            leave: false,
            editDetails: false,
            manageApplications: false,
            dissolve: false,
          },
        });
        expect(members.every((m) => Object.values(m.actions).every((a) => !a))).toBe(true);
      });

      it('offers no apply button to the other faction', async () => {
        const { service, alliance } = scenario();

        const { viewer } = await service.getDetail(6, alliance.id);

        expect(viewer.actions.apply).toBe(false);
      });

      it('offers no apply button when applications are closed', async () => {
        const { store, service, alliance } = scenario();
        await store.updateAlliance(alliance.id, { acceptsApplications: false });

        const { viewer } = await service.getDetail(5, alliance.id);

        expect(viewer.actions.apply).toBe(false);
      });

      it('offers withdraw instead of apply to a pending applicant', async () => {
        const { store, service, alliance } = scenario();
        store.seedApplication(alliance.id, 5);

        const { viewer } = await service.getDetail(5, alliance.id);

        expect(viewer.actions.apply).toBe(false);
        expect(viewer.actions.withdrawApplication).toBe(true);
      });

      it('offers no apply button to members of another alliance', async () => {
        const { store, service, alliance } = scenario();
        store.seedAlliance({ name: 'Red Squadron' }, [[5, PRESIDENT]]);

        const { viewer } = await service.getDetail(5, alliance.id);

        expect(viewer.actions.apply).toBe(false);
      });

      it('gives the president every management action', async () => {
        const { service, alliance } = scenario();

        const { viewer, members } = await service.getDetail(1, alliance.id);

        expect(viewer).toEqual({
          role: PRESIDENT,
          actions: {
            apply: false,
            withdrawApplication: false,
            leave: false,
            editDetails: true,
            manageApplications: true,
            dissolve: true,
          },
        });
        const byName = Object.fromEntries(members.map((m) => [m.name, m.actions]));
        expect(byName['Leia']).toEqual({
          kick: false,
          appointVice: false,
          appointDiplomat: false,
          dismiss: false,
          transferPresidency: false,
        });
        expect(byName['Wedge']).toEqual({
          kick: true,
          appointVice: false,
          appointDiplomat: true,
          dismiss: true,
          transferPresidency: true,
        });
        expect(byName['Biggs']).toEqual({
          kick: true,
          appointVice: true,
          appointDiplomat: true,
          dismiss: false,
          transferPresidency: true,
        });
      });

      it('lets the sole president leave (dissolving the alliance)', async () => {
        const { store, service } = setup();
        store.addPlayer(1, 'Leia');
        const alliance = store.seedAlliance({ name: 'Rogue Squadron' }, [
          [1, PRESIDENT],
        ]);

        const { viewer } = await service.getDetail(1, alliance.id);

        expect(viewer.actions.leave).toBe(true);
      });

      it('gives a vice management rights but not dissolve', async () => {
        const { service, alliance } = scenario();

        const { viewer, members } = await service.getDetail(2, alliance.id);

        expect(viewer.actions).toMatchObject({
          leave: true,
          editDetails: true,
          manageApplications: true,
          dissolve: false,
        });
        const byName = Object.fromEntries(members.map((m) => [m.name, m.actions]));
        expect(byName['Leia'].kick).toBe(false);
        expect(byName['Mon']).toMatchObject({ kick: true, dismiss: true });
        expect(byName['Biggs']).toMatchObject({
          kick: true,
          appointDiplomat: true,
          appointVice: false,
        });
      });

      it('gives diplomats and plain members only leave', async () => {
        const { service, alliance } = scenario();

        for (const userId of [3, 4]) {
          const { viewer, members } = await service.getDetail(userId, alliance.id);
          expect(viewer.actions).toEqual({
            apply: false,
            withdrawApplication: false,
            leave: true,
            editDetails: false,
            manageApplications: false,
            dissolve: false,
          });
          expect(
            members.every((m) => Object.values(m.actions).every((a) => !a)),
          ).toBe(true);
        }
      });
    });

    describe('description placeholders', () => {
      function withDescription(description: string, members: Array<[number, AllianceRole]>, homepage = '') {
        const ctx = setup();
        ctx.store.addPlayer(1, 'Leia');
        ctx.store.addPlayer(2, 'Wedge');
        ctx.store.addPlayer(3, 'Mon');
        ctx.store.addPlayer(4, 'Biggs');
        const alliance = ctx.store.seedAlliance(
          { name: 'Rogue Squadron', description, homepage },
          members,
        );
        return ctx.service.getDetail(1, alliance.id);
      }

      it('replaces office placeholders with the first holder', async () => {
        const detail = await withDescription(
          'P: $ALLIANCE_PRESIDENT, V: $ALLIANCE_VICEPRESIDENT, D: $ALLIANCE_FOREIGNMINISTER.',
          [
            [1, PRESIDENT],
            [2, VICE],
            [4, VICE],
            [3, DIPLOMAT],
          ],
        );

        expect(detail.renderedDescription).toBe('P: Leia, V: Wedge, D: Mon.');
        expect(detail.description).toContain('$ALLIANCE_PRESIDENT');
      });

      it('shows vacant offices as „Unbesetzt“', async () => {
        const detail = await withDescription(
          '$ALLIANCE_VICEPRESIDENT / $ALLIANCE_FOREIGNMINISTER',
          [[1, PRESIDENT]],
        );

        expect(detail.renderedDescription).toBe('Unbesetzt / Unbesetzt');
      });

      it('links the homepage as BBCode', async () => {
        const detail = await withDescription(
          'Besuch uns: $ALLIANCE_HOMEPAGE_LINK',
          [[1, PRESIDENT]],
          'https://rogue.example',
        );

        expect(detail.renderedDescription).toBe(
          'Besuch uns: [url=https://rogue.example]Zur Allianz-Homepage[/url]',
        );
      });

      it('drops the homepage link when there is no homepage', async () => {
        const detail = await withDescription('[$ALLIANCE_HOMEPAGE_LINK]', [
          [1, PRESIDENT],
        ]);

        expect(detail.renderedDescription).toBe('[]');
      });

      it('removes unknown $ALLIANCE_ placeholders', async () => {
        const detail = await withDescription(
          'A $ALLIANCE_BANNER B $ALLIANCE_DIPLOMATIC_RELATIONS C $OTHER',
          [[1, PRESIDENT]],
        );

        expect(detail.renderedDescription).toBe('A  B  C $OTHER');
      });
    });
  });

  describe('getRef', () => {
    it('returns id, name and color of the player’s alliance', async () => {
      const { store, service } = setup();
      const alliance = store.seedAlliance(
        { name: 'Rogue Squadron', color: '#123456' },
        [[1, NONE]],
      );

      await expect(service.getRef(1)).resolves.toEqual({
        id: alliance.id,
        name: 'Rogue Squadron',
        color: '#123456',
      });
      await expect(service.getRef(2)).resolves.toBeNull();
    });
  });

  describe('applications', () => {
    function scenario() {
      const ctx = setup();
      const { store } = ctx;
      store.addPlayer(1, 'Leia');
      store.addPlayer(2, 'Wedge');
      store.addPlayer(3, 'Mon');
      store.addPlayer(4, 'Biggs');
      store.addPlayer(5, 'Han');
      store.addPlayer(6, 'Vader', EMPIRE.id);
      store.addPlayer(7, 'Mothma');
      const alliance = store.seedAlliance(
        { name: 'Rogue Squadron', acceptsApplications: true },
        [
          [1, PRESIDENT],
          [2, VICE],
          [3, DIPLOMAT],
          [4, NONE],
        ],
      );
      const other = store.seedAlliance(
        { name: 'Red Squadron', acceptsApplications: true },
        [[7, PRESIDENT]],
      );
      return { ...ctx, alliance, other };
    }

    describe('apply', () => {
      it('notifies president and vices of the new application', async () => {
        const { store, service, sent, alliance } = scenario();

        await service.apply(5, alliance.id);

        expect(store.snapshot().applications).toEqual([
          expect.objectContaining({ allianceId: alliance.id, userId: 5 }),
        ]);
        const text = 'Der Siedler Han hat sich für die Allianz beworben';
        expect(messagesTo(sent, 1)).toEqual([text]);
        expect(messagesTo(sent, 2)).toEqual([text]);
        expect(sent).toHaveLength(2);
      });

      it('allows applications to several alliances at once', async () => {
        const { store, service, alliance, other } = scenario();

        await service.apply(5, alliance.id);
        await service.apply(5, other.id);

        expect(store.snapshot().applications).toHaveLength(2);
      });

      it('rejects a second application to the same alliance', async () => {
        const { service, alliance } = scenario();
        await service.apply(5, alliance.id);

        await expectError(
          service.apply(5, alliance.id),
          BadRequestException,
          'Du hast Dich bei dieser Allianz bereits beworben',
        );
      });

      it('rejects players of the other faction', async () => {
        const { service, alliance } = scenario();

        await expectError(
          service.apply(6, alliance.id),
          BadRequestException,
          /Fraktion/,
        );
      });

      it('rejects when the alliance does not accept applications', async () => {
        const { store, service, alliance } = scenario();
        await store.updateAlliance(alliance.id, { acceptsApplications: false });

        await expectError(
          service.apply(5, alliance.id),
          BadRequestException,
          'Diese Allianz nimmt derzeit keine Bewerbungen an',
        );
      });

      it('rejects members of an alliance', async () => {
        const { service, other } = scenario();

        await expectError(
          service.apply(4, other.id),
          BadRequestException,
          'Du bist bereits Mitglied einer Allianz',
        );
      });

      it('rejects unknown alliances', async () => {
        const { service } = scenario();
        await expectError(service.apply(5, 999), NotFoundException);
      });
    });

    describe('withdraw', () => {
      it('removes the application silently', async () => {
        const { store, service, sent, alliance } = scenario();
        store.seedApplication(alliance.id, 5);

        await service.withdrawApplication(5, alliance.id);

        expect(store.snapshot().applications).toHaveLength(0);
        expect(sent).toHaveLength(0);
      });

      it('fails without an application', async () => {
        const { service, alliance } = scenario();
        await expectError(
          service.withdrawApplication(5, alliance.id),
          NotFoundException,
        );
      });
    });

    describe('listApplications', () => {
      it('lists open applications oldest first for president and vice', async () => {
        const { store, service, alliance } = scenario();
        store.addPlayer(8, 'Luke');
        store.seedApplication(alliance.id, 8);
        store.seedApplication(alliance.id, 5);

        for (const actor of [1, 2]) {
          const list = await service.listApplications(actor, alliance.id);
          expect(list.map((a) => a.name)).toEqual(['Luke', 'Han']);
        }
      });

      it('is forbidden for diplomats, members and outsiders', async () => {
        const { service, alliance } = scenario();

        for (const actor of [3, 4, 7]) {
          await expectError(
            service.listApplications(actor, alliance.id),
            ForbiddenException,
          );
        }
      });
    });

    describe('accept', () => {
      it('makes the applicant a member without office and informs them', async () => {
        const { store, service, sent, alliance } = scenario();
        const application = store.seedApplication(alliance.id, 5);

        await service.acceptApplication(1, application.id);

        expect(await store.findMembership(5)).toMatchObject({
          allianceId: alliance.id,
          role: NONE,
        });
        expect(store.snapshot().applications).toHaveLength(0);
        expect(messagesTo(sent, 5)).toEqual([
          'Deine Bewerbung wurde akzeptiert - Du bist jetzt Mitglied der Allianz Rogue Squadron',
        ]);
      });

      it('lets a vice accept', async () => {
        const { store, service, alliance } = scenario();
        const application = store.seedApplication(alliance.id, 5);

        await service.acceptApplication(2, application.id);

        expect(await store.findMembership(5)).not.toBeNull();
      });

      it('drops the applicant’s other applications and informs those leaders', async () => {
        const { store, service, sent, alliance, other } = scenario();
        store.addPlayer(8, 'Ackbar');
        await store.insertMembership({ allianceId: other.id, userId: 8, role: VICE });
        const application = store.seedApplication(alliance.id, 5);
        store.seedApplication(other.id, 5);

        await service.acceptApplication(1, application.id);

        expect(store.snapshot().applications).toHaveLength(0);
        const text = 'Der Siedler Han wurde bei einer anderen Allianz aufgenommen';
        expect(messagesTo(sent, 7)).toEqual([text]);
        expect(messagesTo(sent, 8)).toEqual([text]);
        expect(messagesTo(sent, 1)).toEqual([]);
        expect(messagesTo(sent, 2)).toEqual([]);
      });

      it('fails if the applicant joined another alliance meanwhile', async () => {
        const { store, service, sent, alliance, other } = scenario();
        const application = store.seedApplication(alliance.id, 5);
        await store.insertMembership({ allianceId: other.id, userId: 5, role: NONE });

        await expectError(
          service.acceptApplication(1, application.id),
          BadRequestException,
          'Der Siedler ist bereits Mitglied einer Allianz',
        );
        expect(sent).toHaveLength(0);
      });

      it('sends no messages when the membership insert loses a race', async () => {
        const { store, service, sent, alliance, other } = scenario();
        const application = store.seedApplication(alliance.id, 5);
        store.seedApplication(other.id, 5);
        // Simulate a concurrent acceptance that commits between check and insert.
        const insert = store.insertMembership.bind(store);
        jest.spyOn(store, 'insertMembership').mockImplementationOnce(async (data) => {
          await insert({ allianceId: other.id, userId: 5, role: NONE });
          return insert(data);
        });

        await expectError(
          service.acceptApplication(1, application.id),
          BadRequestException,
          'Der Siedler ist bereits Mitglied einer Allianz',
        );
        expect(sent).toHaveLength(0);
        expect(store.snapshot().applications).toHaveLength(2);
      });

      it('is forbidden for diplomats, members and other alliances', async () => {
        const { store, service, alliance } = scenario();
        const application = store.seedApplication(alliance.id, 5);

        for (const actor of [3, 4, 7]) {
          await expectError(
            service.acceptApplication(actor, application.id),
            ForbiddenException,
          );
        }
        expect(await store.findMembership(5)).toBeNull();
      });

      it('fails for an unknown application', async () => {
        const { service } = scenario();
        await expectError(service.acceptApplication(1, 999), NotFoundException);
      });

      it('fails if the application is withdrawn before the acceptance commits', async () => {
        const { store, service, sent, alliance } = scenario();
        const application = store.seedApplication(alliance.id, 5);
        const lock = store.lockAlliance.bind(store);
        jest.spyOn(store, 'lockAlliance').mockImplementationOnce(async (id) => {
          await store.deleteApplications([application.id]);
          return lock(id);
        });

        await expectError(
          service.acceptApplication(1, application.id),
          NotFoundException,
        );
        expect(await store.findMembership(5)).toBeNull();
        expect(sent).toHaveLength(0);
      });
    });

    describe('decline', () => {
      it('removes the application and informs the applicant', async () => {
        const { store, service, sent, alliance } = scenario();
        const application = store.seedApplication(alliance.id, 5);

        await service.declineApplication(2, application.id);

        expect(store.snapshot().applications).toHaveLength(0);
        expect(await store.findMembership(5)).toBeNull();
        expect(sent).toEqual([
          expect.objectContaining({
            to: 5,
            body: 'Deine Bewerbung bei der Allianz Rogue Squadron wurde abgelehnt',
          }),
        ]);
      });

      it('is forbidden for diplomats and members', async () => {
        const { store, service, alliance } = scenario();
        const application = store.seedApplication(alliance.id, 5);

        for (const actor of [3, 4]) {
          await expectError(
            service.declineApplication(actor, application.id),
            ForbiddenException,
          );
        }
      });
    });

    describe('closing applications', () => {
      it('declines all open applications with a message to each applicant', async () => {
        const { store, service, sent, alliance } = scenario();
        store.addPlayer(8, 'Luke');
        store.seedApplication(alliance.id, 5);
        store.seedApplication(alliance.id, 8);

        await service.update(2, alliance.id, { acceptsApplications: false });

        expect((await store.findAlliance(alliance.id))?.acceptsApplications).toBe(false);
        expect(store.snapshot().applications).toHaveLength(0);
        const text = 'Deine Bewerbung bei der Allianz Rogue Squadron wurde abgelehnt';
        expect(messagesTo(sent, 5)).toEqual([text]);
        expect(messagesTo(sent, 8)).toEqual([text]);
      });

      it('re-opens applications', async () => {
        const { store, service, alliance } = scenario();
        await store.updateAlliance(alliance.id, { acceptsApplications: false });

        await service.update(1, alliance.id, { acceptsApplications: true });

        expect((await store.findAlliance(alliance.id))?.acceptsApplications).toBe(true);
      });

      it('is forbidden for diplomats and members', async () => {
        const { service, alliance } = scenario();

        for (const actor of [3, 4]) {
          await expectError(
            service.update(actor, alliance.id, { acceptsApplications: false }),
            ForbiddenException,
          );
        }
      });
    });
  });

  describe('membership', () => {
    function scenario() {
      const ctx = setup();
      const { store } = ctx;
      store.addPlayer(1, 'Leia');
      store.addPlayer(2, 'Wedge');
      store.addPlayer(3, 'Mon');
      store.addPlayer(4, 'Biggs');
      store.addPlayer(5, 'Han');
      store.addPlayer(6, 'Luke');
      const alliance = store.seedAlliance({ name: 'Rogue Squadron' }, [
        [1, PRESIDENT],
        [2, VICE],
        [3, DIPLOMAT],
        [4, NONE],
        [6, VICE],
      ]);
      const other = store.seedAlliance({ name: 'Red Squadron' }, [
        [5, PRESIDENT],
      ]);
      return { ...ctx, alliance, other };
    }

    describe('leave', () => {
      it('lets a member leave and informs president and vices', async () => {
        const { store, service, sent } = scenario();

        await expect(service.leave(4)).resolves.toEqual({ dissolved: false });

        expect(await store.findMembership(4)).toBeNull();
        const text = 'Der Siedler Biggs hat die Allianz verlassen';
        expect(messagesTo(sent, 1)).toEqual([text]);
        expect(messagesTo(sent, 2)).toEqual([text]);
        expect(messagesTo(sent, 6)).toEqual([text]);
        expect(sent).toHaveLength(3);
      });

      it('does not notify a leaving vice about themselves', async () => {
        const { service, sent } = scenario();

        await service.leave(2);

        expect(messagesTo(sent, 2)).toEqual([]);
        expect(sent.map((m) => m.to).sort()).toEqual([1, 6]);
      });

      it('refuses a president with other members', async () => {
        const { store, service } = scenario();

        await expectError(
          service.leave(1),
          BadRequestException,
          /Präsidentenamt zuerst übergeben/,
        );
        expect(await store.findMembership(1)).not.toBeNull();
      });

      it('dissolves the alliance when the president is the last member', async () => {
        const { store, service, sent, other } = scenario();
        store.addPlayer(7, 'Ackbar');
        store.seedApplication(other.id, 7);

        await expect(service.leave(5)).resolves.toEqual({ dissolved: true });

        expect(await store.findAlliance(other.id)).toBeNull();
        expect(await store.findMembership(5)).toBeNull();
        expect(store.snapshot().applications).toHaveLength(0);
        expect(sent).toHaveLength(0);
      });

      it('fails without alliance', async () => {
        const { store, service } = scenario();
        store.addPlayer(9, 'Lando');
        await expectError(service.leave(9), BadRequestException, 'Du bist in keiner Allianz');
      });
    });

    describe('kick', () => {
      it('lets the president kick anyone else and informs them', async () => {
        const { store, service, sent, alliance } = scenario();

        for (const target of [2, 3, 4]) {
          await service.kick(1, alliance.id, target);
          expect(await store.findMembership(target)).toBeNull();
          expect(messagesTo(sent, target)).toEqual([
            'Deine Mitgliedschaft in der Allianz Rogue Squadron wurde beendet',
          ]);
        }
      });

      it('lets a vice kick members and diplomats only', async () => {
        const { store, service, alliance } = scenario();

        await service.kick(2, alliance.id, 4);
        await service.kick(2, alliance.id, 3);
        await expectError(service.kick(2, alliance.id, 6), ForbiddenException);
        await expectError(service.kick(2, alliance.id, 1), ForbiddenException);
        expect(await store.findMembership(6)).not.toBeNull();
        expect(await store.findMembership(1)).not.toBeNull();
      });

      it('forbids diplomats and members to kick', async () => {
        const { service, alliance } = scenario();

        await expectError(service.kick(3, alliance.id, 4), ForbiddenException);
        await expectError(service.kick(4, alliance.id, 3), ForbiddenException);
      });

      it('refuses kicking oneself', async () => {
        const { service, alliance } = scenario();

        await expectError(
          service.kick(1, alliance.id, 1),
          BadRequestException,
          /nicht selbst rauswerfen/,
        );
        await expectError(service.kick(2, alliance.id, 2), BadRequestException);
      });

      it('re-checks rights inside the transaction', async () => {
        const { store, service, alliance } = scenario();
        const lock = store.lockAlliance.bind(store);
        // The president dismisses the vice just before the vice's kick commits.
        jest.spyOn(store, 'lockAlliance').mockImplementationOnce(async (id) => {
          await store.setRole(alliance.id, 2, NONE);
          return lock(id);
        });

        await expectError(service.kick(2, alliance.id, 4), ForbiddenException);
        expect(await store.findMembership(4)).not.toBeNull();
      });

      it('refuses targets outside the alliance', async () => {
        const { service, alliance } = scenario();

        await expectError(service.kick(1, alliance.id, 5), NotFoundException);
      });

      it('refuses actors acting on a foreign alliance', async () => {
        const { service, other } = scenario();

        await expectError(service.kick(1, other.id, 5), ForbiddenException);
      });
    });

    describe('dissolve', () => {
      it('dissolves the alliance and informs every member', async () => {
        const { store, service, sent, alliance } = scenario();
        store.addPlayer(7, 'Ackbar');
        store.seedApplication(alliance.id, 7);

        await service.dissolve(1, alliance.id);

        expect(await store.findAlliance(alliance.id)).toBeNull();
        for (const member of [1, 2, 3, 4, 6]) {
          expect(await store.findMembership(member)).toBeNull();
          expect(messagesTo(sent, member)).toEqual([
            'Die Allianz Rogue Squadron wurde aufgelöst',
          ]);
        }
        expect(store.snapshot().applications).toHaveLength(0);
        expect(messagesTo(sent, 7)).toEqual([]);
      });

      it('is forbidden for vices and everyone else', async () => {
        const { store, service, alliance } = scenario();

        for (const actor of [2, 3, 4, 5]) {
          await expectError(service.dissolve(actor, alliance.id), ForbiddenException);
        }
        expect(await store.findAlliance(alliance.id)).not.toBeNull();
      });
    });
  });

  describe('offices', () => {
    function scenario() {
      const ctx = setup();
      const { store } = ctx;
      store.addPlayer(1, 'Leia');
      store.addPlayer(2, 'Wedge');
      store.addPlayer(3, 'Mon');
      store.addPlayer(4, 'Biggs');
      const alliance = store.seedAlliance(
        { name: 'Rogue Squadron', viceTitle: 'Admiral' },
        [
          [1, PRESIDENT],
          [2, VICE],
          [3, DIPLOMAT],
          [4, NONE],
        ],
      );
      return { ...ctx, alliance };
    }

    it('lets the president appoint a vice, using the alliance’s title', async () => {
      const { store, service, sent, alliance } = scenario();

      await service.setRole(1, alliance.id, 4, VICE);

      expect((await store.findMembership(4))?.role).toBe(VICE);
      expect(messagesTo(sent, 4)).toEqual([
        'Du wurdest zum Admiral der Allianz Rogue Squadron ernannt',
      ]);
    });

    it('replaces the previous office', async () => {
      const { store, service, alliance } = scenario();

      await service.setRole(1, alliance.id, 3, VICE);
      expect((await store.findMembership(3))?.role).toBe(VICE);
      await service.setRole(1, alliance.id, 3, DIPLOMAT);
      expect((await store.findMembership(3))?.role).toBe(DIPLOMAT);
    });

    it('lets the president dismiss and informs the member', async () => {
      const { store, service, sent, alliance } = scenario();

      await service.setRole(1, alliance.id, 2, NONE);

      expect((await store.findMembership(2))?.role).toBe(NONE);
      expect(messagesTo(sent, 2)).toEqual([
        'Du wurdest von Deinem Amt in der Allianz Rogue Squadron entbunden',
      ]);
    });

    it('lets a vice appoint and dismiss diplomats only', async () => {
      const { store, service, alliance } = scenario();

      await service.setRole(2, alliance.id, 4, DIPLOMAT);
      expect((await store.findMembership(4))?.role).toBe(DIPLOMAT);
      await service.setRole(2, alliance.id, 3, NONE);
      expect((await store.findMembership(3))?.role).toBe(NONE);

      await expectError(service.setRole(2, alliance.id, 4, VICE), ForbiddenException);
      await expectError(service.setRole(2, alliance.id, 1, NONE), ForbiddenException);
    });

    it('refuses changing one’s own office', async () => {
      const { service, alliance } = scenario();

      await expectError(service.setRole(2, alliance.id, 2, NONE), BadRequestException);
      await expectError(service.setRole(1, alliance.id, 1, VICE), BadRequestException);
    });

    it('forbids diplomats and members', async () => {
      const { service, alliance } = scenario();

      await expectError(service.setRole(3, alliance.id, 4, DIPLOMAT), ForbiddenException);
      await expectError(service.setRole(4, alliance.id, 3, NONE), ForbiddenException);
    });

    it('refuses appointing to an office the member already holds', async () => {
      const { service, alliance } = scenario();

      await expectError(service.setRole(1, alliance.id, 2, VICE), ForbiddenException);
    });

    it('refuses appointing a president via setRole', async () => {
      const { service, alliance } = scenario();

      await expectError(
        service.setRole(1, alliance.id, 4, PRESIDENT),
        BadRequestException,
      );
    });

    describe('transferPresidency', () => {
      it('hands the presidency over and informs the new president', async () => {
        const { store, service, sent, alliance } = scenario();

        await service.transferPresidency(1, alliance.id, 3);

        expect((await store.findMembership(1))?.role).toBe(NONE);
        expect((await store.findMembership(3))?.role).toBe(PRESIDENT);
        expect(messagesTo(sent, 3)).toEqual([
          'Du wurdest zum Präsident der Allianz Rogue Squadron ernannt',
        ]);
      });

      it('lets the former president leave afterwards', async () => {
        const { store, service, alliance } = scenario();

        await service.transferPresidency(1, alliance.id, 2);
        await service.leave(1);

        expect(await store.findMembership(1)).toBeNull();
      });

      it('never leaves the alliance without president when the target left meanwhile', async () => {
        const { store, service, sent, alliance } = scenario();
        const lock = store.lockAlliance.bind(store);
        jest.spyOn(store, 'lockAlliance').mockImplementationOnce(async (id) => {
          await store.deleteMembership(alliance.id, 4);
          return lock(id);
        });

        await expectError(
          service.transferPresidency(1, alliance.id, 4),
          NotFoundException,
        );
        expect((await store.findMembership(1))?.role).toBe(PRESIDENT);
        expect(sent).toHaveLength(0);
      });

      it('reports a lost presidency race as a domain error', async () => {
        const { store, service, alliance } = scenario();
        jest
          .spyOn(store, 'setRole')
          .mockRejectedValueOnce(new AllianceConstraintViolation('alliance_president'));

        await expectError(
          service.transferPresidency(1, alliance.id, 4),
          BadRequestException,
          /gerade geändert/,
        );
        expect((await store.findMembership(1))?.role).toBe(PRESIDENT);
      });

      it('is reserved to the president', async () => {
        const { service, alliance } = scenario();

        await expectError(
          service.transferPresidency(2, alliance.id, 4),
          ForbiddenException,
        );
      });

      it('refuses transferring to oneself', async () => {
        const { service, alliance } = scenario();

        await expectError(
          service.transferPresidency(1, alliance.id, 1),
          BadRequestException,
        );
      });
    });
  });

  describe('update details', () => {
    function scenario() {
      const ctx = setup();
      const { store } = ctx;
      store.addPlayer(1, 'Leia');
      store.addPlayer(2, 'Wedge');
      store.addPlayer(3, 'Mon');
      const alliance = store.seedAlliance(
        {
          name: 'Rogue Squadron',
          description: 'alt',
          homepage: 'https://alt.example',
          color: '#000000',
          acceptsApplications: true,
        },
        [
          [1, PRESIDENT],
          [2, VICE],
          [3, DIPLOMAT],
        ],
      );
      store.seedAlliance({ name: 'Red Squadron' }, []);
      return { ...ctx, alliance };
    }

    it('lets president and vice change name, description, homepage and color', async () => {
      const { store, service, alliance } = scenario();

      await service.update(2, alliance.id, {
        name: '  Renegade Flight ',
        description: '[b]Neu[/b]',
        homepage: 'http://renegade.example',
        color: '#A1b2C3',
      });

      expect(await store.findAlliance(alliance.id)).toMatchObject({
        name: 'Renegade Flight',
        description: '[b]Neu[/b]',
        homepage: 'http://renegade.example',
        color: '#A1b2C3',
      });
    });

    it('keeps its own name in a different case', async () => {
      const { store, service, alliance } = scenario();

      await service.update(1, alliance.id, { name: 'ROGUE SQUADRON' });

      expect((await store.findAlliance(alliance.id))?.name).toBe('ROGUE SQUADRON');
    });

    it('clears the color and homepage with empty input', async () => {
      const { store, service, alliance } = scenario();

      await service.update(1, alliance.id, { color: '', homepage: '  ' });

      expect(await store.findAlliance(alliance.id)).toMatchObject({
        color: null,
        homepage: '',
      });
    });

    it.each([
      [{ name: 'Red Squadron' }, 'Dieser Allianzname ist bereits vergeben'],
      [{ name: 'Rog' }, /mindestens 5 Zeichen/],
      [{ name: 'x'.repeat(41) }, /höchstens 40 Zeichen/],
      [{ description: 'x'.repeat(10001) }, /10\.000 Zeichen/],
      [{ homepage: 'ftp://rogue.example' }, 'Diese Homepage-Adresse ist nicht gültig'],
      [{ homepage: 'rogue.example' }, 'Diese Homepage-Adresse ist nicht gültig'],
      [
        { homepage: 'https://x.example]Klick[/url][url=https://evil.example' },
        'Diese Homepage-Adresse ist nicht gültig',
      ],
      [{ homepage: 'https://' + 'x'.repeat(250) }, 'Diese Homepage-Adresse ist nicht gültig'],
      [{ color: '#12345' }, /RGB-Code/],
      [{ color: '123456' }, /RGB-Code/],
      [{ color: '#12345g' }, /RGB-Code/],
      [
        { titles: { president: 'Bo', vice: 'Vize', diplomat: 'Diplomat' } },
        /3 bis 30 Zeichen/,
      ],
      [
        { titles: { president: 'Boss', vice: 'x'.repeat(31), diplomat: 'Diplomat' } },
        /3 bis 30 Zeichen/,
      ],
    ])('rejects %j and saves nothing', async (patch, message) => {
      const { store, service, sent, alliance } = scenario();
      store.addPlayer(9, 'Han');
      store.seedApplication(alliance.id, 9);
      const before = await store.findAlliance(alliance.id);

      await expectError(
        service.update(1, alliance.id, {
          name: 'Renegade Flight',
          acceptsApplications: false,
          ...patch,
        }),
        BadRequestException,
        message,
      );

      expect(await store.findAlliance(alliance.id)).toEqual(before);
      expect(store.snapshot().applications).toHaveLength(1);
      expect(sent).toHaveLength(0);
    });

    it('renames the office titles used in the detail view', async () => {
      const { service, alliance } = scenario();

      await service.update(2, alliance.id, {
        titles: { president: 'Großadmiral', vice: 'Admiral', diplomat: 'Botschafter' },
      });

      const detail = await service.getDetail(1, alliance.id);
      expect(detail.titles).toEqual({
        president: 'Großadmiral',
        vice: 'Admiral',
        diplomat: 'Botschafter',
      });
      expect(detail.members.map((m) => m.roleTitle)).toEqual([
        'Großadmiral',
        'Admiral',
        'Botschafter',
      ]);
    });

    it('is forbidden for diplomats and outsiders', async () => {
      const { store, service, alliance } = scenario();
      store.addPlayer(9, 'Han');

      for (const actor of [3, 9]) {
        await expectError(
          service.update(actor, alliance.id, { description: 'gehackt' }),
          ForbiddenException,
        );
      }
      expect((await store.findAlliance(alliance.id))?.description).toBe('alt');
    });
  });
});
