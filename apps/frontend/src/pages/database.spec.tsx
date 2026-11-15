import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { DatabasePage, DatabaseSystemDetailPage } from './database';
vi.mock('../components/database/DatabaseProgress', () => ({ DatabaseProgress: () => null }));

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../services/api', () => ({
  api: apiMocks,
}));

describe('DatabasePage', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/database/overview') {
        return Promise.resolve({
          settlers: 1,
          colonies: 0,
          ships: 0,
          totalTechs: 0,
          sections: [],
        });
      }
      if (url === '/database/settlers') {
        return Promise.resolve([
          {
            id: 1,
            username: 'vader',
            displayName: 'Vader',
            avatar: null,
            description: '[b]Böse[/b] [quote]Drohung[/quote]',
            factionName: 'Imperium',
            prestige: 10,
            colonies: 1,
            ships: 2,
            completedResearch: 3,
            onboardingCompleted: true,
            isAdmin: false,
            createdAt: '2026-08-04T00:00:00.000Z',
          },
        ]);
      }
      if (url === '/database/rankings') {
        return Promise.resolve({ research: [], prestige: [], colonies: [] });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
  });

  it.each(['system-types', 'planet-types'])('uses only backend layer choices and sends the selected filter: %s', async (view) => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === `/database/${view}` || url === `/database/${view}?layerId=8`) {
        return Promise.resolve({
          layers: [{ id: 7, name: 'Known core' }, { id: 8, name: 'Known rim' }],
          discovered: 0, total: 0, entries: [],
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    render(<MemoryRouter initialEntries={[`/database?view=${view}`]}><DatabasePage /></MemoryRouter>);
    const select = await screen.findByRole('combobox', { name: 'Kartenebene' });
    expect(select.closest('label')?.classList.contains('text-xs')).toBe(true);
    expect(Array.from(select.querySelectorAll('option')).map((option) => option.textContent)).toEqual(['Alle bekannten Ebenen', 'Known core', 'Known rim']);
    fireEvent.change(select, { target: { value: '8' } });
    await waitFor(() => expect(apiMocks.get).toHaveBeenCalledWith(`/database/${view}?layerId=8`));
  });

  it('groups all available highscores and opens the RPG and Aurodium rankings', async () => {
    render(
      <MemoryRouter>
        <DatabasePage />
      </MemoryRouter>,
    );

    for (const heading of ['Siedler', 'Schiffe (anonym)', 'Handel', 'Kolonien']) {
      expect(screen.getByRole('heading', { name: heading })).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'Die 10 bestbewerteten RPG-Schreiber' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Die 10 Günstlinge der Hutten' })).toBeTruthy();
  });

  it('renders separate NPC and administrator sections with profile and PM links', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/database/npcs') {
        return Promise.resolve({
          npcs: [
            {
              id: 9,
              username: 'Hutten-Kartell',
              displayName: 'Hutten-Kartell',
              avatar: null,
              faction: null,
              factionName: null,
            },
          ],
          administrators: [
            {
              id: 2,
              username: 'admin',
              displayName: 'Leitstelle',
              avatar: null,
              faction: 'EMPIRE',
              factionName: 'Galaktisches Imperium',
            },
          ],
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    render(
      <MemoryRouter>
        <DatabasePage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'NPCs & Administratoren' }));

    expect(await screen.findByRole('heading', { name: 'NPCs' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Administratoren' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Hutten-Kartell' }).getAttribute('href')).toBe(
      '/players/9',
    );
    expect(screen.getByRole('link', { name: 'Leitstelle' }).getAttribute('href')).toBe(
      '/players/2',
    );
    expect(screen.getByLabelText('Nachricht an Hutten-Kartell schreiben')).toBeTruthy();
    expect(screen.getByLabelText('Nachricht an Leitstelle schreiben')).toBeTruthy();
  });

  it('opens station hulls from the Ships & Stations group and masks discoveries', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/database/station-classes') {
        return Promise.resolve({
          discovered: 1,
          total: 2,
          entries: [
            {
              key: 'REBEL_SHIPYARD',
              discovered: true,
              name: 'Raumwerft',
              discoveredAt: '2026-10-28T12:00:00.000Z',
            },
            {
              key: 'EMPIRE_BASE',
              discovered: false,
              name: null,
              discoveredAt: null,
            },
          ],
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    render(
      <MemoryRouter>
        <DatabasePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Schiffe & Stationen' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Stationsrümpfe' }));

    expect(await screen.findByRole('heading', { name: 'Stationsrümpfe' })).toBeTruthy();
    expect(screen.getByText('Raumwerft')).toBeTruthy();
    expect(screen.getByText('???')).toBeTruthy();
    expect(apiMocks.get).toHaveBeenCalledWith('/database/station-classes');
  });

  it('links the trade-post hub entry and renders fog-safe locations', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/database/trade-posts') {
        return Promise.resolve([
          {
            id: 1,
            name: 'Hutten-Handelsposten',
            description: 'Geschäfte am Rand des Gesetzes.',
            networkId: 3,
            networkName: 'Hutten-Handelsnetz',
            ownerName: 'Hutten-Kartell',
            location: {
              layerId: 2,
              layerName: 'Äußerer Rand',
              x: 7,
              y: 8,
              systemName: 'Nal Hutta',
            },
          },
          {
            id: 2,
            name: 'Verborgener Posten',
            description: '',
            networkId: 3,
            networkName: 'Hutten-Handelsnetz',
            ownerName: 'Hutten-Kartell',
            location: null,
          },
        ]);
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    render(
      <MemoryRouter>
        <DatabasePage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Handelsstationen' }));

    expect(await screen.findByText('Geschäfte am Rand des Gesetzes.')).toBeTruthy();
    expect(screen.getAllByText('Hutten-Handelsnetz')).toHaveLength(2);
    expect(screen.getAllByText('Hutten-Kartell')).toHaveLength(2);
    expect(screen.getByText('Unbekannt')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Nal Hutta · Äußerer Rand 7:8' }).getAttribute('href'),
    ).toBe('/starmap?layer=2&x=7&y=8');
  });

  it('opens the commodity overview and shows linked storage locations', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/database/commodities/overview') {
        return Promise.resolve([
          { commodityId: 2, commodityName: 'Doonium', total: 1234 },
        ]);
      }
      if (url === '/database/commodities/2/locations') {
        return Promise.resolve({
          commodityId: 2,
          commodityName: 'Doonium',
          total: 1234,
          locations: [
            {
              type: 'COLONY',
              id: 7,
              name: 'Alderaan',
              location: 'Core',
              amount: 1200,
            },
            {
              type: 'SPACECRAFT',
              id: 9,
              name: 'Falcon',
              location: 'Core',
              amount: 34,
            },
          ],
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    render(
      <MemoryRouter>
        <DatabasePage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Warenübersicht' }));
    expect(await screen.findByText('1.234')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Doonium/ }));

    expect(
      (await screen.findByRole('link', { name: 'Alderaan' })).getAttribute('href'),
    ).toBe('/colonies?colony=7');
    expect(
      screen.getByRole('link', { name: 'Falcon' }).getAttribute('href'),
    ).toBe('/spacecraft/9');
  });

  it('opens the most active trade posts from the Handel group as a post table', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/database/rankings/trade-posts') {
        return Promise.resolve({
          title: 'Die 10 aktivsten Handelsposten',
          metricLabel: 'Transaktionen (7 Tage)',
          kind: 'trade-posts',
          entries: [
            { rank: 1, tradePostId: 4, postName: 'Mos Eisley', networkName: 'Hutten-Handelsnetz', score: 1234 },
          ],
          currentUser: null,
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    render(
      <MemoryRouter>
        <DatabasePage />
      </MemoryRouter>,
    );

    const handel = screen.getByRole('heading', { name: 'Handel' }).parentElement as HTMLElement;
    fireEvent.click(within(handel).getByRole('button', { name: 'Die 10 aktivsten Handelsposten' }));

    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      '#', 'Handelsposten', 'Handelsnetz', 'Transaktionen (7 Tage)',
    ]);
    expect(within(table).getByText('Mos Eisley')).toBeTruthy();
    expect(within(table).getByText('Hutten-Handelsnetz')).toBeTruthy();
    expect(within(table).getByText('1234')).toBeTruthy();
    expect(screen.queryByText(/Dein Punktestand/)).toBeNull();
  });

  it('renders the anonymous flight ranking without player names', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/database/rankings/flights') {
        return Promise.resolve({
          title: 'Die Top 10 der Vielflieger',
          metricLabel: 'Geflogene Felder',
          anonymous: true,
          entries: [
            { rank: 1, faction: 'REBELLION', score: 42, shipCount: 3 },
          ],
          currentUser: null,
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    render(
      <MemoryRouter>
        <DatabasePage />
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Die Top 10 der Vielflieger' }),
    );

    expect(await screen.findByText('REBELLION')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.queryByText('Commander')).toBeNull();
    expect(screen.queryByText('Leia')).toBeNull();
  });

  it('links settlers to their profile pages', async () => {
    render(
      <MemoryRouter>
        <DatabasePage />
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Siedlerliste' }),
    );

    const link = await screen.findByRole('link', { name: 'Vader' });
    expect(link.getAttribute('href')).toBe('/players/1');
    expect(screen.getByText('Vader')).toBeTruthy();
  });

  it('renders an unlocked system as a complete static coordinate raster', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/database/systems/20') {
        return Promise.resolve({
          availability: 'AVAILABLE',
          id: 20,
          name: 'Bespin',
          layerId: 7,
          cx: 1,
          cy: 3,
          systemTypeId: 1049,
          systemTypeName: 'Gelber Zwerg',
          maxX: 3,
          maxY: 2,
          fields: [
            {
              id: 101,
              sx: 1,
              sy: 2,
              fieldType: { id: 5, key: 'EMPTY_SPACE', name: 'Leerer Raum' },
              celestialObject: {
                id: 90,
                objectType: 1,
                name: 'Bespin II',
                description: 'Gasriese',
                posX: 1,
                posY: 2,
                classId: 42,
                isColonizable: true,
              },
            },
            {
              id: 102,
              sx: 3,
              sy: 1,
              fieldType: {
                id: 6,
                key: 'ASTEROID_CLUSTER',
                name: 'Asteroidenfeld',
              },
              celestialObject: {
                id: 91,
                objectType: 3,
                name: 'Asteroidengürtel',
                description: null,
                posX: 3,
                posY: 1,
                classId: 999,
                isColonizable: false,
              },
            },
          ],
          colonies: [
            {
              id: 12,
              name: 'Cloud City',
              owner: { id: 77, username: 'lando' },
              isOwn: false,
              isAbandoned: false,
              posX: 3,
              posY: 4,
              celestialObjectId: null,
              canMessageOwner: true,
            },
          ],
          scans: [
            {
              id: 501,
              colonyId: 12,
              scanner: { id: 42, username: 'han' },
              provenance: 'OWN',
              canDelete: true,
              systemId: 20,
              snapshot: {
                colonyName: 'Alte Wolkenstadt',
                owner: { id: 55, username: 'calrissian' },
                scannedAt: '2026-10-01T12:00:00.000Z',
                system: { id: 20, celestialObjectId: null },
                colonyClassId: 1,
                surface: {
                  width: 2,
                  height: 2,
                  deposits: [],
                  fields: [
                    {
                      fieldIndex: 0,
                      fieldType: 101,
                      terrainTileId: null,
                      buildingId: null,
                      buildingName: null,
                      hasBuilding: false,
                      isConstruction: false,
                      isActive: false,
                      integrityPercent: null,
                    },
                  ],
                },
              },
              current: {
                colony: {
                  id: 12,
                  name: 'Cloud City',
                  owner: { id: 77, username: 'lando' },
                  isAbandoned: false,
                  posX: 3,
                  posY: 4,
                  celestialObjectId: null,
                },
              },
            },
          ],
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    render(
      <MemoryRouter initialEntries={['/database/systems/20']}>
        <Routes>
          <Route
            path="/database/systems/:id"
            element={<DatabaseSystemDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      (await screen.findAllByRole('heading', { name: 'Bespin' })).length,
    ).toBeGreaterThan(0);
    const raster = screen.getByLabelText('Kartographische Systemkarte');
    expect(raster).toBeTruthy();
    expect(raster.className).toContain('overflow-auto');
    expect(screen.getByText('Rastergröße:')).toBeTruthy();
    expect(screen.getByText('3 × 2')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Feld \d:\d:/ })).toHaveLength(6);
    for (const coordinate of ['1', '2', '3']) {
      expect(screen.getAllByText(coordinate).length).toBeGreaterThan(0);
    }
    const emptyCell = screen.getByRole('button', {
      name: 'Feld 2:1: Unkartographiertes Rasterfeld',
    });
    expect(emptyCell.getAttribute('style')).toContain('width: 40px');
    expect(emptyCell.getAttribute('style')).toContain('height: 40px');
    expect(raster.firstElementChild?.getAttribute('style')).toContain(
      'grid-template-columns: 40px repeat(3, 40px)',
    );
    expect(
      screen.getByRole('button', { name: /Feld 1:2: Bespin II/ }),
    ).toBeTruthy();
    const asteroidField = screen.getByRole('button', {
      name: /Feld 3:1: Asteroidengürtel/,
    });
    expect(asteroidField.querySelector('img')?.getAttribute('src')).toBe(
      '/assets/planets/701s.png',
    );
    expect(asteroidField.textContent).toBe('');

    fireEvent.click(
      screen.getByRole('button', { name: /Feld 1:2: Bespin II/ }),
    );
    expect(screen.getByText('Gasriese')).toBeTruthy();
    expect(screen.getByText('Planet')).toBeTruthy();
    expect(screen.getByText('Feld 1:2')).toBeTruthy();
    expect(screen.getByText(/Gelber Zwerg · Koordinaten: 1:3/)).toBeTruthy();
    expect(document.querySelector('.lg\\:grid-cols-\\[minmax\\(0\\,1fr\\)_260px\\]')).toBeTruthy();

    expect(screen.getAllByText('Cloud City').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('link', { name: 'Sternenkarte öffnen' }).getAttribute('href'),
    ).toBe('/starmap?layer=7&x=1&y=3');
    expect(
      screen.getByRole('link', { name: 'Nachricht an lando' }).getAttribute('href'),
    ).toBe('/messages?tab=compose&to=77&name=lando');
    expect(screen.getByText('Besitzerwechsel seit dem Scan')).toBeTruthy();
    expect(screen.getByText(/eigener Scan/)).toBeTruthy();
    expect(screen.getByText(/Scanner: han/)).toBeTruthy();
    expect(screen.getByText(/damaliger Besitzer: calrissian/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Scan 501 löschen' })).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Gespeicherte Oberfläche von Alte Wolkenstadt öffnen',
      }),
    );
    expect(screen.getByRole('dialog', { name: 'Gespeicherte Oberfläche' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }));
    expect(
      screen.queryByRole('button', { name: /navigation|kampf|bewegung/i }),
    ).toBeNull();
  });

  it('reloads after deleting an own scan and exposes no delete action for alliance scans', async () => {
    const available = {
      availability: 'AVAILABLE',
      id: 20,
      name: 'Bespin',
      layerId: 7,
      cx: 1,
      cy: 3,
      systemTypeId: 1049,
      systemTypeName: 'Gelber Zwerg',
      maxX: 1,
      maxY: 1,
      fields: [],
      colonies: [],
      scans: [
        {
          id: 501,
          colonyId: 12,
          scanner: { id: 42, username: 'han' },
          provenance: 'OWN',
          canDelete: true,
          systemId: 20,
          snapshot: {
            colonyName: 'Cloud City',
            owner: { id: 55, username: 'lando' },
            scannedAt: '2026-10-01T12:00:00.000Z',
            system: { id: 20, celestialObjectId: null },
            colonyClassId: 1,
            surface: { width: 1, height: 1, deposits: [], fields: [] },
          },
          current: { colony: null },
        },
        {
          id: 502,
          colonyId: 13,
          scanner: { id: 77, username: 'leia' },
          provenance: 'ALLIANCE',
          canDelete: false,
          systemId: 20,
          snapshot: {
            colonyName: 'Alderaan',
            owner: { id: 77, username: 'leia' },
            scannedAt: '2026-10-02T12:00:00.000Z',
            system: { id: 20, celestialObjectId: null },
            colonyClassId: 1,
            surface: { width: 1, height: 1, deposits: [], fields: [] },
          },
          current: { colony: null },
        },
      ],
    };
    apiMocks.get
      .mockResolvedValueOnce(available)
      .mockResolvedValueOnce({ ...available, scans: [available.scans[1]] });
    apiMocks.delete.mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={['/database/systems/20']}>
        <Routes>
          <Route path="/database/systems/:id" element={<DatabaseSystemDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Scan 501 löschen' }));
    await waitFor(() => expect(apiMocks.delete).toHaveBeenCalledWith('/spacecraft/colony-scans/501'));
    expect(screen.queryByRole('button', { name: 'Scan 502 löschen' })).toBeNull();
    expect(await screen.findByText(/Allianz-Scan/)).toBeTruthy();
  });

  it('withholds the raster and all system details until Astrometrie succeeds', async () => {
    apiMocks.get.mockResolvedValue({ availability: 'ASTROMETRY_REQUIRED' });

    render(
      <MemoryRouter initialEntries={['/database/systems/20']}>
        <Routes>
          <Route
            path="/database/systems/:id"
            element={<DatabaseSystemDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(
        /noch nicht erfolgreich vollständig kartographiert/i,
      ),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Kartographische Systemkarte')).toBeNull();
    expect(screen.queryByText('Bespin')).toBeNull();
    expect(
      screen
        .getByRole('link', { name: '← Sternensysteme' })
        .getAttribute('href'),
    ).toBe('/database?view=systems');
  });

  it('shows the Sternensysteme catalog with non-openable masked entries', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/database/systems') {
        return Promise.resolve({
          layers: [
            {
              id: 7,
              name: 'Kern',
              entries: [
                {
                  discovered: true,
                  name: 'Bespin',
                  cx: 1,
                  cy: 3,
                  systemTypeName: 'Gelber Zwerg',
                  discoveredAt: '2026-10-01T12:00:00.000Z',
                  systemId: 20,
                },
                { discovered: false, name: '???' },
              ],
            },
          ],
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    render(
      <MemoryRouter>
        <DatabasePage />
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Sternensysteme' }),
    );

    expect(await screen.findByText('Kern')).toBeTruthy();
    const layers = screen.getByRole('combobox', { name: 'Kartenebene' });
    expect(Array.from(layers.querySelectorAll('option')).map((option) => option.textContent)).toEqual(['Kern']);
    expect(screen.getByText('Bespin')).toBeTruthy();
    expect(screen.getAllByText('???')).toHaveLength(3);
    expect(screen.queryByRole('link', { name: '???' })).toBeNull();
  });

  describe('Statistiken', () => {
    const statistics = (unit: string, points: number) => ({
      unit,
      metrics: [
        {
          key: 'players',
          title: 'Spieler',
          series: [
            { key: 'active', label: 'Aktiv (24 h)' },
            { key: 'inactive', label: 'Inaktiv' },
            { key: 'vacation', label: 'Urlaub' },
          ],
          points: Array.from({ length: points }, (_, i) => ({
            t: new Date(2026, 2, 2 + i, 8, 0).toISOString(),
            values: { active: 2 + i, inactive: 1, vacation: 0 },
          })),
        },
      ],
    });

    function openStatistics(points = 3) {
      apiMocks.get.mockImplementation((url: string) => {
        if (url.startsWith('/database/statistics?unit=')) {
          return Promise.resolve(statistics(url.split('=')[1], points));
        }
        throw new Error(`Unexpected URL ${url}`);
      });
      render(
        <MemoryRouter initialEntries={['/database?view=statistics']}>
          <DatabasePage />
        </MemoryRouter>,
      );
    }

    it('opens from the hub entry and reloads when the time unit changes', async () => {
      apiMocks.get.mockImplementation((url: string) => {
        if (url === '/database/overview') {
          return Promise.resolve({ sections: [] });
        }
        return Promise.resolve(statistics('tick', 3));
      });
      render(
        <MemoryRouter>
          <DatabasePage />
        </MemoryRouter>,
      );

      fireEvent.click(
        await screen.findByRole('button', { name: 'Statistiken' }),
      );
      expect(
        await screen.findByRole('heading', { name: 'Spieler' }),
      ).toBeTruthy();
      expect(apiMocks.get).toHaveBeenCalledWith(
        '/database/statistics?unit=tick',
      );

      fireEvent.click(screen.getByRole('button', { name: 'Täglich' }));
      await waitFor(() =>
        expect(apiMocks.get).toHaveBeenCalledWith(
          '/database/statistics?unit=daily',
        ),
      );
      expect(
        screen
          .getByRole('button', { name: 'Täglich' })
          .getAttribute('aria-pressed'),
      ).toBe('true');
    });

    it('renders a stacked area chart with a legend per series', async () => {
      openStatistics();

      expect(await screen.findByRole('img', { name: 'Spieler' })).toBeTruthy();
      expect(document.querySelectorAll('svg path[data-series]')).toHaveLength(
        3,
      );
      for (const label of ['Aktiv (24 h)', 'Inaktiv', 'Urlaub']) {
        expect(screen.getByText(label)).toBeTruthy();
      }
    });

    it('shows time and all series values in a tooltip on hover', async () => {
      openStatistics();
      await screen.findByRole('img', { name: 'Spieler' });

      fireEvent.mouseEnter(screen.getAllByTestId('chart-hover')[1]);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.textContent).toContain('03.03.');
      expect(tooltip.textContent).toContain('Aktiv (24 h)');
      expect(tooltip.textContent).toContain('3');
      expect(tooltip.textContent).toContain('Inaktiv');
    });

    it('thins the time axis out without rotating labels or letting them overlap', async () => {
      openStatistics(40);
      const chart = await screen.findByRole('img', { name: 'Spieler' });

      const labels = Array.from(chart.querySelectorAll('text[data-axis="x"]'));
      expect(labels.length).toBeGreaterThanOrEqual(2);
      expect(labels.length).toBeLessThan(8);
      expect(chart.querySelectorAll('text[transform]')).toHaveLength(0);
      const xs = labels.map((label) => Number(label.getAttribute('x')));
      const gaps = xs.slice(1).map((value, i) => value - xs[i]);
      // Ein Tick-Label ("03.03. 08:00") ist knapp 80 Einheiten breit.
      for (const gap of gaps) expect(gap).toBeGreaterThan(80);
    });

    describe('on a narrow viewport', () => {
      const originalObserver = globalThis.ResizeObserver;
      afterEach(() => {
        globalThis.ResizeObserver = originalObserver;
      });

      it('sizes the chart to the container and drops axis labels that no longer fit', async () => {
        globalThis.ResizeObserver = class {
          constructor(private callback: ResizeObserverCallback) {}
          observe(target: Element) {
            this.callback(
              [{ contentRect: { width: 300 } } as ResizeObserverEntry],
              this as unknown as ResizeObserver,
            );
            void target;
          }
          unobserve() {
            // nicht benötigt
          }
          disconnect() {
            // nicht benötigt
          }
        } as unknown as typeof ResizeObserver;

        openStatistics(40);
        const chart = await screen.findByRole('img', { name: 'Spieler' });

        await waitFor(() =>
          expect(chart.getAttribute('viewBox')).toBe('0 0 300 240'),
        );
        const labels = chart.querySelectorAll('text[data-axis="x"]');
        expect(labels.length).toBeGreaterThanOrEqual(2);
        expect(labels.length).toBeLessThanOrEqual(3);
      });
    });

    it('explains that data is still being collected when fewer than two snapshots exist', async () => {
      openStatistics(1);

      expect(
        await screen.findByText(/Noch nicht genug Messpunkte/),
      ).toBeTruthy();
      expect(screen.queryByRole('img', { name: 'Spieler' })).toBeNull();
    });
  });
});
