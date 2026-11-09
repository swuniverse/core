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
});
