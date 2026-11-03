import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { StationShipyardPanel } from './StationShipyardPanel';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

describe('StationShipyardPanel', () => {
  it('selects an available module and submits the exact ship design', async () => {
    (api.get as vi.Mock).mockResolvedValue({
      options: [
        {
          id: 3,
          key: 'CR90',
          name: 'CR90 Korvette',
          buildTimeTicks: 4,
          crewMax: 8,
          buildCosts: [{ commodityId: 7, amount: 2, stored: 3 }],
          layout: {
            shipClassId: 3,
            imageKey: 'cr90',
            layoutKey: 'corvette',
            baseStats: { baseCrew: 2 },
            slots: [
              {
                slotId: 'weapon-1',
                moduleCategory: 'ENERGY_WEAPON',
                label: 'Waffe',
                anchorX: 0,
                anchorY: 0,
                calloutSide: 'left',
                order: 0,
              },
            ],
          },
        },
      ],
      availableModules: [
        {
          commodityId: 11,
          commodityName: 'Laserkanone',
          amount: 1,
          moduleType: 'LASER',
          moduleCategory: 'ENERGY_WEAPON',
          shipyardGroup: 'WEAPONS',
          shipyardType: 'ENERGY_WEAPON',
          moduleLevel: 1,
          moduleClass: 1,
          researchRequired: null,
          faction: null,
          displayName: 'Laserkanone',
          crewRequired: 1,
          effects: ['Schaden +1'],
          shipyardModuleStats: null,
          compatibleShipClassIds: [3],
        },
      ],
      queues: [],
    });
    (api.post as vi.Mock).mockResolvedValue({});

    render(<StationShipyardPanel stationId={9} onChanged={vi.fn()} />);

    expect(await screen.findByText('CR90 Korvette')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Waffe/ }));
    fireEvent.click(screen.getByRole('button', { name: /Laserkanone/ }));
    fireEvent.change(screen.getByLabelText('Schiffsname'), {
      target: { value: 'Hoffnung' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Schiff bauen' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/spacecraft/9/station-shipyard/build',
        {
          shipClassId: 3,
          name: 'Hoffnung',
          moduleSelections: [{ slotId: 'weapon-1', commodityId: 11 }],
        },
      ),
    );
  });
});
