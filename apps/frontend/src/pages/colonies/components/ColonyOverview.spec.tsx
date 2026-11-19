import { fireEvent, render, screen } from '@testing-library/react';
import { ColonyOverview } from './ColonyOverview';
import type { Colony, CommodityDef } from '../types';

describe('ColonyOverview', () => {
  it('renders the STU-style operational colony summary', () => {
    const onSelect = vi.fn();
    const colony = {
      id: 7,
      name: 'Alpha',
      colonyClassId: 201,
      energy: 237,
      energyMax: 388,
      population: 630,
      populationMax: 630,
      storageUsed: 5914,
      storageMax: 6000,
      celestialObject: { name: 'Alpha', description: null, classId: 201 },
      signatureCount: 3,
      overview: {
        location: {
          x: 9,
          y: 16,
          systemName: 'Mavik',
          systemX: 116,
          systemY: 76,
          systemTypeId: 1001,
        },
        status: { blocked: true, defended: true },
        population: { current: 630, max: 630, immigration: 12 },
        energy: { current: 237, max: 388, production: 32 },
        storage: { current: 5914, max: 6000, production: 34 },
      },
      crewSummary: { assigned: 3, limit: 10, inTraining: 0 },
      productionDeltas: [{ commodityId: 2, amount: 15 }],
    } as Colony;

    render(
      <ColonyOverview
        colonies={[colony]}
        commodities={[]}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText('Signaturen')).toBeTruthy();
    expect(screen.getByTitle('Verteidigt')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: /Signaturen von Alpha/ }),
    );
    expect(screen.getByText('3')).toBeTruthy();
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenLastCalledWith(7);
    expect(screen.getByAltText('Blockiert')).toBeTruthy();
    expect(screen.getByText('9|16 (Mavik-System 116|76)')).toBeTruthy();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'TD' && element.textContent === '630/630 (+12)',
      ),
    ).toBeTruthy();
    expect(screen.getByText(/237\/388 \(\+32\)/)).toBeTruthy();
    expect(screen.getByText(/5914\/6000 \(\+34\)/)).toBeTruthy();
    expect(screen.getByText('Gesamtproduktion')).toBeTruthy();
    fireEvent.click(screen.getByText('Alpha'));
    expect(onSelect).toHaveBeenCalledWith(7);
  });

  it('shows consumption, terraforming, module blocks and the activation hint', () => {
    const colony = {
      id: 7,
      name: 'Alpha',
      colonyClassId: 201,
      consumption: [{ commodityId: 2, amount: -5, rounds: 4 }],
      terraformingJobs: [
        { fieldIndex: 3, name: 'Wueste zu Wiese', finishesAt: null, progress: 40 },
      ],
      moduleJobs: [{ name: 'Huelle Mk1', amount: 2 }],
      activeBuildJobs: [
        {
          fieldIndex: 1,
          buildingId: 9,
          buildingName: 'Farm',
          finishesAt: null,
          activateAfterBuild: false,
        },
      ],
    } as Colony;

    render(
      <ColonyOverview
        colonies={[colony]}
        commodities={[{ id: 2, name: 'Nahrung' } as CommodityDef]}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText(/\(4 Runden\)/)).toBeTruthy();
    expect(screen.getByText('Aktuelle Terraformingvorgänge')).toBeTruthy();
    expect(screen.getByText('Wueste zu Wiese')).toBeTruthy();
    expect(screen.getByText('40 %')).toBeTruthy();
    expect(screen.getByText('Modulproduktion')).toBeTruthy();
    expect(screen.getByText('Huelle Mk1')).toBeTruthy();
    expect(screen.getByText('wird nach dem Bau deaktiviert')).toBeTruthy();
  });

  it('hides the empty blocks', () => {
    render(
      <ColonyOverview
        colonies={[{ id: 1, name: 'Beta', colonyClassId: 201 } as Colony]}
        commodities={[]}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.queryByText('Aktuelle Terraformingvorgänge')).toBeNull();
    expect(screen.queryByText('Modulproduktion')).toBeNull();
    expect(screen.queryByText(/Runden/)).toBeNull();
  });
});
