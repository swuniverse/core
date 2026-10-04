import { fireEvent, render, screen, within } from '@testing-library/react';

import type { ColonyDetailV2, CommodityDef } from '../types';
import { SupplyDock } from './SupplyDock';

const commodities: CommodityDef[] = [
  { id: 1, name: 'Durastahl', nameShort: 'DUR' },
  { id: 2, name: 'Tibanna-Gas', nameShort: 'TIB' },
  { id: 3, name: 'Nahrung', nameShort: 'NAH' },
];

const detail = {
  storage: { current: 60, max: 100, delta: 2 },
  inventory: [],
  productionDeltas: [
    { commodityId: 1, name: 'Durastahl', amount: 4 },
    { commodityId: 2, name: 'Tibanna-Gas', amount: -2 },
    { commodityId: 3, name: 'Nahrung', amount: 0 },
  ],
} as unknown as ColonyDetailV2;

describe('SupplyDock', () => {
  it('renders dense STU rows in icon, amount, full name, and signed delta order', () => {
    render(
      <SupplyDock
        storage={commodities.map((commodity, index) => ({
          id: commodity.id,
          commodityId: commodity.id,
          amount: (index + 1) * 10,
        }))}
        detail={detail}
        commodityMap={Object.fromEntries(
          commodities.map((item) => [item.id, item]),
        )}
        onOpenCommodityLocations={vi.fn()}
      />,
    );

    for (const [name, amount, delta] of [
      ['Durastahl', '10', '+4'],
      ['Tibanna-Gas', '20', '-2'],
      ['Nahrung', '30', '-'],
    ]) {
      const row = screen.getByRole('listitem', {
        name: `${name} Lagerbestand`,
      });
      const contents = within(row).getAllByTestId('storage-cell');
      expect(contents.map((cell) => cell.textContent)).toEqual([
        '',
        amount,
        name,
        delta,
      ]);
    }
    expect(screen.queryByRole('button', { name: /Entsorgung/ })).toBeNull();
    expect(
      screen.queryByRole('button', { name: /Müllverbrennung/ }),
    ).toBeNull();
  });

  it('opens locations only from the commodity icon and passes the exact trigger', () => {
    const onOpenCommodityLocations = vi.fn();
    render(
      <SupplyDock
        storage={[{ id: 1, commodityId: 1, amount: 10 }]}
        detail={detail}
        commodityMap={{ 1: commodities[0] }}
        onOpenCommodityLocations={onOpenCommodityLocations}
      />,
    );

    const trigger = screen.getByRole('button', {
      name: 'Lagerorte für Durastahl anzeigen',
    });
    const row = screen.getByRole('listitem', {
      name: 'Durastahl Lagerbestand',
    });
    fireEvent.click(within(row).getByText('10'));
    fireEvent.click(within(row).getByText('Durastahl'));
    fireEvent.click(within(row).getByText('+4'));
    expect(onOpenCommodityLocations).not.toHaveBeenCalled();

    fireEvent.click(trigger);
    expect(onOpenCommodityLocations).toHaveBeenCalledOnce();
    expect(onOpenCommodityLocations).toHaveBeenCalledWith(1, trigger);
  });
});
