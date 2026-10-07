import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  AllianceRelationshipType,
  AllianceRole,
  Faction,
  type AllianceDetailDto,
  type AllianceDiplomacyManagementDto,
  type AllianceMemberActionsDto,
  type AllianceSummaryDto,
} from '@swuniverse/shared';

import { ApiError } from '../services/api';
import type * as ApiModule from '../services/api';
import {
  AllianceDetailPage,
  AllianceDiplomacyPage,
  AllianceEditPage,
  AllianceFoundPage,
  AllianceListPage,
} from './alliances';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, api: apiMocks };
});

const NO_MEMBER_ACTIONS: AllianceMemberActionsDto = {
  kick: false,
  appointVice: false,
  appointDiplomat: false,
  dismiss: false,
  transferPresidency: false,
};

const summary = (
  overrides: Partial<AllianceSummaryDto> = {},
): AllianceSummaryDto => ({
  id: 1,
  name: 'Rogue Squadron',
  color: '#ff0000',
  faction: Faction.REBEL_ALLIANCE,
  factionName: 'Rebellenallianz',
  memberCount: 2,
  acceptsApplications: true,
  foundedAt: '2026-10-01T12:00:00.000Z',
  ...overrides,
});

function detail(overrides: Partial<AllianceDetailDto> = {}): AllianceDetailDto {
  return {
    ...summary(),
    homepage: 'https://rogue.example',
    description: '[b]Wir[/b] fliegen',
    renderedDescription: '[b]Wir[/b] fliegen',
    titles: {
      president: 'Großadmiral',
      vice: 'Vize-Präsident',
      diplomat: 'Diplomat',
    },
    members: [
      {
        userId: 1,
        name: 'Leia',
        role: AllianceRole.PRESIDENT,
        roleTitle: 'Großadmiral',
        joinedAt: '2026-10-01T12:00:00.000Z',
        actions: NO_MEMBER_ACTIONS,
      },
      {
        userId: 2,
        name: 'Wedge',
        role: AllianceRole.NONE,
        roleTitle: null,
        joinedAt: '2026-10-02T12:00:00.000Z',
        actions: NO_MEMBER_ACTIONS,
      },
    ],
    relationships: [],
    viewer: {
      role: null,
      actions: {
        apply: false,
        withdrawApplication: false,
        leave: false,
        editDetails: false,
        manageApplications: false,
        dissolve: false,
        declareWar: false,
        warTargets: [],
        manageDiplomacy: false,
      },
    },
    ...overrides,
  };
}

function diplomacyManagement(): AllianceDiplomacyManagementDto {
  return {
    enabled: true,
    effectsApplied: false,
    capabilities: { create: true },
    targets: [{ id: 2, name: 'Red Squadron', color: null }],
    relationships: [
      {
        relationship: {
          id: 10,
          counterparty: { id: 2, name: 'Red Squadron', color: null },
          type: AllianceRelationshipType.FRIENDSHIP,
          startedAt: '2026-10-01T12:00:00.000Z',
          permissions: { treatAsFriend: true, shareLivePositions: false },
          vassalage: null,
          hasContract: true,
          contract: '[b]Aktiv[/b]',
        },
        change: {
          id: 11,
          relationshipId: 10,
          senderAllianceId: 2,
          recipientAllianceId: 1,
          contract: '[b]Änderung[/b]',
          permissions: { treatAsFriend: true, shareLivePositions: false },
          createdAt: '2026-10-02T12:00:00.000Z',
          direction: 'RECEIVED',
        },
        capabilities: {
          create: false,
          declareWar: false,
          offerPeace: false,
          accept: true,
          decline: true,
          withdraw: false,
          change: true,
          end: true,
        },
      },
    ],
    proposals: [
      {
        proposal: {
          id: 12,
          senderAllianceId: 1,
          recipientAllianceId: 2,
          type: AllianceRelationshipType.ALLIANCE,
          contract: '[b]Gesendet[/b]',
          permissions: { treatAsFriend: true, shareLivePositions: true },
          createdAt: '2026-10-03T12:00:00.000Z',
        },
        direction: 'SENT',
        capabilities: {
          create: false,
          declareWar: false,
          offerPeace: false,
          accept: false,
          decline: false,
          withdraw: true,
          change: false,
          end: false,
        },
      },
      {
        proposal: {
          id: 13,
          senderAllianceId: 2,
          recipientAllianceId: 1,
          type: AllianceRelationshipType.TRADE_AGREEMENT,
          contract: '[b]Empfangen[/b]',
          permissions: { treatAsFriend: true, shareLivePositions: false },
          createdAt: '2026-10-04T12:00:00.000Z',
        },
        direction: 'RECEIVED',
        capabilities: {
          create: false,
          declareWar: false,
          offerPeace: false,
          accept: true,
          decline: true,
          withdraw: false,
          change: false,
          end: false,
        },
      },
    ],
    permissions: {
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
    },
  };
}

