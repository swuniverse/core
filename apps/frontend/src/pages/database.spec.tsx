import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { DatabasePage, DatabaseSystemDetailPage } from './database';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
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
              fieldType: { id: 6, key: 'ASTEROID_CLUSTER', name: 'Asteroidenfeld' },
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
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    render(
      <MemoryRouter initialEntries={['/database/systems/20']}>
        <Routes>
          <Route path="/database/systems/:id" element={<DatabaseSystemDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect((await screen.findAllByRole('heading', { name: 'Bespin' })).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Kartographische Systemkarte')).toBeTruthy();
    expect(screen.getByText('Rastergröße')).toBeTruthy();
    expect(screen.getByText('3 × 2')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Feld 1:2: Bespin II/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Feld 3:1: Asteroidengürtel/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Feld 1:2: Bespin II/ }));
    expect(screen.getByText('Gasriese')).toBeTruthy();
    expect(screen.getByText('Planet')).toBeTruthy();

    expect(screen.queryByText('Cloud City')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Sternenkarte öffnen' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Nachricht an/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /scan|navigation|kampf|bewegung/i })).toBeNull();
  });

  it('withholds the raster and all system details until Astrometrie succeeds', async () => {
    apiMocks.get.mockResolvedValue({ availability: 'ASTROMETRY_REQUIRED' });

    render(
      <MemoryRouter initialEntries={['/database/systems/20']}>
        <Routes>
          <Route path="/database/systems/:id" element={<DatabaseSystemDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/noch nicht erfolgreich vollständig kartographiert/i),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Kartographische Systemkarte')).toBeNull();
    expect(screen.queryByText('Bespin')).toBeNull();
    expect(screen.getByRole('link', { name: '← Sternensysteme' }).getAttribute('href')).toBe(
      '/database?view=systems',
    );
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
    expect(screen.getByText('Bespin')).toBeTruthy();
    expect(screen.getAllByText('???')).toHaveLength(3);
    expect(screen.queryByRole('link', { name: '???' })).toBeNull();
  });
});
