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

  it('marks a construction site with a striped frame and reveals the building by progress', () => {
    const site = {
      ...field,
      buildingId: 1,
      isBuilding: true,
      buildProgressPercent: 40,
    };
    render(<ColonyMap {...props} surfaceFields={[site]} />);

    const cell = screen.getByRole('button', { name: /Feld 1.*\(im Bau, 40 %\)/ });
    expect(cell.className).toContain('border-image');
    expect(cell.className).not.toContain('animate-pulse');
    expect(screen.getByTestId('construction-ghost').className).toContain('grayscale');
    expect(screen.getByTestId('build-progress-reveal').style.clipPath).toBe(
      'inset(0 60% 0 0)',
    );
  });

  it('shows a finished building without construction marks', () => {
    render(
      <ColonyMap
        {...props}
        surfaceFields={[{ ...field, buildingId: 1, isBuilding: false }]}
      />,
    );

    expect(screen.getByRole('button', { name: /Feld 1/ }).className).not.toContain('border-image');
    expect(screen.queryByTestId('construction-ghost')).toBeNull();
  });
});
