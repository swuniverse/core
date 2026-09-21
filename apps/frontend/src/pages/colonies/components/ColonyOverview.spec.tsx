import { fireEvent, render, screen } from '@testing-library/react';
import { ColonyOverview } from './ColonyOverview';
import type { Colony } from '../types';

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
        status: { blocked: true, defended: false },
        population: { current: 630, max: 630, immigration: 0 },
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
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByAltText('Blockiert')).toBeTruthy();
    expect(screen.getByText('9|16 (Mavik-System 116|76)')).toBeTruthy();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'TD' && element.textContent === '630/630 (0)',
      ),
    ).toBeTruthy();
    expect(screen.getByText(/237\/388 \(\+32\)/)).toBeTruthy();
    expect(screen.getByText(/5914\/6000 \(\+34\)/)).toBeTruthy();
    expect(screen.getByText('Gesamtproduktion')).toBeTruthy();
    fireEvent.click(screen.getByText('Alpha'));
    expect(onSelect).toHaveBeenCalledWith(7);
  });
});
