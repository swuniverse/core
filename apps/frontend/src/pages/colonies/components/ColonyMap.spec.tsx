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
  it('keeps every ten-column field grid wide enough to scroll on mobile', () => {
    render(
      <ColonyMap
        orbitFields={[]}
        surfaceFields={[field]}
        undergroundFields={[]}
        selectedField={null}
        highlightedFields={new Set()}
        replacementFields={new Set()}
        isBuildMode={false}
        buildingMap={{}}
        getBuildPreviewTitle={() => undefined}
        onFieldClick={vi.fn()}
        onFieldMouseEnter={vi.fn()}
        onFieldMouseLeave={vi.fn()}
        energy={{ current: 1, max: 2 }}
      />,
    );

    const grid = screen.getByRole('button', { name: 'Feld 1' }).parentElement;
    expect(grid?.className).toContain('min-w-[400px]');
    expect(grid?.className).toContain('grid-cols-10');
  });
});