function withViewer(
  base: AllianceDetailDto,
  role: AllianceRole | null,
  actions: Partial<AllianceDetailDto['viewer']['actions']>,
): AllianceDetailDto {
  return {
    ...base,
    viewer: { role, actions: { ...base.viewer.actions, ...actions } },
  };
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/alliances" element={<AllianceListPage />} />
        <Route path="/alliances/new" element={<AllianceFoundPage />} />
        <Route
          path="/alliances/:id/diplomacy"
          element={<AllianceDiplomacyPage />}
        />
        <Route path="/alliances/:id" element={<AllianceDetailPage />} />
        <Route path="/alliances/:id/edit" element={<AllianceEditPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Action buttons are disabled while a previous action is still reloading. */
async function clickWhenEnabled(scope: HTMLElement, name: string) {
  const button = await waitFor(() => {
    const found = within(scope).getByRole('button', {
      name,
    }) as HTMLButtonElement;
    expect(found.disabled).toBe(false);
    return found;
  });
  fireEvent.click(button);
}

function routeGet(routes: Record<string, unknown>) {
  apiMocks.get.mockImplementation((url: string) => {
    if (url in routes) {
      const value = routes[url];
      return value instanceof Error
        ? Promise.reject(value)
        : Promise.resolve(value);
    }
    return Promise.reject(new Error(`Unexpected URL ${url}`));
  });
}

beforeEach(() => {
  for (const mock of Object.values(apiMocks)) mock.mockReset();
  apiMocks.post.mockResolvedValue({});
  apiMocks.patch.mockResolvedValue({});
  apiMocks.put.mockResolvedValue({});
  apiMocks.delete.mockResolvedValue({});
});

describe('AllianceListPage', () => {
  it('lists alliances of both factions with members and application status', async () => {
    routeGet({
      '/alliances': [
        summary(),
        summary({
          id: 2,
          name: 'Black Squadron',
          color: null,
          faction: Faction.GALACTIC_EMPIRE,
          factionName: 'Galaktisches Imperium',
          memberCount: 5,
          acceptsApplications: false,
        }),
      ],
      '/alliances/mine': { alliance: null },
    });

    renderAt('/alliances');

    const rogue = (
      await screen.findByRole('link', { name: 'Rogue Squadron' })
    ).closest('tr')!;
    expect(rogue.getAttribute('data-alliance-color')).toBe('#ff0000');
    expect(within(rogue).getByText('Rebellenallianz')).toBeTruthy();
    expect(within(rogue).getByText('2')).toBeTruthy();
    expect(within(rogue).getByText('offen')).toBeTruthy();
    const black = screen
      .getByRole('link', { name: 'Black Squadron' })
      .closest('tr')!;
    expect(within(black).getByText('Galaktisches Imperium')).toBeTruthy();
    expect(within(black).getByText('geschlossen')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Rogue Squadron' }).getAttribute('href'),
    ).toBe('/alliances/1');
  });

  it('offers founding only to alliance-less players', async () => {
    routeGet({ '/alliances': [], '/alliances/mine': { alliance: null } });
    renderAt('/alliances');
    expect(
      (
        await screen.findByRole('link', { name: 'Allianz gründen' })
      ).getAttribute('href'),
    ).toBe('/alliances/new');
  });

  it('links to the own alliance instead of founding', async () => {
    routeGet({
      '/alliances': [summary()],
      '/alliances/mine': {
        alliance: { id: 1, name: 'Rogue Squadron', color: null },
      },
    });
    renderAt('/alliances');
    expect(
      (await screen.findByRole('link', { name: 'Meine Allianz' })).getAttribute(
        'href',
      ),
    ).toBe('/alliances/1');
    expect(screen.queryByRole('link', { name: 'Allianz gründen' })).toBeNull();
  });
});

describe('AllianceFoundPage', () => {
  it('founds an alliance and opens its page', async () => {
    routeGet({ '/alliances/1': detail() });
    apiMocks.post.mockResolvedValue({ id: 1 });

    renderAt('/alliances/new');
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Rogue Squadron' },
    });
    fireEvent.change(screen.getByLabelText('Beschreibung'), {
      target: { value: 'Wir fliegen' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gründen' }));

    expect(
      await screen.findByRole('heading', { name: 'Rogue Squadron' }),
    ).toBeTruthy();
    expect(apiMocks.post).toHaveBeenCalledWith('/alliances', {
      name: 'Rogue Squadron',
      description: 'Wir fliegen',
    });
  });

  it('shows the server’s error message', async () => {
    apiMocks.post.mockRejectedValue(
      new ApiError(400, 'Dieser Allianzname ist bereits vergeben'),
    );

    renderAt('/alliances/new');
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Rogue Squadron' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gründen' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Dieser Allianzname ist bereits vergeben',
    );
  });
});

describe('AllianceDiplomacyPage', () => {
  it('renders active state separately from pending changes and uses server-authoritative proposal actions', async () => {
    routeGet({ '/alliances/1/diplomacy': diplomacyManagement() });

    renderAt('/alliances/1/diplomacy');

    expect(await screen.findByText('Aktive Beziehungen')).toBeTruthy();
    expect(screen.getByText('Aktiv')).toBeTruthy();
    expect(screen.getByText('Ausstehende Änderung (empfangen)')).toBeTruthy();
    expect(screen.getByText('Änderung')).toBeTruthy();
    expect(screen.getByText('Gesendet')).toBeTruthy();
    expect(screen.getByText('Empfangen')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Annehmen' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Ablehnen' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Zurückziehen' })).toBeTruthy();
    expect(screen.getByText(/haben noch keine Spielwirkung/i)).toBeTruthy();
  });

  it('does not render creation controls when the server denies create capability', async () => {
    const management = diplomacyManagement();
    management.capabilities.create = false;
    routeGet({ '/alliances/1/diplomacy': management });

    renderAt('/alliances/1/diplomacy');

    await screen.findByText('Diplomatieverwaltung');
    expect(
      screen.queryByRole('button', { name: 'Vorschlag senden' }),
    ).toBeNull();
  });

  it('identifies an inactive rollout and does not offer proposal creation', async () => {
    const management = diplomacyManagement();
    management.enabled = false;
    management.capabilities.create = false;
    routeGet({ '/alliances/1/diplomacy': management });

    renderAt('/alliances/1/diplomacy');

    expect(
      await screen.findByText('Der Diplomatie-Kern ist noch nicht aktiviert.'),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Vorschlag senden' })).toBeNull();
  });

  it('submits a relationship change draft only when the server grants change capability', async () => {
    const management = diplomacyManagement();
    management.relationships[0].change = null;
    routeGet({ '/alliances/1/diplomacy': management });
    renderAt('/alliances/1/diplomacy');

    const changeButton = await screen.findByRole('button', {
      name: 'Änderung vorschlagen',
    });
    fireEvent.submit(changeButton.closest('form')!);

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/alliances/relationships/10/changes',
        {
          contract: '[b]Aktiv[/b]',
          permissions: { treatAsFriend: true, shareLivePositions: false },
        },
      ),
    );
  });

  it('offers only permissions allowed for the selected relationship type', async () => {
    routeGet({ '/alliances/1/diplomacy': diplomacyManagement() });
    renderAt('/alliances/1/diplomacy');

    await screen.findByText('Diplomatieverwaltung');
    fireEvent.change(screen.getByLabelText('Beziehungstyp'), {
      target: { value: AllianceRelationshipType.WAR },
    });
    expect(screen.queryByText('Als Freund behandeln')).toBeNull();
    expect(screen.queryByText('Live-Positionen teilen')).toBeNull();

    fireEvent.change(screen.getByLabelText('Beziehungstyp'), {
      target: { value: AllianceRelationshipType.ALLIANCE },
    });

    expect(screen.getByText('Als Freund behandeln')).toBeTruthy();
    expect(screen.getByText('Live-Positionen teilen')).toBeTruthy();
  });

  it('disables affected actions during mutation, reloads authoritative state, and recovers after an error', async () => {
    let loads = 0;
    apiMocks.get.mockImplementation((url: string) => {
      if (url !== '/alliances/1/diplomacy')
        return Promise.reject(new Error(`Unexpected URL ${url}`));
      loads += 1;
      return Promise.resolve(diplomacyManagement());
    });
    let rejectAction: (error: Error) => void = () => undefined;
    apiMocks.post.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectAction = reject;
        }),
    );

    renderAt('/alliances/1/diplomacy');
    const accept = await screen.findAllByRole('button', { name: 'Annehmen' });
    fireEvent.click(accept[0]);
    expect((accept[0] as HTMLButtonElement).disabled).toBe(true);
    rejectAction(new Error('Server verweigert die Aktion'));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Server verweigert die Aktion',
    );
    expect(
      (
        screen.getAllByRole('button', {
          name: 'Annehmen',
        })[0] as HTMLButtonElement
      ).disabled,
    ).toBe(false);

    apiMocks.post.mockResolvedValueOnce({});
    fireEvent.click(screen.getAllByRole('button', { name: 'Annehmen' })[0]);
    await waitFor(() => expect(loads).toBeGreaterThan(1));
  });
});

