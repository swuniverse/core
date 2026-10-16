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

  it('shows a discovered system as an inspect-only entry with current-owner message access', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/database/systems/20') {
        return Promise.resolve({
          id: 20,
          name: 'Bespin',
          layerId: 7,
          cx: 1,
          cy: 3,
          systemTypeName: 'Gelber Zwerg',
          maxX: 22,
          maxY: 22,
          fields: [
            {
              id: 101,
              sx: 1,
              sy: 2,
              fieldTypeId: 5,
              isPassable: true,
              energyCost: 0,
              damage: 0,
              effects: [],
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

    expect(await screen.findByRole('heading', { name: 'Bespin' })).toBeTruthy();
    expect(screen.getByText('Bespin II')).toBeTruthy();
    expect(screen.getByText('Cloud City')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sternenkarte öffnen' }).getAttribute('href')).toBe(
      '/starmap?layer=7&x=1&y=3',
    );
    expect(screen.getByRole('link', { name: 'Nachricht an lando' }).getAttribute('href')).toBe(
      '/messages?tab=compose&to=77&name=lando',
    );
    expect(screen.queryByRole('button', { name: /scan|navigation|kampf|bewegung/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Feld 1:2 untersuchen' }));
    expect(screen.getByText('Gasriese')).toBeTruthy();
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
