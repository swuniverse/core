jest.mock('../messaging/messaging.service', () => ({
  MessagingService: class MessagingService {},
}));

import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AllianceChronicleEventType,
  AllianceDiplomacyChronicleEventType,
  AllianceRelationshipType,
  AllianceRole,
} from '@swuniverse/shared';
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

function silenceDiplomacyDeliveryErrors(service: AllianceService) {
  jest
    .spyOn((service as unknown as { logger: Logger }).logger, 'error')
    .mockImplementation();
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
      const rogue = store.seedAlliance(
        { name: 'Rogue Squadron', color: '#ff0000' },
        [[1, PRESIDENT]],
      );
      const red = store.seedAlliance(
        { name: 'Red Squadron', color: '#00ff00' },
        [],
      );
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
      await expect(
        service.getPublicRelationshipContract(rogue.id, relationship.id),
      ).resolves.toEqual({
        relationshipId: relationship.id,
        contract: '[b]Gemeinsam[/b]',
      });
    });

    it('projects vassalage direction publicly and hides missing contracts', async () => {
      const { store, service } = setup();
      store.addPlayer(1, 'Leia');
      const rogue = store.seedAlliance({ name: 'Rogue Squadron' }, [
        [1, PRESIDENT],
      ]);
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
        service.getPublicRelationshipContract(
          red.id,
          detail.relationships[0].id,
        ),
        NotFoundException,
        'Das Vertragswerk ist nicht verfügbar',
      );
    });

    it('records a public chronicle entry when an alliance declares war', async () => {
      const { store, service } = setup();
      store.addPlayer(1, 'Leia');
      store.addPlayer(2, 'Mon');
      const rogue = store.seedAlliance({ name: 'Rogue Squadron' }, [
        [1, PRESIDENT],
      ]);
      const red = store.seedAlliance({ name: 'Red Squadron' }, [
        [2, PRESIDENT],
      ]);

      await service.declareWar(1, rogue.id, red.id);

      await expect(service.listDiplomacyChronicle(2, red.id)).resolves.toEqual({
        entries: [
          expect.objectContaining({
            type: 'WAR_DECLARED',
            actor: { userId: 1, name: 'Leia' },
            firstAlliance: { id: rogue.id, name: 'Rogue Squadron' },
            secondAlliance: { id: red.id, name: 'Red Squadron' },
            relationship: {
              type: AllianceRelationshipType.WAR,
              vassalage: null,
            },
          }),
        ],
        nextCursor: null,
      });
    });

    it('renders only active public relationships in the diplomatic-relations placeholder', async () => {
      const { store, service } = setup();
      store.addPlayer(1, 'Leia');
      const rogue = store.seedAlliance(
        {
          name: 'Rogue Squadron',
          description: 'Beziehungen:\n$ALLIANCE_DIPLOMATIC_RELATIONS',
        },
        [[1, PRESIDENT]],
      );
      const red = store.seedAlliance({ name: '[b]Red[/b] Squadron' }, []);
      store.seedActiveAllianceRelationship({
        firstAllianceId: rogue.id,
        secondAllianceId: red.id,
        type: AllianceRelationshipType.VASSALAGE,
        lordAllianceId: rogue.id,
        vassalAllianceId: red.id,
        contract: 'geheimer Entwurf',
      });

      const detail = await service.getDetail(1, rogue.id);

      expect(detail.renderedDescription).toBe(
        'Beziehungen:\nVasallenschaft: \\[b\\]Red\\[/b\\] Squadron (Lehnsherr)',
      );
      expect(detail.renderedDescription).not.toContain('geheimer Entwurf');
    });

    it('keeps historical names and paginates the newest chronicle entries first', async () => {
      const { store, service } = setup();
      store.addPlayer(1, 'Leia');
      store.addPlayer(2, 'Mon');
      const rogue = store.seedAlliance({ name: 'Rogue Squadron' }, [
        [1, PRESIDENT],
      ]);
      const red = store.seedAlliance({ name: 'Red Squadron' }, [
        [2, PRESIDENT],
      ]);

      const proposal = await service.proposeRelationship(1, rogue.id, {
        recipientAllianceId: red.id,
        type: AllianceRelationshipType.FRIENDSHIP,
      });
      await service.acceptRelationshipProposal(2, proposal.id);
      await service.update(1, rogue.id, { name: 'Renegade Squadron' });
      const relationship = (await service.getDetail(1, rogue.id))
        .relationships[0];
      await service.endRelationship(1, relationship.id);

      const first = await service.listDiplomacyChronicle(
        2,
        red.id,
        undefined,
        1,
      );
      const second = await service.listDiplomacyChronicle(
        2,
        red.id,
        first.nextCursor ?? undefined,
        1,
      );

      expect(first.entries).toHaveLength(1);
      expect(first.entries[0]).toMatchObject({
        type: 'RELATIONSHIP_ENDED',
        firstAlliance: { id: rogue.id, name: 'Renegade Squadron' },
      });
      expect(first.nextCursor).toEqual(expect.any(String));
      expect(second).toMatchObject({
        entries: [
          expect.objectContaining({
            type: 'RELATIONSHIP_STARTED',
            firstAlliance: { id: rogue.id, name: 'Rogue Squadron' },
          }),
        ],
        nextCursor: null,
      });
    });

    it('records relationship replacements as public changes without contracts', async () => {
      const { store, service } = setup();
      store.addPlayer(1, 'Leia');
      store.addPlayer(2, 'Mon');
      const rogue = store.seedAlliance({ name: 'Rogue Squadron' }, [
        [1, PRESIDENT],
      ]);
      const red = store.seedAlliance({ name: 'Red Squadron' }, [
        [2, PRESIDENT],
      ]);
      store.seedActiveAllianceRelationship({
        firstAllianceId: rogue.id,
        secondAllianceId: red.id,
        type: AllianceRelationshipType.FRIENDSHIP,
        contract: 'existing secret',
      });

      const proposal = await service.proposeRelationship(1, rogue.id, {
        recipientAllianceId: red.id,
        type: AllianceRelationshipType.VASSALAGE,
        contract: 'replacement secret',
      });
      await service.acceptRelationshipProposal(2, proposal.id);

      const entry = (await service.listDiplomacyChronicle(1, rogue.id))
        .entries[0];
      expect(entry).toMatchObject({
        type: 'RELATIONSHIP_CHANGED',
        relationship: {
          type: AllianceRelationshipType.VASSALAGE,
          vassalage: { lordAllianceId: rogue.id, vassalAllianceId: red.id },
        },
      });
      expect(JSON.stringify(entry)).not.toContain('secret');
    });

    it('does not write chronicle entries for proposals, declines, withdrawals, or accepted contract-only changes', async () => {
      const { store, service } = setup();
      store.addPlayer(1, 'Leia');
      store.addPlayer(2, 'Mon');
      const rogue = store.seedAlliance({ name: 'Rogue Squadron' }, [
        [1, PRESIDENT],
      ]);
      const red = store.seedAlliance({ name: 'Red Squadron' }, [
        [2, PRESIDENT],
      ]);

      const proposal = await service.proposeRelationship(1, rogue.id, {
        recipientAllianceId: red.id,
        type: AllianceRelationshipType.FRIENDSHIP,
        contract: 'confidential draft',
      });
      await service.withdrawRelationshipProposal(1, proposal.id);
      const relationship = store.seedActiveAllianceRelationship({
        firstAllianceId: rogue.id,
        secondAllianceId: red.id,
        type: AllianceRelationshipType.FRIENDSHIP,
        contract: 'existing secret',
      });
      const change = await service.proposeRelationshipChange(
        1,
        relationship.id,
        {
          contract: 'replacement secret',
        },
      );
      await service.acceptRelationshipChange(2, change.id);

      expect((await service.listDiplomacyChronicle(2, red.id)).entries).toEqual(
        [],
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
        service.found(1, {
          name: 'Rogue Squadron',
          description: 'x'.repeat(10001),
        }),
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
        {
          name: 'Black Squadron',
          factionId: EMPIRE.id,
          acceptsApplications: false,
        },
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

      expect(detail.members.map((m) => [m.name, m.role, m.roleTitle])).toEqual([
        ['Leia', PRESIDENT, 'Großadmiral'],
        ['Biggs', VICE, 'Vize-Präsident'],
        ['Mon', DIPLOMAT, 'Diplomat'],
        ['Wedge', NONE, null],
      ]);
    });

    describe('online status', () => {
      function onlineScenario(online: number[]) {
        const store = new InMemoryAllianceStore();
        const messaging = { sendSystem: jest.fn() };
        const service = new AllianceService(
          store,
          messaging as never,
          undefined,
          { onlineUserIds: () => online },
        );
        store.addPlayer(1, 'Leia');
        store.addPlayer(2, 'Wedge');
        store.addPlayer(3, 'Mon');
        store.addPlayer(4, 'Biggs');
        const alliance = store.seedAlliance({ name: 'Rogue Squadron' }, [
          [1, PRESIDENT],
          [2, NONE],
        ]);
        store.seedAlliance({ name: 'Gold Squadron' }, [[3, PRESIDENT]]);
        return { store, service, alliance };
      }

      it('shows each member online status to a member of the alliance', async () => {
        const { service, alliance } = onlineScenario([2]);

        const { members } = await service.getDetail(1, alliance.id);

        expect(members.map((m) => [m.name, m.online])).toEqual([
          ['Leia', false],
          ['Wedge', true],
        ]);
      });

      it('omits the field for a member of another alliance', async () => {
        const { service, alliance } = onlineScenario([1, 2, 3]);

        const { members } = await service.getDetail(3, alliance.id);

        for (const m of members) expect(m).not.toHaveProperty('online');
      });

      it('omits the field for a player without alliance', async () => {
        const { service, alliance } = onlineScenario([1, 2]);

        const { members } = await service.getDetail(4, alliance.id);

        for (const m of members) expect(m).not.toHaveProperty('online');
      });

      it('omits the field for a former member', async () => {
        const { service, store, alliance } = onlineScenario([1, 2]);
        await service.leave(2);
        expect(await store.findMembership(2)).toBeNull();

        const { members } = await service.getDetail(2, alliance.id);

        for (const m of members) expect(m).not.toHaveProperty('online');
      });
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
            declareWar: false,
            warTargets: [],
            manageDiplomacy: false,
            viewChronicle: false,
          },
        });
        expect(
          members.every((m) => Object.values(m.actions).every((a) => !a)),
        ).toBe(true);
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
            declareWar: true,
            warTargets: [],
            manageDiplomacy: true,
            viewChronicle: true,
          },
        });
        const byName = Object.fromEntries(
          members.map((m) => [m.name, m.actions]),
        );
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
          declareWar: false,
          warTargets: [],
          manageDiplomacy: false,
        });
        const byName = Object.fromEntries(
          members.map((m) => [m.name, m.actions]),
        );
        expect(byName['Leia'].kick).toBe(false);
        expect(byName['Mon']).toMatchObject({ kick: true, dismiss: true });
        expect(byName['Biggs']).toMatchObject({
          kick: true,
          appointDiplomat: true,
          appointVice: false,
        });
      });

      it('gives diplomats war declaration and plain members only leave', async () => {
        const { service, alliance } = scenario();

        for (const [userId, declareWar, manageDiplomacy] of [
          [3, true, true],
          [4, false, false],
        ] as const) {
          const { viewer, members } = await service.getDetail(
            userId,
            alliance.id,
          );
          expect(viewer.actions).toEqual({
            apply: false,
            withdrawApplication: false,
            leave: true,
            editDetails: false,
            manageApplications: false,
            dissolve: false,
            declareWar,
            warTargets: [],
            manageDiplomacy,
            viewChronicle: true,
          });
          expect(
            members.every((m) => Object.values(m.actions).every((a) => !a)),
          ).toBe(true);
        }
      });
    });

    describe('description placeholders', () => {
      function withDescription(
        description: string,
        members: Array<[number, AllianceRole]>,
        homepage = '',
      ) {
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

  describe('declareWar', () => {
    function scenario() {
      const ctx = setup();
      const { store } = ctx;
      store.addPlayer(1, 'Leia');
      store.addPlayer(2, 'Wedge');
      store.addPlayer(3, 'Mon');
      store.addPlayer(4, 'Biggs');
      store.addPlayer(5, 'Vader', EMPIRE.id);
      store.addPlayer(6, 'Palpatine', EMPIRE.id);
      const alliance = store.seedAlliance({ name: 'Rogue Squadron' }, [
        [1, PRESIDENT],
        [2, DIPLOMAT],
        [3, VICE],
        [4, NONE],
      ]);
      const target = store.seedAlliance({ name: 'Red Squadron' }, [
        [5, PRESIDENT],
      ]);
      const foreign = store.seedAlliance(
        { name: 'Black Squadron', factionId: EMPIRE.id },
        [[6, PRESIDENT]],
      );
      return { ...ctx, alliance, target, foreign };
    }

    it('lets presidents and diplomats immediately replace a relationship with public war', async () => {
      const { store, service, sent, alliance, target } = scenario();
      store.seedActiveAllianceRelationship({
        firstAllianceId: alliance.id,
        secondAllianceId: target.id,
        type: AllianceRelationshipType.ALLIANCE,
        contract: 'Gemeinsam',
        treatAsFriend: true,
        shareLivePositions: true,
      });

      await service.declareWar(2, alliance.id, target.id);

      const relationships = await store.listActiveRelationships(alliance.id);
      expect(relationships).toEqual([
        expect.objectContaining({
          type: AllianceRelationshipType.WAR,
          contract: '',
          treatAsFriend: false,
          shareLivePositions: false,
        }),
      ]);
      expect((await service.getDetail(1, target.id)).relationships).toEqual([
        expect.objectContaining({
          counterparty: expect.objectContaining({ id: alliance.id }),
          type: AllianceRelationshipType.WAR,
          permissions: { treatAsFriend: false, shareLivePositions: false },
          hasContract: false,
        }),
      ]);
      expect(messagesTo(sent, 5)).toEqual([
        'Wedge hat im Namen der Allianz Rogue Squadron den Krieg erklärt',
      ]);
    });

    it('rejects vice presidents, members, outsiders, own alliances and foreign factions', async () => {
      const { service, alliance, target, foreign } = scenario();

      for (const actor of [3, 4, 999]) {
        await expectError(
          service.declareWar(actor, alliance.id, target.id),
          ForbiddenException,
        );
      }
      await expectError(
        service.declareWar(1, alliance.id, alliance.id),
        BadRequestException,
        'kein gültiges Kriegsziel',
      );
      await expectError(
        service.declareWar(1, alliance.id, foreign.id),
        BadRequestException,
        'kein gültiges Kriegsziel',
      );
    });

    it('sends no notification when the transactional mutation rolls back', async () => {
      const { store, service, sent, alliance, target } = scenario();
      jest
        .spyOn(store, 'replaceRelationshipsWithWar')
        .mockRejectedValueOnce(new Error('rollback'));

      await expect(
        service.declareWar(1, alliance.id, target.id),
      ).rejects.toThrow('rollback');

      expect(await store.listActiveRelationships(alliance.id)).toEqual([]);
      expect(await store.listPendingDiplomacyNotifications()).toEqual([]);
      expect(sent).toEqual([]);
    });

    it('retries a failed post-commit notification without repeating the war', async () => {
      const { store, sent, alliance, target } = scenario();
      const failingMessaging = {
        sendSystem: jest
          .fn()
          .mockRejectedValueOnce(new Error('messaging unavailable')),
      };
      const retryingService = new AllianceService(
        store,
        failingMessaging as never,
      );
      silenceDiplomacyDeliveryErrors(retryingService);

      await expect(
        retryingService.declareWar(1, alliance.id, target.id),
      ).resolves.toBeUndefined();
      expect(await store.listActiveRelationships(alliance.id)).toEqual([
        expect.objectContaining({ type: AllianceRelationshipType.WAR }),
      ]);

      failingMessaging.sendSystem.mockImplementation(
        async (to: number, subject: string, body: string) => {
          sent.push({ to, subject, body });
        },
      );
      await retryingService.retryDiplomacyNotifications();
      await retryingService.retryDiplomacyNotifications();

      expect(await store.listActiveRelationships(alliance.id)).toHaveLength(1);
      expect(messagesTo(sent, 5)).toEqual([
        'Leia hat im Namen der Allianz Rogue Squadron den Krieg erklärt',
      ]);
    });

    it('uses a stable delivery key when acknowledgment fails after sending', async () => {
      const { store, alliance, target } = scenario();
      const delivered = new Map<string, SentMessage>();
      const messaging = {
        sendSystem: jest.fn(
          async (
            to: number,
            subject: string,
            body: string,
            deliveryKey: string,
          ) => {
            if (!delivered.has(deliveryKey)) {
              delivered.set(deliveryKey, { to, subject, body });
            }
          },
        ),
      };
      const retryingService = new AllianceService(store, messaging as never);
      silenceDiplomacyDeliveryErrors(retryingService);
      const markDelivered = jest
        .spyOn(store, 'markDiplomacyNotificationDelivered')
        .mockRejectedValueOnce(new Error('acknowledgment unavailable'));

      await expect(
        retryingService.declareWar(1, alliance.id, target.id),
      ).resolves.toBeUndefined();
      expect(await store.listActiveRelationships(alliance.id)).toHaveLength(1);
      expect(delivered.size).toBe(1);
      expect(await store.listPendingDiplomacyNotifications()).toHaveLength(1);

      await retryingService.retryDiplomacyNotifications();

      expect(await store.listActiveRelationships(alliance.id)).toHaveLength(1);
      expect(delivered.size).toBe(1);
      expect(messaging.sendSystem).toHaveBeenCalledTimes(2);
      const [firstCall, secondCall] = messaging.sendSystem.mock.calls;
      expect(firstCall[3]).toBe(secondCall[3]);
      expect(markDelivered).toHaveBeenCalledTimes(2);
      expect(await store.listPendingDiplomacyNotifications()).toEqual([]);
    });

    it('keeps exactly one active war for repeated declarations', async () => {
      const { store, service, alliance, target } = scenario();

      await service.declareWar(1, alliance.id, target.id);
      await service.declareWar(2, alliance.id, target.id);

      const active = await store.listActiveRelationships(alliance.id);
      expect(active).toHaveLength(1);
      expect(active[0].type).toBe(AllianceRelationshipType.WAR);
    });
  });

  describe('diplomacy management', () => {
    function scenario() {
      const ctx = setup();
      const { store } = ctx;
      store.addPlayer(1, 'Leia');
      store.addPlayer(2, 'Mon');
      store.addPlayer(3, 'Wedge');
      store.addPlayer(4, 'Biggs');
      store.addPlayer(5, 'Vader', EMPIRE.id);
      const own = store.seedAlliance({ name: 'Rogue Squadron' }, [
        [1, PRESIDENT],
        [2, DIPLOMAT],
        [3, VICE],
        [4, NONE],
      ]);
      const counterparty = store.seedAlliance({ name: 'Red Squadron' }, []);
      const other = store.seedAlliance({ name: 'Gold Squadron' }, []);
      const proposer = store.seedAlliance({ name: 'Blue Squadron' }, []);
      const foreign = store.seedAlliance(
        { name: 'Black Squadron', factionId: EMPIRE.id },
        [[5, PRESIDENT]],
      );
      return { ...ctx, own, counterparty, other, proposer, foreign };
    }

    it('provides diplomatic officers an authoritative management view with active state, directions, capabilities and valid targets', async () => {
      const { store, service, own, counterparty, other, proposer, foreign } =
        scenario();
      const relationship = store.seedActiveAllianceRelationship({
        firstAllianceId: own.id,
        secondAllianceId: counterparty.id,
        type: AllianceRelationshipType.FRIENDSHIP,
        contract: '[b]Aktiv[/b]',
        treatAsFriend: true,
      });
      const sent = await store.insertRelationshipProposal({
        senderAllianceId: own.id,
        recipientAllianceId: other.id,
        type: AllianceRelationshipType.ALLIANCE,
        contract: '[b]Entwurf[/b]',
        treatAsFriend: true,
        shareLivePositions: true,
      });
      const received = await store.insertRelationshipProposal({
        senderAllianceId: proposer.id,
        recipientAllianceId: own.id,
        type: AllianceRelationshipType.TRADE_AGREEMENT,
        contract: 'Handel',
        treatAsFriend: false,
        shareLivePositions: false,
      });
      const change = await store.insertRelationshipChangeProposal({
        relationshipId: relationship.id,
        senderAllianceId: counterparty.id,
        recipientAllianceId: own.id,
        contract: '[b]Geändert[/b]',
        treatAsFriend: true,
        shareLivePositions: false,
      });

      const management = await service.getDiplomacyManagement(2, own.id);

      expect(management.capabilities).toEqual({ create: true });
      expect(management.targets).toEqual([
        { id: counterparty.id, name: 'Red Squadron', color: null },
        { id: other.id, name: 'Gold Squadron', color: null },
        { id: proposer.id, name: 'Blue Squadron', color: null },
      ]);
      expect(management.relationships).toEqual([
        expect.objectContaining({
          relationship: expect.objectContaining({
            id: relationship.id,
            type: AllianceRelationshipType.FRIENDSHIP,
            contract: '[b]Aktiv[/b]',
          }),
          change: expect.objectContaining({
            id: change.id,
            direction: 'RECEIVED',
          }),
          capabilities: {
            create: false,
            declareWar: true,
            offerPeace: false,
            accept: true,
            decline: true,
            withdraw: false,
            change: true,
            end: true,
          },
        }),
      ]);
      expect(management.proposals).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            proposal: expect.objectContaining({ id: sent.id }),
            direction: 'SENT',
            capabilities: expect.objectContaining({
              withdraw: true,
              accept: false,
              decline: false,
            }),
          }),
          expect.objectContaining({
            proposal: expect.objectContaining({ id: received.id }),
            direction: 'RECEIVED',
            capabilities: expect.objectContaining({
              withdraw: false,
              accept: true,
              decline: true,
            }),
          }),
        ]),
      );
      expect(management.permissions).toEqual({
        [AllianceRelationshipType.WAR]: {
          treatAsFriend: false,
          shareLivePositions: false,
        },
        [AllianceRelationshipType.PEACE]: {
          treatAsFriend: false,
          shareLivePositions: false,
        },
        [AllianceRelationshipType.FRIENDSHIP]: {
          treatAsFriend: true,
          shareLivePositions: false,
        },
        [AllianceRelationshipType.ALLIANCE]: {
          treatAsFriend: true,
          shareLivePositions: true,
        },
        [AllianceRelationshipType.TRADE_AGREEMENT]: {
          treatAsFriend: true,
          shareLivePositions: false,
        },
        [AllianceRelationshipType.VASSALAGE]: {
          treatAsFriend: true,
          shareLivePositions: false,
        },
      });
      expect(management.targets).not.toContainEqual(
        expect.objectContaining({ id: own.id }),
      );
      expect(management.targets).not.toContainEqual(
        expect.objectContaining({ id: foreign.id }),
      );
    });

    it.each([
      [3, 'vice'],
      [4, 'member'],
      [5, 'outsider'],
    ])('rejects a %s from viewing diplomatic management', async (actorId) => {
      const { service, own } = scenario();
      await expectError(
        service.getDiplomacyManagement(actorId, own.id),
        ForbiddenException,
      );
    });
  });

  describe('relationship proposals', () => {
    function scenario() {
      const ctx = setup();
      const { store } = ctx;
      store.addPlayer(1, 'Leia');
      store.addPlayer(2, 'Mon');
      store.addPlayer(3, 'Wedge');
      store.addPlayer(4, 'Vader', EMPIRE.id);
      store.addPlayer(5, 'Unaffiliated');
      const sender = store.seedAlliance({ name: 'Rogue Squadron' }, [
        [1, PRESIDENT],
        [3, DIPLOMAT],
      ]);
      const recipient = store.seedAlliance({ name: 'Red Squadron' }, [
        [2, DIPLOMAT],
      ]);
      const foreign = store.seedAlliance(
        { name: 'Black Squadron', factionId: EMPIRE.id },
        [[4, PRESIDENT]],
      );
      return { ...ctx, sender, recipient, foreign };
    }

    it('lets a president propose a confidential friendship agreement to a same-faction alliance', async () => {
      const { store, service, sent, sender, recipient } = scenario();

      await service.proposeRelationship(1, sender.id, {
        recipientAllianceId: recipient.id,
        type: AllianceRelationshipType.FRIENDSHIP,
        contract: '  [b]Gemeinsame Ziele[/b]  ',
        permissions: { treatAsFriend: true, shareLivePositions: false },
      });

      await expect(service.getDetail(3, sender.id)).resolves.toMatchObject({
        relationships: [],
      });
      await expect(
        service.listRelationshipProposals(1, sender.id),
      ).resolves.toEqual([
        expect.objectContaining({
          senderAllianceId: sender.id,
          recipientAllianceId: recipient.id,
          type: AllianceRelationshipType.FRIENDSHIP,
          contract: '[b]Gemeinsame Ziele[/b]',
          permissions: { treatAsFriend: true, shareLivePositions: false },
        }),
      ]);
      expect(messagesTo(sent, 2)).toEqual([
        expect.stringContaining('Beziehungsvorschlag'),
      ]);
      expect(sent.map((message) => message.body).join('\n')).not.toContain(
        '[b]Gemeinsame Ziele[/b]',
      );
      expect(store.snapshot().relationships).toEqual([]);
    });

    it('allows diplomats to create and respond, but keeps proposal lists confidential', async () => {
      const { store, service, sender, recipient } = scenario();
      store.addPlayer(6, 'Vice');
      store.addPlayer(7, 'Member');
      await store.insertMembership({
        allianceId: sender.id,
        userId: 6,
        role: AllianceRole.VICE,
      });
      await store.insertMembership({
        allianceId: recipient.id,
        userId: 7,
        role: AllianceRole.NONE,
      });

      const { id } = await service.proposeRelationship(3, sender.id, {
        recipientAllianceId: recipient.id,
        type: AllianceRelationshipType.FRIENDSHIP,
      });

      await service.acceptRelationshipProposal(2, id);
      expect(await store.listActiveRelationships(sender.id)).toHaveLength(1);

      const second = await service.proposeRelationship(3, sender.id, {
        recipientAllianceId: recipient.id,
        type: AllianceRelationshipType.TRADE_AGREEMENT,
      });
      for (const actorId of [5, 6, 7]) {
        await expectError(
          service.listRelationshipProposals(actorId, sender.id),
          ForbiddenException,
        );
      }
      await expect(
        service.listRelationshipProposals(3, sender.id),
      ).resolves.toEqual([expect.objectContaining({ id: second.id })]);
    });

    it.each([AllianceRole.VICE, AllianceRole.NONE])(
      'rejects proposal commands from %s even when called directly',
      async (role) => {
        const { store, service, sender, recipient } = scenario();
        store.addPlayer(5, 'Unauthorized');
        await store.insertMembership({
          allianceId: sender.id,
          userId: 5,
          role,
        });

        await expectError(
          service.proposeRelationship(5, sender.id, {
            recipientAllianceId: recipient.id,
            type: AllianceRelationshipType.FRIENDSHIP,
          }),
          ForbiddenException,
        );
      },
    );

    it('rejects self, foreign, peace, war, duplicate and invalid-permission proposals without state changes', async () => {
      const { store, service, sender, recipient, foreign } = scenario();
      const invalid = [
        {
          recipientAllianceId: sender.id,
          type: AllianceRelationshipType.FRIENDSHIP,
        },
        {
          recipientAllianceId: foreign.id,
          type: AllianceRelationshipType.FRIENDSHIP,
        },
        {
          recipientAllianceId: recipient.id,
          type: AllianceRelationshipType.WAR,
        },
        {
          recipientAllianceId: recipient.id,
          type: AllianceRelationshipType.PEACE,
        },
        {
          recipientAllianceId: recipient.id,
          type: AllianceRelationshipType.FRIENDSHIP,
          permissions: { shareLivePositions: true },
        },
        {
          recipientAllianceId: recipient.id,
          type: AllianceRelationshipType.FRIENDSHIP,
          contract: 'x'.repeat(20_001),
        },
      ];
      for (const request of invalid) {
        await expectError(
          service.proposeRelationship(1, sender.id, request),
          BadRequestException,
        );
      }
      await service.proposeRelationship(1, sender.id, {
        recipientAllianceId: recipient.id,
        type: AllianceRelationshipType.TRADE_AGREEMENT,
      });
      await expectError(
        service.proposeRelationship(1, sender.id, {
          recipientAllianceId: recipient.id,
          type: AllianceRelationshipType.ALLIANCE,
        }),
        BadRequestException,
      );
      expect(store.snapshot().relationshipProposals).toHaveLength(1);
      expect(store.snapshot().relationships).toEqual([]);
    });

    it('lets a diplomat propose and accept peace only for an active war, preserving the war until acceptance', async () => {
      const { store, service, sender, recipient } = scenario();
      const war = store.seedActiveAllianceRelationship({
        firstAllianceId: sender.id,
        secondAllianceId: recipient.id,
        type: AllianceRelationshipType.WAR,
      });

      const { id } = await service.proposeRelationship(3, sender.id, {
        recipientAllianceId: recipient.id,
        type: AllianceRelationshipType.PEACE,
        contract: '  Waffenruhe  ',
      });

      await expect(store.listActiveRelationships(sender.id)).resolves.toEqual([
        expect.objectContaining({
          id: war.id,
          type: AllianceRelationshipType.WAR,
        }),
      ]);
      await service.acceptRelationshipProposal(2, id);
      await expect(store.listActiveRelationships(sender.id)).resolves.toEqual([
        expect.objectContaining({
          type: AllianceRelationshipType.PEACE,
          contract: 'Waffenruhe',
          treatAsFriend: false,
          shareLivePositions: false,
          lordAllianceId: null,
          vassalAllianceId: null,
        }),
      ]);
      await expect(
        service.listDiplomacyChronicle(1, sender.id),
      ).resolves.toMatchObject({
        entries: [
          expect.objectContaining({
            type: AllianceDiplomacyChronicleEventType.RELATIONSHIP_CHANGED,
            relationship: {
              type: AllianceRelationshipType.PEACE,
              vassalage: null,
            },
          }),
        ],
      });

      const noWar = scenario();
      await expectError(
        noWar.service.proposeRelationship(1, noWar.sender.id, {
          recipientAllianceId: noWar.recipient.id,
          type: AllianceRelationshipType.PEACE,
        }),
        BadRequestException,
      );
    });

    it('does not let an obsolete peace proposal replace a war that was re-declared', async () => {
      const { store, service, sender, recipient } = scenario();
      store.seedActiveAllianceRelationship({
        firstAllianceId: sender.id,
        secondAllianceId: recipient.id,
        type: AllianceRelationshipType.WAR,
      });
      const { id } = await service.proposeRelationship(1, sender.id, {
        recipientAllianceId: recipient.id,
        type: AllianceRelationshipType.PEACE,
      });
      await service.declareWar(1, sender.id, recipient.id);

      await expectError(
        service.acceptRelationshipProposal(2, id),
        NotFoundException,
      );
      await expect(store.listActiveRelationships(sender.id)).resolves.toEqual([
        expect.objectContaining({ type: AllianceRelationshipType.WAR }),
      ]);
    });

    it('lets either diplomatic party end a non-war relationship and removes its pending change proposal', async () => {
      const { store, service, sent, sender, recipient } = scenario();
      const peace = store.seedActiveAllianceRelationship({
        firstAllianceId: sender.id,
        secondAllianceId: recipient.id,
        type: AllianceRelationshipType.PEACE,
      });
      await service.proposeRelationship(1, sender.id, {
        recipientAllianceId: recipient.id,
        type: AllianceRelationshipType.FRIENDSHIP,
      });

      await service.endRelationship(2, peace.id);

      await expect(store.listActiveRelationships(sender.id)).resolves.toEqual(
        [],
      );
      expect(store.snapshot().relationshipProposals).toEqual([]);
      expect(messagesTo(sent, 1)).toEqual([
        expect.stringContaining('Beziehung beendet'),
      ]);
      await expectError(
        service.endRelationship(1, peace.id),
        NotFoundException,
      );
    });

    it('only lets the recipient accept or decline and atomically replaces an active relationship with vassalage in sender direction', async () => {
      const { store, service, sent, sender, recipient } = scenario();
      store.seedActiveAllianceRelationship({
        firstAllianceId: sender.id,
        secondAllianceId: recipient.id,
        type: AllianceRelationshipType.FRIENDSHIP,
      });
      const { id } = await service.proposeRelationship(1, sender.id, {
        recipientAllianceId: recipient.id,
        type: AllianceRelationshipType.VASSALAGE,
        contract: 'Abkommen',
      });

      await expectError(
        service.acceptRelationshipProposal(1, id),
        ForbiddenException,
      );
      await service.acceptRelationshipProposal(2, id);

      const relationships = await store.listActiveRelationships(sender.id);
      expect(relationships).toEqual([
        expect.objectContaining({
          type: AllianceRelationshipType.VASSALAGE,
          lordAllianceId: sender.id,
          vassalAllianceId: recipient.id,
          contract: 'Abkommen',
        }),
      ]);
      expect(store.snapshot().relationshipProposals).toEqual([]);
      expect(
        store
          .snapshot()
          .relationships.filter(
            (relationship) => relationship.endedAt === null,
          ),
      ).toHaveLength(1);
      expect(
        store
          .snapshot()
          .relationships.find(
            (relationship) =>
              relationship.type === AllianceRelationshipType.FRIENDSHIP,
          )?.endedAt,
      ).not.toBeNull();
      expect(sent.map((message) => message.body).join('\n')).not.toContain(
        'Abkommen',
      );
      await expectError(
        service.declineRelationshipProposal(2, id),
        NotFoundException,
      );
      await expectError(
        service.withdrawRelationshipProposal(1, id),
        NotFoundException,
      );
    });

    it('only lets the sender withdraw and preserves active relationships when a proposal is declined or withdrawn', async () => {
      const { store, service, sender, recipient } = scenario();
      store.seedActiveAllianceRelationship({
        firstAllianceId: sender.id,
        secondAllianceId: recipient.id,
        type: AllianceRelationshipType.FRIENDSHIP,
      });
      const first = await service.proposeRelationship(1, sender.id, {
        recipientAllianceId: recipient.id,
        type: AllianceRelationshipType.TRADE_AGREEMENT,
      });
      await expectError(
        service.withdrawRelationshipProposal(2, first.id),
        ForbiddenException,
      );
      await service.declineRelationshipProposal(2, first.id);
      const second = await service.proposeRelationship(1, sender.id, {
        recipientAllianceId: recipient.id,
        type: AllianceRelationshipType.ALLIANCE,
      });
      await expectError(
        service.declineRelationshipProposal(1, second.id),
        ForbiddenException,
      );
      await service.withdrawRelationshipProposal(1, second.id);
      await expect(store.listActiveRelationships(sender.id)).resolves.toEqual([
        expect.objectContaining({ type: AllianceRelationshipType.FRIENDSHIP }),
      ]);
    });
  });

  describe('diplomacy authorization by role', () => {
    // Every diplomacy command is called directly on the server, bypassing any
    // UI gating. Only the president and the diplomat of the acting alliance may
    // succeed; everyone else is rejected without changing state.
    const ACTORS = {
      president: 1,
      diplomat: 2,
      vice: 3,
      member: 4,
      unaffiliated: 5,
      otherFaction: 6,
    } as const;
    type Actor = keyof typeof ACTORS;
    const AUTHORIZED: Actor[] = ['president', 'diplomat'];
    const UNAUTHORIZED: Actor[] = [
      'vice',
      'member',
      'unaffiliated',
      'otherFaction',
    ];

    function scenario() {
      const ctx = setup();
      const { store } = ctx;
      store.addPlayer(ACTORS.president, 'Leia');
      store.addPlayer(ACTORS.diplomat, 'Mon');
      store.addPlayer(ACTORS.vice, 'Wedge');
      store.addPlayer(ACTORS.member, 'Biggs');
      store.addPlayer(ACTORS.unaffiliated, 'Settler');
      store.addPlayer(ACTORS.otherFaction, 'Vader', EMPIRE.id);
      store.addPlayer(10, 'Counterpart');
      const own = store.seedAlliance({ name: 'Rogue Squadron' }, [
        [ACTORS.president, PRESIDENT],
        [ACTORS.diplomat, DIPLOMAT],
        [ACTORS.vice, VICE],
        [ACTORS.member, NONE],
      ]);
      const counterpart = store.seedAlliance({ name: 'Red Squadron' }, [
        [10, PRESIDENT],
      ]);
      const target = store.seedAlliance({ name: 'Gold Squadron' }, []);
      store.seedAlliance({ name: 'Black Squadron', factionId: EMPIRE.id }, [
        [ACTORS.otherFaction, PRESIDENT],
      ]);
      const relationship = store.seedActiveAllianceRelationship({
        firstAllianceId: own.id,
        secondAllianceId: counterpart.id,
        type: AllianceRelationshipType.FRIENDSHIP,
      });
      return { ...ctx, own, counterpart, target, relationship };
    }

    type Scenario = ReturnType<typeof scenario>;
    const COMMANDS: Array<
      [name: string, run: (ctx: Scenario, actorId: number) => Promise<unknown>]
    > = [
      [
        'declare war',
        ({ service, own, target }, actorId) =>
          service.declareWar(actorId, own.id, target.id),
      ],
      [
        'propose a relationship',
        ({ service, own, target }, actorId) =>
          service.proposeRelationship(actorId, own.id, {
            recipientAllianceId: target.id,
            type: AllianceRelationshipType.FRIENDSHIP,
          }),
      ],
      [
        'accept a received proposal',
        async ({ store, service, own, target }, actorId) => {
          const proposal = await store.insertRelationshipProposal({
            senderAllianceId: target.id,
            recipientAllianceId: own.id,
            type: AllianceRelationshipType.FRIENDSHIP,
            contract: '',
            treatAsFriend: false,
            shareLivePositions: false,
          });
          return service.acceptRelationshipProposal(actorId, proposal.id);
        },
      ],
      [
        'decline a received proposal',
        async ({ store, service, own, target }, actorId) => {
          const proposal = await store.insertRelationshipProposal({
            senderAllianceId: target.id,
            recipientAllianceId: own.id,
            type: AllianceRelationshipType.FRIENDSHIP,
            contract: '',
            treatAsFriend: false,
            shareLivePositions: false,
          });
          return service.declineRelationshipProposal(actorId, proposal.id);
        },
      ],
      [
        'withdraw a sent proposal',
        async ({ store, service, own, target }, actorId) => {
          const proposal = await store.insertRelationshipProposal({
            senderAllianceId: own.id,
            recipientAllianceId: target.id,
            type: AllianceRelationshipType.FRIENDSHIP,
            contract: '',
            treatAsFriend: false,
            shareLivePositions: false,
          });
          return service.withdrawRelationshipProposal(actorId, proposal.id);
        },
      ],
      [
        'propose a relationship change',
        ({ service, relationship }, actorId) =>
          service.proposeRelationshipChange(actorId, relationship.id, {
            contract: 'Neu',
          }),
      ],
      [
        'accept a received change',
        async ({ store, service, own, counterpart, relationship }, actorId) => {
          const change = await store.insertRelationshipChangeProposal({
            relationshipId: relationship.id,
            senderAllianceId: counterpart.id,
            recipientAllianceId: own.id,
            contract: 'Neu',
            treatAsFriend: false,
            shareLivePositions: false,
          });
          return service.acceptRelationshipChange(actorId, change.id);
        },
      ],
      [
        'decline a received change',
        async ({ store, service, own, counterpart, relationship }, actorId) => {
          const change = await store.insertRelationshipChangeProposal({
            relationshipId: relationship.id,
            senderAllianceId: counterpart.id,
            recipientAllianceId: own.id,
            contract: 'Neu',
            treatAsFriend: false,
            shareLivePositions: false,
          });
          return service.declineRelationshipChange(actorId, change.id);
        },
      ],
      [
        'withdraw a sent change',
        async ({ store, service, own, counterpart, relationship }, actorId) => {
          const change = await store.insertRelationshipChangeProposal({
            relationshipId: relationship.id,
            senderAllianceId: own.id,
            recipientAllianceId: counterpart.id,
            contract: 'Neu',
            treatAsFriend: false,
            shareLivePositions: false,
          });
          return service.withdrawRelationshipChange(actorId, change.id);
        },
      ],
      [
        'end a relationship',
        ({ service, relationship }, actorId) =>
          service.endRelationship(actorId, relationship.id),
      ],
      [
        'view diplomacy management',
        ({ service, own }, actorId) =>
          service.getDiplomacyManagement(actorId, own.id),
      ],
      [
        'list relationship proposals',
        ({ service, own }, actorId) =>
          service.listRelationshipProposals(actorId, own.id),
      ],
      [
        'list relationship changes',
        ({ service, own }, actorId) =>
          service.listRelationshipChangeProposals(actorId, own.id),
      ],
    ];

    describe.each(COMMANDS)('%s', (_name, run) => {
      it.each(AUTHORIZED)('is allowed for the %s', async (actor) => {
        const ctx = scenario();
        await expect(run(ctx, ACTORS[actor])).resolves.not.toThrow();
      });

      it.each(UNAUTHORIZED)(
        'is rejected for the %s without changing state',
        async (actor) => {
          const fresh = scenario();
          const before = fresh.store.snapshot();
          await expectError(run(fresh, ACTORS[actor]), ForbiddenException);
          const after = fresh.store.snapshot();
          expect(after.relationships).toEqual(before.relationships);
          expect(after.diplomacyChronicleEntries).toEqual(
            before.diplomacyChronicleEntries,
          );
          expect(after.diplomacyNotifications).toEqual(
            before.diplomacyNotifications,
          );
        },
      );
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
        await store.insertMembership({
          allianceId: other.id,
          userId: 8,
          role: VICE,
        });
        const application = store.seedApplication(alliance.id, 5);
        store.seedApplication(other.id, 5);

        await service.acceptApplication(1, application.id);

        expect(store.snapshot().applications).toHaveLength(0);
        const text =
          'Der Siedler Han wurde bei einer anderen Allianz aufgenommen';
        expect(messagesTo(sent, 7)).toEqual([text]);
        expect(messagesTo(sent, 8)).toEqual([text]);
        expect(messagesTo(sent, 1)).toEqual([]);
        expect(messagesTo(sent, 2)).toEqual([]);
      });

      it('fails if the applicant joined another alliance meanwhile', async () => {
        const { store, service, sent, alliance, other } = scenario();
        const application = store.seedApplication(alliance.id, 5);
        await store.insertMembership({
          allianceId: other.id,
          userId: 5,
          role: NONE,
        });

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
        jest
          .spyOn(store, 'insertMembership')
          .mockImplementationOnce(async (data) => {
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

        expect(
          (await store.findAlliance(alliance.id))?.acceptsApplications,
        ).toBe(false);
        expect(store.snapshot().applications).toHaveLength(0);
        const text =
          'Deine Bewerbung bei der Allianz Rogue Squadron wurde abgelehnt';
        expect(messagesTo(sent, 5)).toEqual([text]);
        expect(messagesTo(sent, 8)).toEqual([text]);
      });

      it('re-opens applications', async () => {
        const { store, service, alliance } = scenario();
        await store.updateAlliance(alliance.id, { acceptsApplications: false });

        await service.update(1, alliance.id, { acceptsApplications: true });

        expect(
          (await store.findAlliance(alliance.id))?.acceptsApplications,
        ).toBe(true);
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

  describe('relationship change proposals', () => {
    function scenario() {
      const ctx = setup();
      const { store } = ctx;
      store.addPlayer(1, 'Leia');
      store.addPlayer(2, 'Mon');
      store.addPlayer(3, 'Wedge');
      store.addPlayer(4, 'Biggs');
      const sender = store.seedAlliance({ name: 'Rogue Squadron' }, [
        [1, PRESIDENT],
        [3, DIPLOMAT],
      ]);
      const recipient = store.seedAlliance({ name: 'Red Squadron' }, [
        [2, DIPLOMAT],
        [4, NONE],
      ]);
      const relationship = store.seedActiveAllianceRelationship({
        firstAllianceId: sender.id,
        secondAllianceId: recipient.id,
        type: AllianceRelationshipType.ALLIANCE,
        contract: 'Bisheriges Vertragswerk',
        treatAsFriend: true,
        shareLivePositions: true,
      });
      return { ...ctx, sender, recipient, relationship };
    }

    it('keeps the active relationship public state unchanged until the counterparty accepts a diplomat’s replacement proposal', async () => {
      const { service, sender, recipient, relationship } = scenario();

      const { id } = await service.proposeRelationshipChange(
        3,
        relationship.id,
        {
          contract: 'Neues Vertragswerk',
          permissions: { treatAsFriend: false, shareLivePositions: false },
        },
      );

      await expect(
        service.getPublicRelationshipContract(sender.id, relationship.id),
      ).resolves.toEqual({
        relationshipId: relationship.id,
        contract: 'Bisheriges Vertragswerk',
      });
      await expect(service.getDetail(1, sender.id)).resolves.toMatchObject({
        relationships: [
          expect.objectContaining({
            id: relationship.id,
            permissions: { treatAsFriend: true, shareLivePositions: true },
          }),
        ],
      });

      await service.acceptRelationshipChange(2, id);

      await expect(
        service.getPublicRelationshipContract(sender.id, relationship.id),
      ).resolves.toEqual({
        relationshipId: relationship.id,
        contract: 'Neues Vertragswerk',
      });
      await expect(service.getDetail(4, recipient.id)).resolves.toMatchObject({
        relationships: [
          expect.objectContaining({
            id: relationship.id,
            permissions: { treatAsFriend: false, shareLivePositions: false },
          }),
        ],
      });
    });

    it('allows only the counterparty to accept or decline and only the sender to withdraw', async () => {
      const { service, relationship } = scenario();
      const { id } = await service.proposeRelationshipChange(
        1,
        relationship.id,
        {
          contract: 'Neues Vertragswerk',
        },
      );

      await expectError(
        service.acceptRelationshipChange(1, id),
        ForbiddenException,
      );
      await expectError(
        service.declineRelationshipChange(1, id),
        ForbiddenException,
      );
      await expectError(
        service.withdrawRelationshipChange(2, id),
        ForbiddenException,
      );
      await expect(
        service.withdrawRelationshipChange(3, id),
      ).resolves.toBeUndefined();
    });

    it('rejects invalid, identical, duplicate and war change states without changing the active relationship', async () => {
      const { store, service, sender, recipient, relationship } = scenario();

      await expectError(
        service.proposeRelationshipChange(1, relationship.id, {
          permissions: { shareLivePositions: 'yes' as never },
        }),
        BadRequestException,
      );
      await expectError(
        service.proposeRelationshipChange(1, relationship.id, {
          contract: 'Bisheriges Vertragswerk',
          permissions: { treatAsFriend: true, shareLivePositions: true },
        }),
        BadRequestException,
      );
      const { id } = await service.proposeRelationshipChange(
        1,
        relationship.id,
        {
          contract: 'Neues Vertragswerk',
        },
      );
      await expectError(
        service.proposeRelationshipChange(3, relationship.id, {
          contract: 'Noch ein Vertragswerk',
        }),
        BadRequestException,
      );
      await service.withdrawRelationshipChange(1, id);
      await expect(
        service.getPublicRelationshipContract(sender.id, relationship.id),
      ).resolves.toEqual({
        relationshipId: relationship.id,
        contract: 'Bisheriges Vertragswerk',
      });

      await service.declareWar(1, sender.id, recipient.id);
      const war = (await store.listActiveRelationships(sender.id)).find(
        (entry) => entry.type === AllianceRelationshipType.WAR,
      )!;
      await expectError(
        service.proposeRelationshipChange(1, war.id, { contract: 'Frieden' }),
        NotFoundException,
      );
    });

    it('removes a pending change when diplomacy escalates to war or the relationship ends', async () => {
      const { service, sender, recipient, relationship } = scenario();
      const first = await service.proposeRelationshipChange(
        1,
        relationship.id,
        {
          contract: 'Neues Vertragswerk',
        },
      );
      await service.declareWar(1, sender.id, recipient.id);
      await expectError(
        service.acceptRelationshipChange(2, first.id),
        NotFoundException,
      );

      const { service: secondService, relationship: secondRelationship } =
        scenario();
      const second = await secondService.proposeRelationshipChange(
        1,
        secondRelationship.id,
        { contract: 'Noch ein Vertragswerk' },
      );
      await secondService.endRelationship(1, secondRelationship.id);
      await expectError(
        secondService.acceptRelationshipChange(2, second.id),
        NotFoundException,
      );
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
        await expectError(
          service.leave(9),
          BadRequestException,
          'Du bist in keiner Allianz',
        );
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
          await expectError(
            service.dissolve(actor, alliance.id),
            ForbiddenException,
          );
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

      await expectError(
        service.setRole(2, alliance.id, 4, VICE),
        ForbiddenException,
      );
      await expectError(
        service.setRole(2, alliance.id, 1, NONE),
        ForbiddenException,
      );
    });

    it('refuses changing one’s own office', async () => {
      const { service, alliance } = scenario();

      await expectError(
        service.setRole(2, alliance.id, 2, NONE),
        BadRequestException,
      );
      await expectError(
        service.setRole(1, alliance.id, 1, VICE),
        BadRequestException,
      );
    });

    it('forbids diplomats and members', async () => {
      const { service, alliance } = scenario();

      await expectError(
        service.setRole(3, alliance.id, 4, DIPLOMAT),
        ForbiddenException,
      );
      await expectError(
        service.setRole(4, alliance.id, 3, NONE),
        ForbiddenException,
      );
    });

    it('refuses appointing to an office the member already holds', async () => {
      const { service, alliance } = scenario();

      await expectError(
        service.setRole(1, alliance.id, 2, VICE),
        ForbiddenException,
      );
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
          .mockRejectedValueOnce(
            new AllianceConstraintViolation('alliance_president'),
          );

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

      expect((await store.findAlliance(alliance.id))?.name).toBe(
        'ROGUE SQUADRON',
      );
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
      [
        { homepage: 'ftp://rogue.example' },
        'Diese Homepage-Adresse ist nicht gültig',
      ],
      [
        { homepage: 'rogue.example' },
        'Diese Homepage-Adresse ist nicht gültig',
      ],
      [
        { homepage: 'https://x.example]Klick[/url][url=https://evil.example' },
        'Diese Homepage-Adresse ist nicht gültig',
      ],
      [
        { homepage: 'https://' + 'x'.repeat(250) },
        'Diese Homepage-Adresse ist nicht gültig',
      ],
      [{ color: '#12345' }, /RGB-Code/],
      [{ color: '123456' }, /RGB-Code/],
      [{ color: '#12345g' }, /RGB-Code/],
      [
        { titles: { president: 'Bo', vice: 'Vize', diplomat: 'Diplomat' } },
        /3 bis 30 Zeichen/,
      ],
      [
        {
          titles: {
            president: 'Boss',
            vice: 'x'.repeat(31),
            diplomat: 'Diplomat',
          },
        },
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
        titles: {
          president: 'Großadmiral',
          vice: 'Admiral',
          diplomat: 'Botschafter',
        },
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

  describe('alliance chronicle: offices, handover and details', () => {
    function scenario() {
      const ctx = setup();
      const { store } = ctx;
      store.addPlayer(1, 'Leia');
      store.addPlayer(2, 'Wedge');
      store.addPlayer(3, 'Biggs');
      const alliance = store.seedAlliance(
        { name: 'Rogue Squadron', acceptsApplications: true },
        [
          [1, PRESIDENT],
          [2, VICE],
          [3, NONE],
        ],
      );
      return { ...ctx, alliance };
    }
    const entries = async (service: AllianceService, allianceId: number) =>
      (await service.listChronicle(1, allianceId)).entries;

    it('records an appointment with old and new office', async () => {
      const { service, alliance } = scenario();

      await service.setRole(1, alliance.id, 3, DIPLOMAT);

      expect(await entries(service, alliance.id)).toEqual([
        expect.objectContaining({
          type: AllianceChronicleEventType.ROLE_CHANGED,
          actor: { userId: 1, name: 'Leia' },
          subject: { userId: 3, name: 'Biggs' },
          metadata: expect.objectContaining({
            previousRole: NONE,
            newRole: DIPLOMAT,
          }),
        }),
      ]);
    });

    it('records a dismissal with old and new office', async () => {
      const { service, alliance } = scenario();

      await service.setRole(1, alliance.id, 2, NONE);

      expect((await entries(service, alliance.id))[0]).toEqual(
        expect.objectContaining({
          type: AllianceChronicleEventType.ROLE_CHANGED,
          metadata: expect.objectContaining({
            previousRole: VICE,
            newRole: NONE,
          }),
        }),
      );
    });

    it('records a presidency handover as exactly one entry', async () => {
      const { service, alliance } = scenario();

      await service.transferPresidency(1, alliance.id, 2);

      expect(await entries(service, alliance.id)).toEqual([
        expect.objectContaining({
          type: AllianceChronicleEventType.PRESIDENCY_TRANSFERRED,
          actor: { userId: 1, name: 'Leia' },
          subject: { userId: 2, name: 'Wedge' },
          metadata: expect.objectContaining({ previousRole: VICE }),
        }),
      ]);
    });

    it('records only the changed fields and the name change', async () => {
      const { service, alliance } = scenario();

      await service.update(1, alliance.id, {
        name: 'Renegade Squadron',
        description: 'geheim',
        homepage: '',
        acceptsApplications: false,
      });

      const [entry] = await entries(service, alliance.id);
      expect(entry.type).toBe(AllianceChronicleEventType.DETAILS_CHANGED);
      expect(entry.actor).toEqual({ userId: 1, name: 'Leia' });
      expect(entry.metadata).toEqual({
        fields: ['name', 'description', 'acceptsApplications'],
        previousName: 'Rogue Squadron',
        newName: 'Renegade Squadron',
      });
      expect(JSON.stringify(entry.metadata)).not.toContain('geheim');
    });

    it('records title changes without copying the title texts', async () => {
      const { service, alliance } = scenario();

      await service.update(1, alliance.id, {
        titles: { president: 'Boss', vice: 'Vize', diplomat: 'Diplomat' },
      });

      const [entry] = await entries(service, alliance.id);
      expect(entry.metadata).toEqual({ fields: ['titles'] });
    });

    it('records no entry for an update without actual change', async () => {
      const { store, service, alliance } = scenario();
      const current = (await store.findAlliance(alliance.id))!;

      await service.update(1, alliance.id, {
        name: current.name,
        description: current.description,
        acceptsApplications: current.acceptsApplications,
      });

      expect(await entries(service, alliance.id)).toEqual([]);
    });

    it('records nothing when the action fails', async () => {
      const { store, service, alliance } = scenario();

      await expectError(
        service.setRole(3, alliance.id, 2, NONE),
        ForbiddenException,
      );
      await expectError(
        service.transferPresidency(2, alliance.id, 3),
        ForbiddenException,
      );
      await expectError(
        service.update(3, alliance.id, { name: 'Nope Squadron' }),
        ForbiddenException,
      );

      expect(store.snapshot().allianceChronicleEntries).toEqual([]);
    });
  });

  describe('alliance chronicle', () => {
    function scenario() {
      const ctx = setup();
      const { store } = ctx;
      store.addPlayer(1, 'Leia');
      store.addPlayer(2, 'Wedge');
      store.addPlayer(3, 'Biggs');
      store.addPlayer(4, 'Han');
      store.addPlayer(5, 'Mon');
      const alliance = store.seedAlliance(
        { name: 'Rogue Squadron', acceptsApplications: true },
        [
          [1, PRESIDENT],
          [2, VICE],
          [3, NONE],
        ],
      );
      return { ...ctx, alliance };
    }

    const shape = (
      entries: Array<{ type: string; actor: unknown; subject: unknown }>,
    ) => entries.map(({ type, actor, subject }) => ({ type, actor, subject }));

    it('records the founding with the founder as actor', async () => {
      const { store, service } = setup();
      store.addPlayer(1, 'Leia');
      const { id } = await service.found(1, {
        name: 'Rogue Squadron',
        description: '',
      });

      const chronicle = await service.listChronicle(1, id);

      expect(shape(chronicle.entries)).toEqual([
        {
          type: AllianceChronicleEventType.FOUNDED,
          actor: { userId: 1, name: 'Leia' },
          subject: null,
        },
      ]);
      expect(chronicle.nextCursor).toBeNull();
    });

    it('records an accepted application with acceptor and new member', async () => {
      const { store, service, alliance } = scenario();
      store.seedApplication(alliance.id, 4);
      const application = (await service.listApplications(2, alliance.id))[0];

      await service.acceptApplication(2, application.id);

      expect(
        shape((await service.listChronicle(1, alliance.id)).entries),
      ).toEqual([
        {
          type: AllianceChronicleEventType.MEMBER_JOINED,
          actor: { userId: 2, name: 'Wedge' },
          subject: { userId: 4, name: 'Han' },
        },
      ]);
    });

    it('records no entry for applications, declines or diplomacy', async () => {
      const { store, service, alliance } = scenario();
      store.addPlayer(6, 'Lando');
      const other = store.seedAlliance({ name: 'Red Squadron' }, [
        [6, PRESIDENT],
      ]);
      store.seedApplication(alliance.id, 4);
      store.seedApplication(alliance.id, 5);
      const applications = await service.listApplications(1, alliance.id);
      await service.declineApplication(1, applications[0].id);
      await service.declareWar(1, alliance.id, other.id);

      expect((await service.listChronicle(1, alliance.id)).entries).toEqual([]);
    });

    it('records leaving with the leaver as actor and subject', async () => {
      const { service, alliance } = scenario();

      await service.leave(3);

      expect(
        shape((await service.listChronicle(1, alliance.id)).entries),
      ).toEqual([
        {
          type: AllianceChronicleEventType.MEMBER_LEFT,
          actor: { userId: 3, name: 'Biggs' },
          subject: { userId: 3, name: 'Biggs' },
        },
      ]);
    });

    it('records a kick with the acting officer and the removed member', async () => {
      const { service, alliance } = scenario();

      await service.kick(2, alliance.id, 3);

      expect(
        shape((await service.listChronicle(1, alliance.id)).entries),
      ).toEqual([
        {
          type: AllianceChronicleEventType.MEMBER_KICKED,
          actor: { userId: 2, name: 'Wedge' },
          subject: { userId: 3, name: 'Biggs' },
        },
      ]);
    });

    it('leaves no entry when the action fails', async () => {
      const { store, service, alliance } = scenario();

      await expectError(service.kick(3, alliance.id, 2), ForbiddenException);
      await expectError(service.leave(1), BadRequestException);

      expect(store.snapshot().allianceChronicleEntries).toEqual([]);
    });

    it('rolls back the action when the entry cannot be written', async () => {
      const { store, service, alliance } = scenario();
      jest
        .spyOn(store, 'appendAllianceChronicleEntry')
        .mockRejectedValue(new Error('boom'));

      await expect(service.kick(2, alliance.id, 3)).rejects.toThrow('boom');

      expect(await store.findMembership(3)).not.toBeNull();
    });

    it('keeps names as of the event time after a rename', async () => {
      const { store, service, alliance } = scenario();
      await service.kick(2, alliance.id, 3);
      store.renamePlayer(3, 'Renamed');

      const [entry] = (await service.listChronicle(1, alliance.id)).entries;

      expect(entry.subject).toEqual({ userId: 3, name: 'Biggs' });
    });

    it('is readable by current members only and access ends with membership', async () => {
      const { store, service, alliance } = scenario();
      store.seedAlliance({ name: 'Red Squadron' }, [[5, PRESIDENT]]);

      await expect(
        service.listChronicle(3, alliance.id),
      ).resolves.toBeDefined();
      await expectError(
        service.listChronicle(4, alliance.id),
        NotFoundException,
      );
      await expectError(
        service.listChronicle(5, alliance.id),
        NotFoundException,
      );

      await service.kick(2, alliance.id, 3);
      await expectError(
        service.listChronicle(3, alliance.id),
        NotFoundException,
      );
      await service.leave(2);
      await expectError(
        service.listChronicle(2, alliance.id),
        NotFoundException,
      );
    });

    it('paginates newest first with a cursor', async () => {
      const { store, service, alliance } = scenario();
      for (const id of [4, 5]) {
        store.seedApplication(alliance.id, id);
      }
      for (const application of await service.listApplications(
        1,
        alliance.id,
      )) {
        await service.acceptApplication(1, application.id);
      }
      await service.kick(1, alliance.id, 3);

      const first = await service.listChronicle(1, alliance.id, undefined, 2);
      expect(first.entries.map((e) => e.type)).toEqual([
        AllianceChronicleEventType.MEMBER_KICKED,
        AllianceChronicleEventType.MEMBER_JOINED,
      ]);
      expect(first.nextCursor).not.toBeNull();
      const second = await service.listChronicle(
        1,
        alliance.id,
        first.nextCursor ?? undefined,
        2,
      );
      expect(second.entries).toHaveLength(1);
      expect(second.nextCursor).toBeNull();
      expect(second.entries[0].subject).toEqual({ userId: 4, name: 'Han' });
    });

    it('keeps diplomacy history out of the alliance chronicle and vice versa', async () => {
      const { store, service, alliance } = scenario();
      store.addPlayer(6, 'Lando');
      const other = store.seedAlliance({ name: 'Red Squadron' }, [
        [6, PRESIDENT],
      ]);
      await service.declareWar(1, alliance.id, other.id);
      await service.kick(2, alliance.id, 3);

      expect(
        (await service.listChronicle(1, alliance.id)).entries,
      ).toHaveLength(1);
      expect(
        (await service.listDiplomacyChronicle(1, alliance.id)).entries.map(
          (e) => e.type,
        ),
      ).toEqual([AllianceDiplomacyChronicleEventType.WAR_DECLARED]);
    });

    it('offers the chronicle capability to members only', async () => {
      const { store, service, alliance } = scenario();
      store.addPlayer(7, 'Outsider');

      expect(
        (await service.getDetail(3, alliance.id)).viewer.actions.viewChronicle,
      ).toBe(true);
      expect(
        (await service.getDetail(7, alliance.id)).viewer.actions.viewChronicle,
      ).toBe(false);
    });
  });
});