describe('AllianceDetailPage', () => {
  it('shows server-provided war targets only and reloads after a declaration', async () => {
    routeGet({
      '/alliances/1': withViewer(detail(), AllianceRole.DIPLOMAT, {
        declareWar: true,
        warTargets: [{ id: 2, name: 'Red Squadron', color: null }],
      }),
    });

    renderAt('/alliances/1');

    fireEvent.change(await screen.findByLabelText('Zielallianz'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Krieg erklären' }));

    await waitFor(() => {
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/alliances/1/relationships/2/war',
        {},
      );
    });
    expect(apiMocks.get).toHaveBeenCalledTimes(4);
  });

  it('hides war declaration without the server capability', async () => {
    routeGet({ '/alliances/1': detail() });

    renderAt('/alliances/1');

    await screen.findByRole('heading', { name: 'Rogue Squadron' });
    expect(screen.queryByRole('button', { name: 'Krieg erklären' })).toBeNull();
  });

  it('shows active public relationships and loads their contract on demand', async () => {
    routeGet({
      '/alliances/1': detail({
        relationships: [
          {
            id: 9,
            counterparty: { id: 2, name: 'Red Squadron', color: '#00ff00' },
            type: AllianceRelationshipType.VASSALAGE,
            startedAt: '2026-10-03T12:00:00.000Z',
            permissions: { treatAsFriend: true, shareLivePositions: false },
            vassalage: { lordAllianceId: 1, vassalAllianceId: 2 },
            hasContract: true,
          },
        ],
      }),
      '/alliances/1/relationships/9/contract': {
        relationshipId: 9,
        contract: '[b]Schutzpakt[/b]',
      },
    });

    renderAt('/alliances/1');

    const counterparty = await screen.findByRole('link', {
      name: 'Red Squadron',
    });
    expect(counterparty.getAttribute('href')).toBe('/alliances/2');
    expect(screen.getByText('Vasallenschaft')).toBeTruthy();
    expect(screen.getByText('Lehnsherr von Red Squadron')).toBeTruthy();
    expect(screen.getByText('Als Freund behandeln')).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: 'Vertragswerk anzeigen' }),
    );
    expect(await screen.findByText('Schutzpakt')).toBeTruthy();
    expect(apiMocks.get).toHaveBeenCalledWith(
      '/alliances/1/relationships/9/contract',
    );
  });

  it('shows details, BBCode description and members with their titles', async () => {
    routeGet({ '/alliances/1': detail() });

    const { container } = renderAt('/alliances/1');

    expect(
      await screen.findByRole('heading', { name: 'Rogue Squadron' }),
    ).toBeTruthy();
    expect(screen.getByText('Rebellenallianz')).toBeTruthy();
    expect(screen.getByText('01.10.2026')).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'https://rogue.example' })
        .getAttribute('href'),
    ).toBe('https://rogue.example');
    expect(container.querySelector('strong')?.textContent).toBe('Wir');
    expect(container.textContent).not.toContain('[b]');
    const leia = screen.getByRole('link', { name: 'Leia' }).closest('li')!;
    expect(within(leia).getByText('Großadmiral')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Leia' }).getAttribute('href'),
    ).toBe('/players/1');
    expect(
      screen
        .getByRole('heading', { name: 'Rogue Squadron' })
        .getAttribute('style'),
    ).toContain('color: rgb(255, 0, 0)');
  });

  it('shows the public diplomacy chronicle without confidential proposal data', async () => {
    routeGet({
      '/alliances/1': detail(),
      '/alliances/1/diplomacy/chronicle': {
        entries: [
          {
            id: 7,
            type: 'WAR_DECLARED',
            actor: { userId: 1, name: 'Leia' },
            firstAlliance: { id: 1, name: 'Rogue Squadron' },
            secondAlliance: { id: 2, name: 'Red Squadron' },
            relationship: { type: AllianceRelationshipType.WAR, vassalage: null },
            occurredAt: '2026-10-03T12:00:00.000Z',
          },
          {
            id: 6,
            type: 'RELATIONSHIP_STARTED',
            actor: { userId: 2, name: 'Wedge' },
            firstAlliance: { id: 1, name: 'Rogue Squadron' },
            secondAlliance: { id: 2, name: 'Red Squadron' },
            relationship: {
              type: AllianceRelationshipType.FRIENDSHIP,
              vassalage: null,
            },
            occurredAt: '2026-10-02T12:00:00.000Z',
          },
        ],
        nextCursor: null,
      },
    });

    renderAt('/alliances/1');

    expect(
      await screen.findByText(/Krieg erklärt: Rogue Squadron – Red Squadron/),
    ).toBeTruthy();
    expect(
      screen.getByText(/Freundschaft begonnen: Rogue Squadron – Red Squadron/),
    ).toBeTruthy();
    expect(screen.getByText(/Leia · 03\.10\.2026/)).toBeTruthy();
    expect(apiMocks.get).toHaveBeenCalledWith('/alliances/1/diplomacy/chronicle');
    expect(screen.queryByText('Vertraulicher Vertragsentwurf')).toBeNull();
  });

  it('loads older diplomacy chronicle entries with the returned cursor', async () => {
    routeGet({
      '/alliances/1': detail(),
      '/alliances/1/diplomacy/chronicle': {
        entries: [
          {
            id: 7,
            type: 'WAR_DECLARED',
            actor: { userId: 1, name: 'Leia' },
            firstAlliance: { id: 1, name: 'Rogue Squadron' },
            secondAlliance: { id: 2, name: 'Red Squadron' },
            relationship: { type: AllianceRelationshipType.WAR, vassalage: null },
            occurredAt: '2026-10-03T12:00:00.000Z',
          },
        ],
        nextCursor: 'older page',
      },
      '/alliances/1/diplomacy/chronicle?cursor=older%20page': {
        entries: [
          {
            id: 6,
            type: 'RELATIONSHIP_STARTED',
            actor: { userId: 2, name: 'Wedge' },
            firstAlliance: { id: 1, name: 'Rogue Squadron' },
            secondAlliance: { id: 2, name: 'Red Squadron' },
            relationship: {
              type: AllianceRelationshipType.FRIENDSHIP,
              vassalage: null,
            },
            occurredAt: '2026-10-02T12:00:00.000Z',
          },
        ],
        nextCursor: null,
      },
    });

    renderAt('/alliances/1');

    await screen.findByText(/Krieg erklärt: Rogue Squadron – Red Squadron/);
    fireEvent.click(
      screen.getByRole('button', { name: 'Ältere Ereignisse laden' }),
    );

    expect(
      await screen.findByText(/Freundschaft begonnen: Rogue Squadron – Red Squadron/),
    ).toBeTruthy();
    expect(apiMocks.get).toHaveBeenCalledWith(
      '/alliances/1/diplomacy/chronicle?cursor=older%20page',
    );
    expect(
      screen.queryByRole('button', { name: 'Ältere Ereignisse laden' }),
    ).toBeNull();
  });

  it('does not execute HTML in the description', async () => {
    routeGet({
      '/alliances/1': detail({
        renderedDescription: '<img src=x onerror=alert(1)>',
      }),
    });

    const { container } = renderAt('/alliances/1');

    await screen.findByRole('heading', { name: 'Rogue Squadron' });
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('shows no action buttons when the server allows none', async () => {
    routeGet({ '/alliances/1': detail() });

    renderAt('/alliances/1');
    await screen.findByRole('heading', { name: 'Rogue Squadron' });

    for (const name of [
      'Bewerben',
      'Bewerbung zurückziehen',
      'Allianz verlassen',
      'Bearbeiten',
      'Allianz auflösen',
      'Rauswerfen',
    ]) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
    expect(screen.queryByRole('link', { name: 'Bearbeiten' })).toBeNull();
    expect(screen.queryByText('Bewerbungen')).toBeNull();
  });

  it('applies and withdraws an application', async () => {
    let current = withViewer(detail(), null, { apply: true });
    apiMocks.get.mockImplementation(() => Promise.resolve(current));
    apiMocks.post.mockImplementation(async () => {
      current = withViewer(detail(), null, { withdrawApplication: true });
      return {};
    });
    apiMocks.delete.mockImplementation(async () => {
      current = withViewer(detail(), null, { apply: true });
      return {};
    });

    renderAt('/alliances/1');
    fireEvent.click(await screen.findByRole('button', { name: 'Bewerben' }));

    fireEvent.click(
      await screen.findByRole('button', { name: 'Bewerbung zurückziehen' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Bewerben' }),
    ).toBeTruthy();
    expect(apiMocks.post).toHaveBeenCalledWith('/alliances/1/applications', {});
    expect(apiMocks.delete).toHaveBeenCalledWith(
      '/alliances/1/applications/mine',
    );
  });

  it('shows the error when applying fails', async () => {
    routeGet({ '/alliances/1': withViewer(detail(), null, { apply: true }) });
    apiMocks.post.mockRejectedValue(
      new ApiError(400, 'Diese Allianz nimmt derzeit keine Bewerbungen an'),
    );

    renderAt('/alliances/1');
    fireEvent.click(await screen.findByRole('button', { name: 'Bewerben' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Diese Allianz nimmt derzeit keine Bewerbungen an',
    );
  });

  it('lets diplomatic officers end an active non-war relationship', async () => {
    const managed = withViewer(
      detail({
        relationships: [
          {
            id: 8,
            counterparty: { id: 2, name: 'Red Squadron', color: null },
            type: AllianceRelationshipType.PEACE,
            startedAt: '2026-10-01T12:00:00.000Z',
            permissions: { treatAsFriend: false, shareLivePositions: false },
            vassalage: null,
            hasContract: false,
          },
        ],
      }),
      AllianceRole.DIPLOMAT,
      { manageDiplomacy: true },
    );
    routeGet({
      '/alliances/1': managed,
      '/alliances/1/diplomacy/proposals': [],
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderAt('/alliances/1');

    fireEvent.click(
      await screen.findByRole('button', { name: 'Beziehung beenden' }),
    );
    await waitFor(() =>
      expect(apiMocks.delete).toHaveBeenCalledWith(
        '/alliances/relationships/8',
      ),
    );
  });

  describe('diplomacy proposals', () => {
    it('shows confidential received proposals and server-authorized response controls', async () => {
      const managed = withViewer(detail(), AllianceRole.DIPLOMAT, {
        manageDiplomacy: true,
      });
      routeGet({
        '/alliances/1': managed,
        '/alliances/1/diplomacy/chronicle': { entries: [], nextCursor: null },
        '/alliances/1/diplomacy/proposals': [
          {
            id: 9,
            senderAllianceId: 2,
            recipientAllianceId: 1,
            type: 'FRIENDSHIP',
            contract: '[b]Vertraulich[/b]',
            permissions: { treatAsFriend: true, shareLivePositions: false },
            createdAt: '2026-10-01T12:00:00.000Z',
          },
        ],
      });
      apiMocks.post.mockResolvedValue(undefined);

      renderAt('/alliances/1');

      expect(
        await screen.findByText('Vertrauliche Beziehungsvorschläge'),
      ).toBeTruthy();
      expect(await screen.findByText('Vertraulich')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Annehmen' }));
      await waitFor(() =>
        expect(apiMocks.post).toHaveBeenCalledWith(
          '/alliances/diplomacy/proposals/9/accept',
          {},
        ),
      );
    });

    it('creates a proposal using only server-authorized diplomacy targets', async () => {
      const managed = withViewer(detail(), AllianceRole.DIPLOMAT, {
        manageDiplomacy: true,
        warTargets: [{ id: 2, name: 'Red Squadron', color: null }],
      });
      routeGet({
        '/alliances/1': managed,
        '/alliances/1/diplomacy/chronicle': { entries: [], nextCursor: null },
        '/alliances/1/diplomacy/proposals': [],
      });

      renderAt('/alliances/1');

      fireEvent.change(await screen.findByLabelText('Empfängerallianz'), {
        target: { value: '2' },
      });
      fireEvent.change(screen.getByLabelText('Beziehungsart'), {
        target: { value: 'ALLIANCE' },
      });
      fireEvent.change(screen.getByLabelText('Vertragstext'), {
        target: { value: '[b]Gemeinsam[/b]' },
      });
      fireEvent.click(screen.getByLabelText('Als Freund behandeln'));
      fireEvent.click(
        screen.getByLabelText('Live-Kartenpositionen teilen (nur Bündnis)'),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Vorschlag senden' }));

      await waitFor(() =>
        expect(apiMocks.post).toHaveBeenCalledWith(
          '/alliances/1/diplomacy/proposals',
          {
            recipientAllianceId: 2,
            type: 'ALLIANCE',
            contract: '[b]Gemeinsam[/b]',
            permissions: {
              treatAsFriend: true,
              shareLivePositions: true,
            },
          },
        ),
      );
    });

    it('offers peace only for an active war and submits it without relationship permissions', async () => {
      const managed = withViewer(
        detail({
          relationships: [
            {
              id: 8,
              counterparty: { id: 2, name: 'Red Squadron', color: null },
              type: AllianceRelationshipType.WAR,
              startedAt: '2026-10-01T12:00:00.000Z',
              permissions: { treatAsFriend: false, shareLivePositions: false },
              vassalage: null,
              hasContract: false,
            },
          ],
        }),
        AllianceRole.DIPLOMAT,
        { manageDiplomacy: true },
      );
      routeGet({
        '/alliances/1': managed,
        '/alliances/1/diplomacy/chronicle': { entries: [], nextCursor: null },
        '/alliances/1/diplomacy/proposals': [],
      });

      renderAt('/alliances/1');

      fireEvent.change(await screen.findByLabelText('Empfängerallianz'), {
        target: { value: '2' },
      });
      expect(
        (screen.getByLabelText('Beziehungsart') as HTMLSelectElement).value,
      ).toBe(AllianceRelationshipType.PEACE);
      expect(screen.queryByLabelText('Als Freund behandeln')).toBeNull();
      fireEvent.change(screen.getByLabelText('Vertragstext'), {
        target: { value: 'Waffenruhe' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Vorschlag senden' }));

      await waitFor(() =>
        expect(apiMocks.post).toHaveBeenCalledWith(
          '/alliances/1/diplomacy/proposals',
          {
            recipientAllianceId: 2,
            type: AllianceRelationshipType.PEACE,
            contract: 'Waffenruhe',
            permissions: { treatAsFriend: false, shareLivePositions: false },
          },
        ),
      );
    });

    it('proposes a complete replacement state for an active relationship and shows pending drafts only to officers', async () => {
      const managed = withViewer(
        detail({
          relationships: [
            {
              id: 8,
              counterparty: { id: 2, name: 'Red Squadron', color: null },
              type: AllianceRelationshipType.ALLIANCE,
              startedAt: '2026-10-01T12:00:00.000Z',
              permissions: { treatAsFriend: true, shareLivePositions: true },
              vassalage: null,
              hasContract: false,
            },
          ],
        }),
        AllianceRole.DIPLOMAT,
        { manageDiplomacy: true },
      );
      routeGet({
        '/alliances/1': managed,
        '/alliances/1/diplomacy/chronicle': { entries: [], nextCursor: null },
        '/alliances/1/diplomacy/proposals': [],
        '/alliances/1/diplomacy/changes': [],
      });

      renderAt('/alliances/1');

      const relationship = (
        await screen.findByRole('link', { name: 'Red Squadron' })
      ).closest('li')!;
      fireEvent.change(
        within(relationship).getByLabelText(
          'Neues Vertragswerk mit Red Squadron',
        ),
        { target: { value: 'Neues Vertragswerk' } },
      );
      fireEvent.click(
        within(relationship).getByLabelText('Als Freund behandeln'),
      );
      fireEvent.click(
        within(relationship).getByLabelText('Live-Kartenpositionen teilen'),
      );
      fireEvent.click(
        within(relationship).getByRole('button', {
          name: 'Änderung vorschlagen',
        }),
      );

      await waitFor(() =>
        expect(apiMocks.post).toHaveBeenCalledWith(
          '/alliances/relationships/8/changes',
          {
            contract: 'Neues Vertragswerk',
            permissions: {
              treatAsFriend: false,
              shareLivePositions: false,
            },
          },
        ),
      );
    });

    it('loads an existing contract before proposing a relationship change', async () => {
      const managed = withViewer(
        detail({
          relationships: [
            {
              id: 8,
              counterparty: { id: 2, name: 'Red Squadron', color: null },
              type: AllianceRelationshipType.ALLIANCE,
              startedAt: '2026-10-01T12:00:00.000Z',
              permissions: { treatAsFriend: true, shareLivePositions: true },
              vassalage: null,
              hasContract: true,
            },
          ],
        }),
        AllianceRole.DIPLOMAT,
        { manageDiplomacy: true },
      );
      routeGet({
        '/alliances/1': managed,
        '/alliances/1/diplomacy/chronicle': { entries: [], nextCursor: null },
        '/alliances/1/diplomacy/proposals': [],
        '/alliances/1/diplomacy/changes': [],
        '/alliances/1/relationships/8/contract': {
          relationshipId: 8,
          contract: 'Bestehendes Vertragswerk',
        },
      });
      apiMocks.post.mockResolvedValue(undefined);

      renderAt('/alliances/1');

      const contract = await screen.findByLabelText(
        'Neues Vertragswerk mit Red Squadron',
      );
      expect((contract as HTMLTextAreaElement).value).toBe(
        'Bestehendes Vertragswerk',
      );
      fireEvent.click(
        screen.getByRole('button', { name: 'Änderung vorschlagen' }),
      );

      await waitFor(() =>
        expect(apiMocks.post).toHaveBeenCalledWith(
          '/alliances/relationships/8/changes',
          {
            contract: 'Bestehendes Vertragswerk',
            permissions: { treatAsFriend: true, shareLivePositions: true },
          },
        ),
      );
    });

    it('does not fetch or render confidential proposals without server capability', async () => {
      routeGet({ '/alliances/1': detail() });
      renderAt('/alliances/1');

      await screen.findByText('Rogue Squadron');
      expect(apiMocks.get).not.toHaveBeenCalledWith(
        '/alliances/1/diplomacy/proposals',
      );
      expect(apiMocks.get).not.toHaveBeenCalledWith(
        '/alliances/1/diplomacy/changes',
      );
      expect(
        screen.queryByText('Vertrauliche Beziehungsvorschläge'),
      ).toBeNull();
    });
  });

  describe('management', () => {
    const managed = () =>
      withViewer(
        detail({
          members: [
            {
              userId: 1,
              name: 'Leia',
              role: AllianceRole.PRESIDENT,
              roleTitle: 'Großadmiral',
              joinedAt: '2026-10-01T12:00:00.000Z',
              actions: NO_MEMBER_ACTIONS,
            },
            {
              userId: 2,
              name: 'Wedge',
              role: AllianceRole.VICE,
              roleTitle: 'Vize-Präsident',
              joinedAt: '2026-10-02T12:00:00.000Z',
              actions: {
                kick: true,
                appointVice: false,
                appointDiplomat: true,
                dismiss: true,
                transferPresidency: true,
              },
            },
            {
              userId: 3,
              name: 'Biggs',
              role: AllianceRole.NONE,
              roleTitle: null,
              joinedAt: '2026-10-03T12:00:00.000Z',
              actions: { ...NO_MEMBER_ACTIONS, kick: true },
            },
          ],
        }),
        AllianceRole.PRESIDENT,
        { editDetails: true, manageApplications: true, dissolve: true },
      );

    it('shows member buttons exactly as allowed by the server', async () => {
      routeGet({ '/alliances/1': managed(), '/alliances/1/applications': [] });

      renderAt('/alliances/1');

      const wedge = (
        await screen.findByRole('link', { name: 'Wedge' })
      ).closest('li')!;
      expect(
        within(wedge).getByRole('button', { name: 'Rauswerfen' }),
      ).toBeTruthy();
      expect(
        within(wedge).getByRole('button', { name: 'Zum Diplomat ernennen' }),
      ).toBeTruthy();
      expect(
        within(wedge).getByRole('button', { name: 'Amt entziehen' }),
      ).toBeTruthy();
      expect(
        within(wedge).getByRole('button', { name: 'Präsidentenamt übergeben' }),
      ).toBeTruthy();
      expect(
        within(wedge).queryByRole('button', {
          name: 'Zum Vize-Präsident ernennen',
        }),
      ).toBeNull();

      const biggs = screen.getByRole('link', { name: 'Biggs' }).closest('li')!;
      expect(
        within(biggs)
          .getAllByRole('button')
          .map((b) => b.textContent),
      ).toEqual(['Rauswerfen']);
      const leia = screen.getByRole('link', { name: 'Leia' }).closest('li')!;
      expect(within(leia).queryAllByRole('button')).toHaveLength(0);
      expect(
        screen.getByRole('link', { name: 'Bearbeiten' }).getAttribute('href'),
      ).toBe('/alliances/1/edit');
    });

    it('appoints, dismisses and transfers via the role endpoints', async () => {
      routeGet({ '/alliances/1': managed(), '/alliances/1/applications': [] });
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderAt('/alliances/1');
      const wedge = (
        await screen.findByRole('link', { name: 'Wedge' })
      ).closest('li')!;

      await clickWhenEnabled(wedge, 'Zum Diplomat ernennen');
      await waitFor(() =>
        expect(apiMocks.put).toHaveBeenCalledWith(
          '/alliances/1/members/2/role',
          {
            role: AllianceRole.DIPLOMAT,
          },
        ),
      );
      await clickWhenEnabled(wedge, 'Amt entziehen');
      await waitFor(() =>
        expect(apiMocks.put).toHaveBeenCalledWith(
          '/alliances/1/members/2/role',
          {
            role: AllianceRole.NONE,
          },
        ),
      );
      await clickWhenEnabled(wedge, 'Präsidentenamt übergeben');
      await waitFor(() =>
        expect(apiMocks.post).toHaveBeenCalledWith(
          '/alliances/1/members/2/transfer-presidency',
          {},
        ),
      );
    });

    it('kicks a member after confirmation', async () => {
      routeGet({ '/alliances/1': managed(), '/alliances/1/applications': [] });
      const confirm = vi
        .spyOn(window, 'confirm')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      renderAt('/alliances/1');
      const biggs = (
        await screen.findByRole('link', { name: 'Biggs' })
      ).closest('li')!;
      await clickWhenEnabled(biggs, 'Rauswerfen');
      expect(apiMocks.delete).not.toHaveBeenCalled();

      await clickWhenEnabled(biggs, 'Rauswerfen');
      await waitFor(() =>
        expect(apiMocks.delete).toHaveBeenCalledWith('/alliances/1/members/3'),
      );
      expect(confirm).toHaveBeenCalledWith(
        'Biggs wirklich aus der Allianz werfen?',
      );
    });

    it('dissolves the alliance only after confirmation', async () => {
      routeGet({
        '/alliances/1': managed(),
        '/alliances/1/applications': [],
        '/alliances': [],
        '/alliances/mine': { alliance: null },
      });
      const confirm = vi
        .spyOn(window, 'confirm')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      renderAt('/alliances/1');
      fireEvent.click(
        await screen.findByRole('button', { name: 'Allianz auflösen' }),
      );
      expect(apiMocks.delete).not.toHaveBeenCalled();
      expect(confirm).toHaveBeenCalledWith(
        'Die Allianz Rogue Squadron endgültig auflösen? Alle Mitglieder verlieren ihre Mitgliedschaft.',
      );

      fireEvent.click(screen.getByRole('button', { name: 'Allianz auflösen' }));
      await waitFor(() =>
        expect(apiMocks.delete).toHaveBeenCalledWith('/alliances/1'),
      );
      expect(
        await screen.findByRole('link', { name: 'Allianz gründen' }),
      ).toBeTruthy();
    });

    it('hides dissolve from a vice who may edit', async () => {
      routeGet({
        '/alliances/1': withViewer(detail(), AllianceRole.VICE, {
          editDetails: true,
          manageApplications: true,
          leave: true,
        }),
        '/alliances/1/applications': [],
      });

      renderAt('/alliances/1');

      expect(
        await screen.findByRole('link', { name: 'Bearbeiten' }),
      ).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Bewerbungen' })).toBeTruthy();
      expect(
        screen.queryByRole('button', { name: 'Allianz auflösen' }),
      ).toBeNull();
    });

    it('lists applications oldest first and accepts or declines them', async () => {
      routeGet({
        '/alliances/1': managed(),
        '/alliances/1/applications': [
          {
            id: 11,
            userId: 8,
            name: 'Luke',
            createdAt: '2026-10-02T08:00:00.000Z',
          },
          {
            id: 12,
            userId: 9,
            name: 'Han',
            createdAt: '2026-10-03T08:00:00.000Z',
          },
        ],
      });

      renderAt('/alliances/1');
      const list = (await screen.findByRole('heading', { name: 'Bewerbungen' }))
        .parentElement!;
      const rows = await within(list).findAllByRole('listitem');
      expect(rows.map((r) => within(r).getByRole('link').textContent)).toEqual([
        'Luke',
        'Han',
      ]);

      fireEvent.click(
        within(rows[0]).getByRole('button', { name: 'Annehmen' }),
      );
      await waitFor(() =>
        expect(apiMocks.post).toHaveBeenCalledWith(
          '/alliances/applications/11/accept',
          {},
        ),
      );
      await clickWhenEnabled(
        within(list).getAllByRole('listitem')[1],
        'Ablehnen',
      );
      await waitFor(() =>
        expect(apiMocks.post).toHaveBeenCalledWith(
          '/alliances/applications/12/decline',
          {},
        ),
      );
    });

    it('shows the server error when an action fails', async () => {
      routeGet({ '/alliances/1': managed(), '/alliances/1/applications': [] });
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      apiMocks.delete.mockRejectedValue(
        new ApiError(403, 'Dazu fehlt Dir die Berechtigung'),
      );

      renderAt('/alliances/1');
      const biggs = (
        await screen.findByRole('link', { name: 'Biggs' })
      ).closest('li')!;
      fireEvent.click(
        within(biggs).getByRole('button', { name: 'Rauswerfen' }),
      );

      expect((await screen.findByRole('alert')).textContent).toBe(
        'Dazu fehlt Dir die Berechtigung',
      );
    });

    it('lets a member leave after confirmation', async () => {
      routeGet({
        '/alliances/1': withViewer(detail(), AllianceRole.NONE, {
          leave: true,
        }),
        '/alliances': [],
        '/alliances/mine': { alliance: null },
      });
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      apiMocks.post.mockResolvedValue({ dissolved: false });

      renderAt('/alliances/1');
      fireEvent.click(
        await screen.findByRole('button', { name: 'Allianz verlassen' }),
      );

      await waitFor(() =>
        expect(apiMocks.post).toHaveBeenCalledWith('/alliances/leave', {}),
      );
      expect(
        await screen.findByRole('link', { name: 'Allianz gründen' }),
      ).toBeTruthy();
    });
  });
});

describe('AllianceEditPage', () => {
  const editable = () =>
    withViewer(detail({ color: '#ff0000' }), AllianceRole.VICE, {
      editDetails: true,
      manageApplications: true,
    });

  it('saves details, application switch and office titles', async () => {
    routeGet({ '/alliances/1': editable() });

    renderAt('/alliances/1/edit');
    const name = await screen.findByLabelText('Name');
    expect((name as HTMLInputElement).value).toBe('Rogue Squadron');

    fireEvent.change(name, { target: { value: 'Renegade Flight' } });
    fireEvent.change(screen.getByLabelText('Homepage'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Farbe'), { target: { value: '' } });
    fireEvent.click(screen.getByLabelText('Bewerbungen annehmen'));
    fireEvent.change(screen.getByLabelText('Titel Präsident'), {
      target: { value: 'Kanzler' },
    });
    fireEvent.change(screen.getByLabelText('Titel Vize'), {
      target: { value: 'Admiral' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith('/alliances/1', {
        name: 'Renegade Flight',
        description: '[b]Wir[/b] fliegen',
        homepage: '',
        color: '',
        acceptsApplications: false,
        titles: { president: 'Kanzler', vice: 'Admiral', diplomat: 'Diplomat' },
      }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Rogue Squadron' }),
    ).toBeTruthy();
  });

  it('shows validation errors and stays on the form', async () => {
    routeGet({ '/alliances/1': editable() });
    apiMocks.patch.mockRejectedValue(
      new ApiError(
        400,
        'Der RGB-Code ist ungültig, erwartet wird z. B. #11ff67',
      ),
    );

    renderAt('/alliances/1/edit');
    fireEvent.change(await screen.findByLabelText('Farbe'), {
      target: { value: '#12' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    });

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Der RGB-Code ist ungültig, erwartet wird z. B. #11ff67',
    );
    expect(screen.getByLabelText('Farbe')).toBeTruthy();
  });

  it('refuses editing without the server’s permission', async () => {
    routeGet({ '/alliances/1': detail() });

    renderAt('/alliances/1/edit');

    expect(
      await screen.findByText('Du darfst diese Allianz nicht bearbeiten.'),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Speichern' })).toBeNull();
  });
});
