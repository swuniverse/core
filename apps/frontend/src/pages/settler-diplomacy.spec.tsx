import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  AllianceRelationshipType,
  DiplomacyPartyType,
  type SettlerDiplomacyManagementDto,
} from '@swuniverse/shared';

import type * as ApiModule from '../services/api';
import { AllianceListPage, SettlerDiplomacyPage } from './alliances';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  postForm: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, api: apiMocks };
});

const NO_ACTIONS = {
  create: false,
  declareWar: false,
  offerPeace: false,
  accept: false,
  decline: false,
  withdraw: false,
  change: false,
  end: false,
};

function management(
  overrides: Partial<SettlerDiplomacyManagementDto> = {},
): SettlerDiplomacyManagementDto {
  const none = { treatAsFriend: false, shareLivePositions: false };
  return {
    capabilities: { create: true, declareWar: true },
    relationships: [
      {
        relationship: {
          id: 10,
          counterparty: { id: 2, name: 'Lando', color: null },
          counterpartyType: DiplomacyPartyType.PLAYER,
          type: AllianceRelationshipType.WAR,
          startedAt: '2026-10-01T12:00:00.000Z',
          permissions: none,
          vassalage: null,
          hasContract: false,
          contract: '',
        },
        change: null,
        capabilities: { ...NO_ACTIONS, offerPeace: true },
      },
    ],
    proposals: [
      {
        proposal: {
          id: 20,
          senderAllianceId: 3,
          recipientAllianceId: 1,
          senderPartyType: DiplomacyPartyType.PLAYER,
          recipientPartyType: DiplomacyPartyType.PLAYER,
          type: AllianceRelationshipType.PEACE,
          contract: 'Empfangen',
          permissions: none,
          createdAt: '2026-10-02T12:00:00.000Z',
        },
        direction: 'RECEIVED',
        capabilities: { ...NO_ACTIONS, accept: true, decline: true },
      },
      {
        proposal: {
          id: 21,
          senderAllianceId: 1,
          recipientAllianceId: 4,
          senderPartyType: DiplomacyPartyType.PLAYER,
          recipientPartyType: DiplomacyPartyType.PLAYER,
          type: AllianceRelationshipType.PEACE,
          contract: 'Gesendet',
          permissions: none,
          createdAt: '2026-10-03T12:00:00.000Z',
        },
        direction: 'SENT',
        capabilities: { ...NO_ACTIONS, withdraw: true },
      },
    ],
    permissions: {} as SettlerDiplomacyManagementDto['permissions'],
    ...overrides,
  };
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/alliances" element={<AllianceListPage />} />
        <Route
          path="/alliances/settlers/diplomacy"
          element={<SettlerDiplomacyPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function routeGet(routes: Record<string, unknown>) {
  apiMocks.get.mockImplementation((url: string) => {
    if (url in routes) return Promise.resolve(routes[url]);
    return Promise.reject(new Error(`Unexpected URL ${url}`));
  });
}

beforeEach(() => {
  for (const mock of Object.values(apiMocks)) mock.mockReset();
  apiMocks.post.mockResolvedValue({});
  apiMocks.delete.mockResolvedValue({});
});

describe('Siedler diplomacy entry', () => {
  it('links to the settler area only when the server grants the capability', async () => {
    routeGet({
      '/alliances': [],
      '/alliances/mine': {
        alliance: null,
        actions: { settlerDiplomacy: true },
      },
    });
    const { unmount } = renderAt('/alliances');
    expect(
      (
        await screen.findByRole('link', { name: 'Siedler-Diplomatie' })
      ).getAttribute('href'),
    ).toBe('/alliances/settlers/diplomacy');
    unmount();

    routeGet({
      '/alliances': [],
      '/alliances/mine': {
        alliance: { id: 1, name: 'Rogue Squadron', color: null },
        actions: { settlerDiplomacy: false },
      },
    });
    renderAt('/alliances');
    await screen.findByRole('link', { name: 'Meine Allianz' });
    expect(
      screen.queryByRole('link', { name: 'Siedler-Diplomatie' }),
    ).toBeNull();
  });
});

describe('SettlerDiplomacyPage', () => {
  it('shows relationships and proposals with server-provided actions only', async () => {
    routeGet({ '/alliances/settlers/diplomacy': management() });
    renderAt('/alliances/settlers/diplomacy');

    expect(await screen.findByText('Lando: Krieg')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Frieden anbieten' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Beenden' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Annehmen' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Ablehnen' })).toHaveLength(1);
    expect(
      screen.getAllByRole('button', { name: 'Zurückziehen' }),
    ).toHaveLength(1);
  });

  it('hides war declaration without the server capability', async () => {
    routeGet({
      '/alliances/settlers/diplomacy': management({
        capabilities: { create: false, declareWar: false },
      }),
    });
    renderAt('/alliances/settlers/diplomacy');
    await screen.findByText('Lando: Krieg');
    expect(screen.queryByLabelText('Siedler suchen')).toBeNull();
  });

  it('searches counterparties, loads more pages and declares war without sending a party', async () => {
    routeGet({
      '/alliances/settlers/diplomacy': management(),
      '/alliances/settlers/counterparties?q=Chew': {
        players: [{ id: 3, name: 'Chewie' }],
        nextCursor: 'abc',
      },
      '/alliances/settlers/counterparties?q=Chew&cursor=abc': {
        players: [{ id: 5, name: 'Chewbacca' }],
        nextCursor: null,
      },
    });
    renderAt('/alliances/settlers/diplomacy');

    fireEvent.change(await screen.findByLabelText('Siedler suchen'), {
      target: { value: 'Chew' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }));
    expect(await screen.findByText('Chewie')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Mehr laden' }));
    expect(await screen.findByText('Chewbacca')).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: 'Krieg erklären: Chewie' }),
    );

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/alliances/settlers/3/war',
        {},
      ),
    );
  });

  it('answers proposals and reloads the authoritative state', async () => {
    let loads = 0;
    apiMocks.get.mockImplementation(() => {
      loads += 1;
      return Promise.resolve(management());
    });
    renderAt('/alliances/settlers/diplomacy');

    fireEvent.click(await screen.findByRole('button', { name: 'Annehmen' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/alliances/diplomacy/proposals/20/accept',
        {},
      ),
    );
    await waitFor(() => expect(loads).toBe(2));

    fireEvent.click(
      await screen.findByRole('button', { name: 'Zurückziehen' }),
    );
    await waitFor(() =>
      expect(apiMocks.delete).toHaveBeenCalledWith(
        '/alliances/diplomacy/proposals/21',
      ),
    );
  });

  it('offers peace to the war counterparty with the recipient player ID', async () => {
    routeGet({ '/alliances/settlers/diplomacy': management() });
    renderAt('/alliances/settlers/diplomacy');

    fireEvent.click(
      await screen.findByRole('button', { name: 'Frieden anbieten' }),
    );

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/alliances/settlers/diplomacy/proposals',
        { recipientPlayerId: 2, type: AllianceRelationshipType.PEACE },
      ),
    );
  });

  it('disables actions while a request runs and shows errors', async () => {
    routeGet({ '/alliances/settlers/diplomacy': management() });
    let reject: (error: Error) => void = () => undefined;
    apiMocks.post.mockImplementation(() => new Promise((_, r) => (reject = r)));
    renderAt('/alliances/settlers/diplomacy');

    const accept = await screen.findByRole('button', { name: 'Annehmen' });
    fireEvent.click(accept);
    expect((accept as HTMLButtonElement).disabled).toBe(true);
    expect(
      (
        screen.getByRole('button', {
          name: 'Frieden anbieten',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    reject(new Error('Server verweigert die Aktion'));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Server verweigert die Aktion',
    );
    expect((accept as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('Siedler negotiations in the shared dialogs', () => {
  const PERMISSIONS = {
    FRIENDSHIP: { treatAsFriend: true, shareLivePositions: false },
    ALLIANCE: { treatAsFriend: true, shareLivePositions: true },
    PEACE: { treatAsFriend: false, shareLivePositions: false },
  } as unknown as SettlerDiplomacyManagementDto['permissions'];

  it('proposes a relationship to a searched Siedler with permissions and contract', async () => {
    routeGet({
      '/alliances/settlers/diplomacy': management({ permissions: PERMISSIONS }),
      '/alliances/settlers/counterparties?q=Chew': {
        players: [{ id: 3, name: 'Chewie' }],
        nextCursor: null,
      },
    });
    renderAt('/alliances/settlers/diplomacy');

    fireEvent.change(await screen.findByLabelText('Siedler suchen'), {
      target: { value: 'Chew' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Verhandeln: Chewie' }),
    );
    fireEvent.change(screen.getByLabelText('Vertragsentwurf'), {
      target: { value: 'Pakt' },
    });
    fireEvent.click(screen.getByLabelText('Als Freund behandeln'));
    fireEvent.click(screen.getByRole('button', { name: 'Vorschlag senden' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/alliances/settlers/diplomacy/proposals',
        {
          recipientPlayerId: 3,
          type: AllianceRelationshipType.FRIENDSHIP,
          contract: 'Pakt',
          permissions: { treatAsFriend: true, shareLivePositions: false },
        },
      ),
    );
  });

  it('proposes a change and ends a relationship when the server grants the actions', async () => {
    const base = management({ permissions: PERMISSIONS });
    const none = { treatAsFriend: false, shareLivePositions: false };
    routeGet({
      '/alliances/settlers/diplomacy': {
        ...base,
        proposals: [],
        relationships: [
          {
            ...base.relationships[0],
            relationship: {
              ...base.relationships[0].relationship,
              type: AllianceRelationshipType.FRIENDSHIP,
              permissions: none,
            },
            capabilities: { ...NO_ACTIONS, change: true, end: true },
          },
        ],
      },
    });
    renderAt('/alliances/settlers/diplomacy');

    fireEvent.change(await screen.findByLabelText('Änderungsentwurf Lando'), {
      target: { value: 'Neu' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Änderung vorschlagen' }),
    );
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/alliances/relationships/10/changes',
        {
          contract: 'Neu',
          permissions: { treatAsFriend: false, shareLivePositions: false },
        },
      ),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Beenden' }));
    await waitFor(() =>
      expect(apiMocks.delete).toHaveBeenCalledWith(
        '/alliances/relationships/10',
      ),
    );
  });
});
