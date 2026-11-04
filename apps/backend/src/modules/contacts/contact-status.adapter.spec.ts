import { ContactMode } from '@swuniverse/shared';
import { RelationshipResolverService } from '../alliance/relationship-resolver.service';
import {
  relationshipRecordOf,
  type AllianceStore,
} from '../alliance/alliance.store';
import { AllianceRelationshipType } from '@swuniverse/shared';
import { playerParty } from '../alliance/diplomacy-party';
import { ContactStatusAdapter } from './contact-status.adapter';
import type { ContactService } from './contact.service';

function store(players: Array<{ id: number; factionId: number }>, war = false): AllianceStore {
  return {
    findPlayers: jest.fn(async (ids: number[]) => players.filter((player) => ids.includes(player.id))),
    findMemberships: jest.fn(async () => []),
    listActiveRelationships: jest.fn(async () =>
      war
        ? [
            relationshipRecordOf({
              id: 1,
              firstParty: playerParty(1),
              secondParty: playerParty(2),
              type: AllianceRelationshipType.WAR,
              startedAt: new Date(),
              endedAt: null,
              contract: '',
              treatAsFriend: false,
              shareLivePositions: false,
              lordParty: null,
              vassalParty: null,
            }),
          ]
        : [],
    ),
  } as unknown as AllianceStore;
}

describe('ContactStatusAdapter relationship effect', () => {
  const contactService = (mode: ContactMode | null) =>
    ({
      statuses: jest.fn(async (_userId: number, contactUserIds: number[]) =>
        mode === ContactMode.FRIEND || mode === ContactMode.ENEMY
          ? new Map(contactUserIds.map((id) => [id, mode] as const))
          : new Map(),
      ),
    }) as unknown as ContactService;

  it('resolves a same-faction friend contact as FRIEND', async () => {
    const resolver = new RelationshipResolverService(
      store([{ id: 1, factionId: 1 }, { id: 2, factionId: 1 }]),
      new ContactStatusAdapter(contactService(ContactMode.FRIEND)),
    );
    expect((await resolver.resolve(1, 2)).status).toBe('FRIEND');
  });

  it('resolves a same-faction enemy contact as ENEMY', async () => {
    const resolver = new RelationshipResolverService(
      store([{ id: 1, factionId: 1 }, { id: 2, factionId: 1 }]),
      new ContactStatusAdapter(contactService(ContactMode.ENEMY)),
    );
    expect((await resolver.resolve(1, 2)).status).toBe('ENEMY');
  });

  it('keeps neutral contacts neutral', async () => {
    const resolver = new RelationshipResolverService(
      store([{ id: 1, factionId: 1 }, { id: 2, factionId: 1 }]),
      new ContactStatusAdapter(contactService(ContactMode.NEUTRAL)),
    );
    expect((await resolver.resolve(1, 2)).status).toBe('NEUTRAL');
  });

  it('does not override faction hostility or alliance war', async () => {
    const adapter = new ContactStatusAdapter(contactService(ContactMode.FRIEND));
    const foreign = new RelationshipResolverService(
      store([{ id: 1, factionId: 1 }, { id: 2, factionId: 2 }]),
      adapter,
    );
    const war = new RelationshipResolverService(
      store([{ id: 1, factionId: 1 }, { id: 2, factionId: 1 }], true),
      adapter,
    );
    expect((await foreign.resolve(1, 2)).status).toBe('ENEMY');
    expect((await war.resolve(1, 2)).status).toBe('ENEMY');
  });
});
