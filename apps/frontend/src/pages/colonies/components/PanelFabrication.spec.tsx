import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { ColonyDetailV2, CommodityDef } from '../types';
import { PanelFabrication } from './PanelFabrication';

const commodityMap = {
  2: { id: 2, name: 'Durastahl', nameShort: 'Durastahl' },
  10701: { id: 10701, name: 'Turbolaser', nameShort: 'Turbolaser' },
} satisfies Record<number, CommodityDef>;

const catalog = [
  {
    itemKey: 'module.weapon.turbolaser-k1',
    queueType: 'MODULE',
    displayName: 'Turbolaser (Klasse 1)',
    outputCommodityId: 10701,
    outputAmount: 1,
    shipyardGroup: 'OFFENSE_SYSTEMS',
    shipyardType: 'ENERGY_WEAPON',
    moduleClass: 1,
    buildingFunctionIds: [10],
    energyCost: 20,
    durationSeconds: 0,
    costs: [{ commodityId: 2, amount: 10 }],
    available: true,
  },
] as unknown as NonNullable<ColonyDetailV2['fabricationCatalog']>;

const queue = [
  {
    id: 7,
    queueType: 'MODULE',
    itemKey: 'module.weapon.turbolaser-k1',
    displayName: 'Turbolaser (Klasse 1)',
    amount: 4,
    outputCommodityId: 10701,
    outputAmount: 4,
    buildingFunctionId: 10,
    functionName: 'Waffenfabrik',
    finishesAt: '2026-10-30T10:00:00Z',
    status: 'QUEUED',
  },
] as NonNullable<ColonyDetailV2['fabricationQueue']>;

function renderPanel(
  onStart = vi.fn(),
  onCancel = vi.fn(),
) {
  render(
    <PanelFabrication
      catalog={catalog}
      queue={queue}
      activeFunctionIds={[10]}
      commodityMap={commodityMap}
      storageAmounts={{ 10701: 3 }}
      onStartFabrication={onStart}
      onCancelFabrication={onCancel}
    />,
  );
  fireEvent.click(screen.getByText('Offensivsysteme'));
  fireEvent.click(screen.getByText('Energiewaffe'));
}

