import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { DatabasePage } from './database';

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
