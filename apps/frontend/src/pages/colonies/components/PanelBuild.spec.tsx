import { fireEvent, render, screen, within } from '@testing-library/react';

import type { BuildingDef } from '../types';
import { PanelBuild } from './PanelBuild';

function building(
  id: number,
  bmCol: number,
  options: Partial<BuildingDef> = {},
): BuildingDef {
  return {
    id,
    name: `Gebäude ${id}`,
    description: '',
    category: 'TEST',
    costs: { buildTime: 1 },
    resourceCosts: [],
    allowedFieldTypes: [101],
    isUnique: false,
    production: [],
    bonuses: { energy: 0, population: 0, storage: 0 },
    bmCol,
    ...options,
  };
}

describe('PanelBuild', () => {
  it('shows the four STU columns side by side, sorted by name', () => {
    const buildings = [
      building(12, 4, { name: 'Solarzellen' }),
      building(11, 4, { name: 'Gezeitenkraftwerk' }),
      building(21, 2),
      building(31, 1),
      building(41, 3),
    ];
    const onSelectBuilding = vi.fn();

    render(
      <PanelBuild
        buildingDefs={buildings}
        fields={[]}
        storage={[]}
        energy={100}
        commodityMap={{}}
        selectedBuilding={null}
        onSelectBuilding={onSelectBuilding}
      />,
    );

    expect(
      screen.getAllByRole('heading').map((heading) => heading.textContent),
    ).toEqual(['Soziales 1', 'Industrie 1', 'Infrastruktur 1', 'Energie 2']);
    const energy = screen.getByRole('heading', { name: 'Energie 2' })
      .parentElement as HTMLElement;
    expect(
      within(energy)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Gezeitenkraftwerk', 'Solarzellen']);

    fireEvent.click(screen.getByRole('button', { name: 'Gebäude 21' }));
    expect(onSelectBuilding).toHaveBeenCalledWith(buildings[2]);
  });

  it('marks unaffordable buildings and explains the missing costs', () => {
    render(
      <PanelBuild
        buildingDefs={[
          building(51, 2, {
            resourceCosts: [{ commodityId: 3, amount: 40 }],
          }),
        ]}
        fields={[]}
        storage={[]}
        energy={100}
        commodityMap={{}}
        selectedBuilding={null}
        onSelectBuilding={vi.fn()}
      />,
    );

    const button = screen.getByRole('button', { name: 'Gebäude 51' });
    expect(button.getAttribute('title')).toBe(
      'Gebäude 51 – Fehlt 40 Ware #3',
    );
    expect(within(button).getByText('Gebäude 51').className).toContain(
      'text-red-400',
    );
  });

  it('combines field and commodity filters and resets each one', () => {
    const buildings = [
      building(11, 4, {
        name: 'Wüstenmine',
        allowedFieldTypes: [101],
        production: [{ commodityId: 5, amount: 2 }],
      }),
      building(12, 4, {
        name: 'Wüstenfarm',
        allowedFieldTypes: [101],
        production: [{ commodityId: 6, amount: 2 }],
      }),
      building(13, 4, {
        name: 'Eismine',
        allowedFieldTypes: [102],
        production: [{ commodityId: 5, amount: 2 }],
      }),
    ];
    const field = {
      id: 12,
      fieldIndex: 12,
      fieldType: 101,
      terrainTileId: null,
      buildingId: null,
      isBuilding: false,
      isActive: false,
      buildProgress: 0,
      buildFinishesAt: null,
    };

    const { rerender } = render(
      <PanelBuild
        buildingDefs={buildings}
        fields={[]}
        storage={[]}
        energy={100}
        commodityMap={{
          5: { id: 5, name: 'Duranium', nameShort: 'Duranium' },
        }}
        selectedBuilding={null}
        fieldFilter={{ field, label: 'Wüste' }}
        commodityFilterId={5}
        onClearFieldFilter={vi.fn()}
        onClearCommodityFilter={vi.fn()}
        onSelectBuilding={vi.fn()}
      />,
    );

    expect(screen.getByText(/Feld 12: Wüste/)).toBeTruthy();
    expect(screen.getByText(/Ware:\s+Duranium/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Wüstenmine' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Wüstenfarm' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Eismine' })).toBeNull();

    rerender(
      <PanelBuild
        buildingDefs={buildings}
        fields={[]}
        storage={[]}
        energy={100}
        commodityMap={{
          5: { id: 5, name: 'Duranium', nameShort: 'Duranium' },
        }}
        selectedBuilding={null}
        fieldFilter={null}
        commodityFilterId={5}
        onClearFieldFilter={vi.fn()}
        onClearCommodityFilter={vi.fn()}
        onSelectBuilding={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Eismine' })).toBeTruthy();
  });
});