describe('PanelFabrication', () => {
  it('shows EPS cost, queued and stored amounts', () => {
    renderPanel();
    expect(screen.getByText('Energie: 20')).toBeTruthy();
    expect(screen.getByText('In Bau: 4')).toBeTruthy();
    expect(screen.getByText('Lagernd: 3')).toBeTruthy();
  });

  it('shows repair components in the component construction menu', () => {
    const componentCatalog = [
      {
        itemKey: 'component.repair.spare-part',
        queueType: 'MODULE',
        displayName: 'Instandhaltungsset',
        outputCommodityId: 10001,
        outputAmount: 1,
        buildingFunctionIds: [29],
        energyCost: 2,
        durationSeconds: 0,
        costs: [{ commodityId: 2, amount: 5 }],
        available: true,
      },
    ] as unknown as NonNullable<ColonyDetailV2['fabricationCatalog']>;

    render(
      <PanelFabrication
        catalog={componentCatalog}
        queue={[]}
        activeFunctionIds={[29]}
        presentFunctions={[
          {
            id: 29,
            key: 'FABRICATION_HALL',
            name: 'Fabrikationshalle',
            buildingIds: [1],
          },
        ]}
        commodityMap={{
          ...commodityMap,
          10001: { id: 10001, name: 'Instandhaltungsset', nameShort: 'Instandhaltungsset' },
        }}
        storageAmounts={{ 10001: 6 }}
        onStartFabrication={vi.fn()}
        onCancelFabrication={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByText('Komponenten')[0]);
    fireEvent.click(screen.getAllByText('Komponenten')[1]);
    expect(screen.getByText('Instandhaltungsset')).toBeTruthy();
    expect(screen.getByText(/Fabrikationshalle · aktiv/)).toBeTruthy();
    expect(screen.getByText('Lagernd: 6')).toBeTruthy();
    expect(screen.getByText('In Bau: 0')).toBeTruthy();
  });

  it('starts fabrication with the entered amount', async () => {
    const onStart = vi.fn();
    renderPanel(onStart);
    fireEvent.change(screen.getByLabelText('Menge Turbolaser (Klasse 1)'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByText('Starten'));
    await waitFor(() =>
      expect(onStart).toHaveBeenCalledWith(
        'module.weapon.turbolaser-k1',
        'MODULE',
        10,
        5,
      ),
    );
  });

  it('cancels a partial amount', async () => {
    const onCancel = vi.fn();
    renderPanel(vi.fn(), onCancel);
    fireEvent.change(
      screen.getByLabelText('Abbruchmenge Turbolaser (Klasse 1)'),
      { target: { value: '2' } },
    );
    fireEvent.click(screen.getByText('Abbrechen'));
    await waitFor(() => expect(onCancel).toHaveBeenCalledWith(7, 2));
  });

  it('hides developer metadata', () => {
    renderPanel();
    expect(screen.queryByText(/STU:|Bundle|Tech /)).toBeNull();
  });

  describe('plan filter, account stock and batch order', () => {
    const buildplans = [
      {
        id: 1,
        shipClassId: 5,
        name: 'Jäger Alpha',
        signature: 's',
        moduleSelections: [
          { slotId: 'w1', commodityId: 10701 },
          { slotId: 'w2', commodityId: 10701 },
        ],
        moduleCommodityIds: [10701, 10701],
        moduleTypes: [],
        canDelete: true,
      },
    ] as NonNullable<ColonyDetailV2['buildplans']>;
    const layouts = [
      {
        shipClassId: 5,
        slots: [{ slotId: 'w1', moduleCategory: 'ENERGY_WEAPON' }],
      },
    ] as unknown as NonNullable<ColonyDetailV2['shipyard']['shipClassLayouts']>;

    function renderRich(
      overrides: Partial<React.ComponentProps<typeof PanelFabrication>> = {},
    ) {
      render(
        <PanelFabrication
          catalog={catalog}
          queue={[]}
          activeFunctionIds={[10]}
          commodityMap={commodityMap}
          storageAmounts={{ 2: 15, 10701: 3 }}
          energy={30}
          buildplans={buildplans}
          shipClasses={[{ id: 5, name: 'Jäger' }]}
          shipClassLayouts={layouts}
          onOpenCommodityLocations={vi.fn()}
          onStartFabrication={vi.fn()}
          onStartFabricationBatch={vi.fn()}
          onCancelFabrication={vi.fn()}
          {...overrides}
        />,
      );
    }

    it('filters by buildplan and shows the required count', () => {
      renderRich();
      expect(screen.getByLabelText('Bauplan')).toBeTruthy();
      fireEvent.change(screen.getByLabelText('Bauplan'), {
        target: { value: '1' },
      });
      expect(screen.getByText('(Benötigt: 2)')).toBeTruthy();
    });

    it('hides modules outside the chosen hull', () => {
      renderRich({ shipClassLayouts: [{ ...layouts[0], slots: [] }] });
      fireEvent.change(screen.getByLabelText('Rumpf'), {
        target: { value: '5' },
      });
      expect(screen.getByText('Keine Treffer.')).toBeTruthy();
    });

    it('shows account-wide stock next to local stock and opens locations', async () => {
      const onOpen = vi.fn();
      renderRich({
        onOpenCommodityLocations: onOpen,
        loadTotals: async () => ({ 10701: 9 }),
      });
      fireEvent.click(screen.getByText('Offensivsysteme'));
      fireEvent.click(screen.getByText('Energiewaffe'));
      const button = await screen.findByText('Lagernd: 9');
      expect(screen.getByText(/\(lokal 3\)/)).toBeTruthy();
      fireEvent.click(button);
      expect(onOpen).toHaveBeenCalledWith(10701, button);
    });

    it('previews total cost with shortfalls and sends the batch', async () => {
      const onBatch = vi.fn(async () => ({
        items: [
          {
            itemKey: 'module.weapon.turbolaser-k1',
            requested: 2,
            accepted: 1,
            message: 'Es wurden 1 von 2 Modulen in Auftrag gegeben',
          },
        ],
        message: '1 von 1 Aufträgen angenommen',
      }));
      renderRich({ onStartFabricationBatch: onBatch });
      fireEvent.click(screen.getByText('Offensivsysteme'));
      fireEvent.click(screen.getByText('Energiewaffe'));
      fireEvent.change(screen.getByLabelText('Menge Turbolaser (Klasse 1)'), {
        target: { value: '2' },
      });
      // 2 x 10 Durastahl (have 15), 2 x 20 energy (have 30)
      expect(screen.getByText('Fehlmenge Durastahl: 5')).toBeTruthy();
      expect(screen.getByText('Fehlmenge Energie: 10')).toBeTruthy();
      fireEvent.click(screen.getByText('Modulherstellung'));
      await waitFor(() =>
        expect(onBatch).toHaveBeenCalledWith(10, [
          { itemKey: 'module.weapon.turbolaser-k1', amount: 2 },
        ]),
      );
      expect(
        await screen.findByText('Es wurden 1 von 2 Modulen in Auftrag gegeben'),
      ).toBeTruthy();
    });

    it('keeps the results of ordered groups and clears their amounts when a later group fails', async () => {
      const second = {
        ...catalog[0],
        itemKey: 'module.weapon.ionenkanone-k1',
        displayName: 'Ionenkanone (Klasse 1)',
        buildingFunctionIds: [11],
      };
      const onBatch = vi
        .fn()
        .mockResolvedValueOnce({
          items: [{ itemKey: catalog[0].itemKey, requested: 1, accepted: 1, message: 'Turbolaser bestellt' }],
          message: '1 von 1 Aufträgen angenommen',
        })
        .mockRejectedValueOnce(new Error('Fabrik 11 nicht verfügbar'));
      renderRich({
        catalog: [catalog[0], second] as typeof catalog,
        activeFunctionIds: [10, 11],
        onStartFabricationBatch: onBatch,
      });
      fireEvent.click(screen.getByText('Offensivsysteme'));
      fireEvent.click(screen.getByText('Energiewaffe'));
      fireEvent.change(screen.getByLabelText('Menge Turbolaser (Klasse 1)'), { target: { value: '1' } });
      fireEvent.change(screen.getByLabelText('Menge Ionenkanone (Klasse 1)'), { target: { value: '1' } });
      fireEvent.click(screen.getByText('Modulherstellung'));

      expect(await screen.findByText('Fabrik 11 nicht verfügbar')).toBeTruthy();
      expect(screen.getByText('Turbolaser bestellt')).toBeTruthy();
      expect((screen.getByLabelText('Menge Turbolaser (Klasse 1)') as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText('Menge Ionenkanone (Klasse 1)') as HTMLInputElement).value).toBe('1');
    });
  });
});
