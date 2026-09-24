import { render, screen } from '@testing-library/react';

import type { ColonyField } from '../types';
import { ColonyMap } from './ColonyMap';

const field: ColonyField = {
  id: 1,
  fieldIndex: 1,
  fieldType: 101,
  terrainTileId: null,
  layer: 'SURFACE',
  buildingId: null,
  isBuilding: false,
  isActive: false,
  buildProgress: 0,
  buildFinishesAt: null,
  availableUpgrades: [],
};

describe('ColonyMap', () => {
  const props = {
    orbitFields: [],
    surfaceFields: [field],
    undergroundFields: [],
    selectedField: null,
    highlightedFields: new Set<number>(),
    replacementFields: new Set<number>(),
    isBuildMode: false,
    buildingMap: {},
    getBuildPreviewTitle: () => undefined,
    onFieldClick: vi.fn(),
    onFieldMouseEnter: vi.fn(),
    onFieldMouseLeave: vi.fn(),
    energy: { current: 1, max: 2 },
  };

  it('keeps every ten-column field grid wide enough to scroll on mobile', () => {
    render(<ColonyMap {...props} />);

    const grid = screen.getByRole('button', { name: 'Feld 1' }).parentElement;
    expect(grid?.className).toContain('min-w-[400px]');
    expect(grid?.className).toContain('grid-cols-10');
  });

  it('omits shield strength when no shield data is supplied', () => {
    render(<ColonyMap {...props} />);

    expect(screen.queryByText('Schildstärke')).toBeNull();
  });

  it('renders shield strength directly below energy when supplied', () => {
    render(<ColonyMap {...props} shield={{ current: 25, max: 100 }} />);

    expect(screen.getByText('25/100')).toBeTruthy();
    const shield = screen.getByRole('progressbar', { name: 'Schildstärke' });
    expect(shield.getAttribute('aria-valuenow')).toBe('25');
    expect(shield.getAttribute('aria-valuemax')).toBe('100');
  });
});
