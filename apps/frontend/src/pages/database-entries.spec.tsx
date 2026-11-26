import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { DatabasePlanetTypeDetailDto, DatabaseRegionDetailDto } from '@swuniverse/shared';
import { DatabasePage } from './database';
import { DatabasePlanetTypePage, DatabaseRegionPage, DatabaseSystemTypePage } from './database-entries';

vi.mock('../components/database/DatabaseProgress', () => ({ DatabaseProgress: () => null }));
const apiMocks = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn() }));
vi.mock('../services/api', () => ({ api: apiMocks }));

function renderAt(path: string, route: string, element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path={route} element={element} /></Routes>
    </MemoryRouter>,
  );
}

describe('database entry detail pages', () => {
  it('links discovered planet types, system types and regions from their lists', async () => {
    apiMocks.get.mockImplementation((url: string) => Promise.resolve(
      url.startsWith('/database/planet-types')
        ? { layers: [], discovered: 1, total: 2, entries: [
            { key: '90010:RB', classId: 90010, objectTypeId: 1, imageName: ' [P1RB]', discovered: true, name: 'Wüste', description: null, objectType: 'Planet', discoveredAt: '2026-11-01T00:00:00Z' },
            { key: '90020:RB', classId: 90020, objectTypeId: 1, imageName: ' [P2RB]', discovered: false, name: null, description: null, objectType: null, discoveredAt: null },
          ] }
        : url.startsWith('/database/system-types')
          ? { layers: [], discovered: 1, total: 1, entries: [{ systemTypeId: 1001, discovered: true, name: 'Gelber Zwerg', rarity: 'COMMON', discoveredAt: '2026-11-01T00:00:00Z' }] }
          : { layers: [], discovered: 1, total: 1, entries: [{ regionId: 3, discovered: true, name: 'Anoat', description: 'Gasriesen', layerId: 1, layerName: 'Galaxis', discoveredAt: '2026-11-01T00:00:00Z' }] },
    ));
    const view = render(<MemoryRouter initialEntries={['/database?view=planet-types']}><DatabasePage /></MemoryRouter>);
    expect((await screen.findByRole('link', { name: 'Wüste' })).getAttribute('href')).toBe('/database/planet-types/90010%3ARB');
    expect(screen.getAllByText('???').every((cell) => cell.closest('a') === null)).toBe(true);
    view.unmount();

    const systems = render(<MemoryRouter initialEntries={['/database?view=system-types']}><DatabasePage /></MemoryRouter>);
    expect((await screen.findByRole('link', { name: 'Gelber Zwerg' })).getAttribute('href')).toBe('/database/system-types/1001');
    systems.unmount();

    render(<MemoryRouter initialEntries={['/database?view=regions']}><DatabasePage /></MemoryRouter>);
    expect((await screen.findByRole('link', { name: 'Anoat' })).getAttribute('href')).toBe('/database/regions/3');
  });

  it('renders the example surface of a planet type as a tile grid', async () => {
    const type: DatabasePlanetTypeDetailDto = {
      key: '90010:RB', classId: 90010, objectTypeId: 1, imageName: ' [P1RB]', name: 'Wüste', description: 'Trocken', objectType: 'Planet',
      zones: [{ label: 'Mittelzone', surface: [['A1', 'A2'], ['A3', 'A4']] }],
    };
    apiMocks.get.mockResolvedValue(type);
    renderAt('/database/planet-types/90010%3ARB', '/database/planet-types/:key', <DatabasePlanetTypePage />);

    const grid = await screen.findByRole('region', { name: 'Oberfläche Mittelzone' });
    expect(apiMocks.get).toHaveBeenCalledWith('/database/planet-types/90010%3ARB');
    expect(grid.querySelectorAll('img')).toHaveLength(4);
    expect(screen.getByText('Trocken')).toBeTruthy();
  });

  it('renders the system type values', async () => {
    apiMocks.get.mockResolvedValue({ systemTypeId: 1001, name: 'Gelber Zwerg', rarity: 'RARE', isBinary: false, gridSize: { min: 10, max: 14 }, planets: { min: 2, max: 2 }, asteroids: { min: 0, max: 1 }, moonChance: 0.3 });
    renderAt('/database/system-types/1001', '/database/system-types/:id', <DatabaseSystemTypePage />);

    expect(await screen.findByRole('row', { name: 'Seltenheit Selten' })).toBeTruthy();
    expect(screen.getByRole('row', { name: 'Systemgröße 10–14' })).toBeTruthy();
    expect(screen.getByRole('row', { name: 'Mondchance 30 %' })).toBeTruthy();
  });

  it('renders the region map with tooltips and blanks for hidden cells', async () => {
    const region: DatabaseRegionDetailDto = {
      regionId: 3, name: 'Anoat', description: 'Gasriesen', layerName: 'Galaxis',
      bounds: { minX: 3, maxX: 4, minY: 4, maxY: 4 },
      fields: [{ cx: 4, cy: 4, inRegion: true, fieldTypeId: 1, fieldTypeName: 'Leerer Raum', effectTexts: ['Leck am EPS'], starSystemName: 'Bespin' }],
    };
    apiMocks.get.mockResolvedValue(region);
    renderAt('/database/regions/3', '/database/regions/:id', <DatabaseRegionPage />);

    const known = await screen.findByTestId('region-cell-4-4');
    expect(known.getAttribute('title')).toBe('4|4 Leerer Raum\nBespin-System\nLeck am EPS');
    expect(screen.getByTestId('region-cell-3-4').getAttribute('title')).toBe('3|4 unbekannt');
    expect(screen.getByText('Gasriesen')).toBeTruthy();
  });
});
