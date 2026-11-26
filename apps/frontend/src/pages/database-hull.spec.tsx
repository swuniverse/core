import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { DatabaseHullCatalogDto, DatabaseHullDetailDto } from '@swuniverse/shared';
import { DatabasePage } from './database';
import { DatabaseHullDetailPage } from './database-hull';

vi.mock('../components/database/DatabaseProgress', () => ({ DatabaseProgress: () => null }));
const apiMocks = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn() }));
vi.mock('../services/api', () => ({ api: apiMocks }));

const catalog: DatabaseHullCatalogDto = {
  discovered: 1,
  total: 2,
  entries: [
    { id: 12, key: 'rebel_corvette', discovered: true, name: 'Korvette', discoveredAt: '2026-11-01T10:00:00Z' },
    { id: 13, key: 'rebel_frigate', discovered: false, name: null, discoveredAt: null },
  ],
};

const detail: DatabaseHullDetailDto = {
  id: 40, key: 'rebel_outpost', kind: 'STATION', name: 'Außenposten', factionName: 'Rebellen',
  category: 'STATION', role: 'OUTPOST', moduleLevel: 2,
  modules: [{ type: 'HULL', minLevel: 1, maxLevel: 3, mandatory: true }],
  flightEnergyCost: 0, cargoCapacity: 5000, sensorRange: 4, torpedoCapacity: 0, crewMin: 10, crewMax: 30,
  epsCapacity: 800, hull: 6000, shield: 2000, requiredWorkbees: 3, buildEnergyCost: 200,
  buildCosts: [{ commodityId: 21, commodityName: 'Durastahl', amount: 500 }], buildTimeSeconds: 7200,
};

describe('hull catalogue', () => {
  it('lists discovered hulls with image and link, undiscovered ones as ??? without link', async () => {
    apiMocks.get.mockImplementation(() => Promise.resolve(catalog));
    render(<MemoryRouter initialEntries={['/database?view=ship-classes']}><DatabasePage /></MemoryRouter>);

    const link = await screen.findByRole('link', { name: 'Korvette' });
    expect(link.getAttribute('href')).toBe('/database/ship-classes/rebel_corvette');
    expect(link.querySelector('img')?.getAttribute('src')).toContain('/ships/');
    expect(screen.getByText('???').closest('a')).toBeNull();
  });

  it('shows a station hull with image, values, workbees and breadcrumb', async () => {
    apiMocks.get.mockImplementation(() => Promise.resolve(detail));
    render(
      <MemoryRouter initialEntries={['/database/station-classes/rebel_outpost']}>
        <Routes>
          <Route path="/database/station-classes/:key" element={<DatabaseHullDetailPage kind="STATION" />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('img', { name: 'Außenposten' })).toBeTruthy();
    expect(apiMocks.get).toHaveBeenCalledWith('/database/station-classes/rebel_outpost');
    expect(screen.getByRole('row', { name: /Benötigte Workbees 3/ })).toBeTruthy();
    expect(screen.getByRole('row', { name: /Lagerraum/ }).textContent).toContain('5');
    expect(screen.getByText(/500 Durastahl/)).toBeTruthy();
    expect(screen.getByRole('row', { name: /Bauzeit 2 h 0 min/ })).toBeTruthy();
    expect(screen.getByRole('cell', { name: '1–3' })).toBeTruthy();
    expect(document.title).toContain('Außenposten');
    expect(screen.getByRole('link', { name: 'Stationsrümpfe' }).getAttribute('href')).toBe('/database?view=station-classes');
  });
});
