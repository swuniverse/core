import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi, type Mock } from 'vitest';
import { StationShipyardPanel } from './StationShipyardPanel';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

function overview() {
  return {
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
      {
        id: 4,
        key: 'SHUTTLE',
        name: 'Shuttle',
        buildTimeTicks: 2,
        crewMax: 4,
        buildCosts: [],
        layout: {
          shipClassId: 4,
          imageKey: 'shuttle',
          layoutKey: 'shuttle',
          baseStats: { baseCrew: 1 },
          slots: [],
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
    buildplans: [
      {
        id: 7,
        shipClassId: 3,
        name: 'Patrouille',
        signature: 'weapon-1:11',
        moduleSelections: [{ slotId: 'weapon-1', commodityId: 11 }],
        moduleCommodityIds: [11],
        moduleTypes: ['LASER'],
      },
    ],
    queues: [],
  };
}

describe('StationShipyardPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api.get as Mock).mockResolvedValue(overview());
    (api.post as Mock).mockResolvedValue({});
  });

  it('selects an available module and submits the exact ship design', async () => {
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

  it('shows the authoritative overview error instead of hiding its cause', async () => {
    (api.get as Mock).mockRejectedValueOnce(
      new Error('Station nicht erreichbar.'),
    );
    render(<StationShipyardPanel stationId={9} onChanged={vi.fn()} />);

    expect(await screen.findByText('Station nicht erreichbar.')).toBeTruthy();
    expect(
      (
        screen.getByRole('button', {
          name: 'Schiff bauen',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('switches to a custom hull rather than submitting the previously selected Bauplan', async () => {
    render(<StationShipyardPanel stationId={9} onChanged={vi.fn()} />);

    fireEvent.change(await screen.findByLabelText('Bauplan'), {
      target: { value: '7' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Shuttle/ }));
    expect((screen.getByLabelText('Bauplan') as HTMLSelectElement).value).toBe(
      '',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Schiff bauen' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/spacecraft/9/station-shipyard/build',
        { shipClassId: 4, name: 'Shuttle', moduleSelections: [] },
      ),
    );
  });

  it('refreshes the Bauplans and shows the queued Bauplan name after building', async () => {
    const onChanged = vi.fn();
    const refreshed = {
      ...overview(),
      buildplans: [{ ...overview().buildplans[0], id: 8, name: 'Eskorte' }],
      queues: [
        {
          id: 20,
          name: 'Hoffnung',
          buildPlanName: 'Eskorte',
          finishesAt: '2026-11-04T12:00:00Z',
        },
      ],
    };
    (api.get as Mock)
      .mockResolvedValueOnce(overview())
      .mockResolvedValueOnce(refreshed);
    render(<StationShipyardPanel stationId={9} onChanged={onChanged} />);

    fireEvent.change(await screen.findByLabelText('Bauplan'), {
      target: { value: '7' },
    });
    fireEvent.change(screen.getByLabelText('Schiffsname'), {
      target: { value: 'Hoffnung' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Schiff bauen' }));

    expect(
      await screen.findByText(/Im Bau: Hoffnung · Bauplan: Eskorte/),
    ).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Eskorte' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Patrouille' })).toBeNull();
    expect((screen.getByLabelText('Bauplan') as HTMLSelectElement).value).toBe(
      '',
    );
    expect(screen.getByRole('button', { name: /Waffe — leer —/ })).toBeTruthy();
    expect(
      (
        screen.getByRole('button', {
          name: 'Schiff bauen',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(api.get).toHaveBeenLastCalledWith('/spacecraft/9/station-shipyard');
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
  });

  it('shows the authoritative build error and retains the complete design for retry', async () => {
    const onChanged = vi.fn();
    (api.post as Mock)
      .mockRejectedValueOnce(new Error('Laserkanone fehlt im Stationslager.'))
      .mockResolvedValueOnce({});
    render(<StationShipyardPanel stationId={9} onChanged={onChanged} />);

    fireEvent.click(await screen.findByRole('button', { name: /Waffe/ }));
    fireEvent.click(screen.getByRole('button', { name: /Laserkanone/ }));
    fireEvent.change(screen.getByLabelText('Schiffsname'), {
      target: { value: 'Hoffnung' },
    });
    fireEvent.change(screen.getByLabelText('Bauplanname'), {
      target: { value: 'Eskorte' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Schiff bauen' }));

    expect(
      await screen.findByText('Laserkanone fehlt im Stationslager.'),
    ).toBeTruthy();
    expect(
      (screen.getByLabelText('Schiffsname') as HTMLInputElement).value,
    ).toBe('Hoffnung');
    expect(
      (screen.getByLabelText('Bauplanname') as HTMLInputElement).value,
    ).toBe('Eskorte');
    expect(
      screen.getByRole('button', { name: /Waffe Laserkanone/ }),
    ).toBeTruthy();
    expect(screen.queryByText('Schiffbau gestartet.')).toBeNull();
    expect(onChanged).not.toHaveBeenCalled();
    expect(api.get).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Schiff bauen' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      '/spacecraft/9/station-shipyard/build',
      {
        shipClassId: 3,
        name: 'Hoffnung',
        moduleSelections: [{ slotId: 'weapon-1', commodityId: 11 }],
        buildPlanName: 'Eskorte',
      },
    );
    expect(
      screen.queryByText('Laserkanone fehlt im Stationslager.'),
    ).toBeNull();
    expect(screen.getByText('Schiffbau gestartet.')).toBeTruthy();
  });

  it('submits a trimmed Bauplan name with a custom ship build', async () => {
    render(<StationShipyardPanel stationId={9} onChanged={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Waffe/ }));
    fireEvent.click(screen.getByRole('button', { name: /Laserkanone/ }));
    fireEvent.change(screen.getByLabelText('Schiffsname'), {
      target: { value: 'Hoffnung' },
    });
    fireEvent.change(screen.getByLabelText('Bauplanname'), {
      target: { value: '  Eskorte  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Schiff bauen' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/spacecraft/9/station-shipyard/build',
        {
          shipClassId: 3,
          name: 'Hoffnung',
          moduleSelections: [{ slotId: 'weapon-1', commodityId: 11 }],
          buildPlanName: 'Eskorte',
        },
      ),
    );
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('submits a custom design after editing a saved Bauplan in the real designer', async () => {
    render(<StationShipyardPanel stationId={9} onChanged={vi.fn()} />);

    fireEvent.change(await screen.findByLabelText('Bauplan'), {
      target: { value: '7' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Waffe Laserkanone/ }));
    fireEvent.click(screen.getByRole('button', { name: /Leer lassen/ }));
    expect((screen.getByLabelText('Bauplan') as HTMLSelectElement).value).toBe(
      '',
    );
    expect(screen.getByRole('button', { name: /Waffe — leer —/ })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Schiffsname'), {
      target: { value: 'Unbewaffnet' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Schiff bauen' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/spacecraft/9/station-shipyard/build',
        { shipClassId: 3, name: 'Unbewaffnet', moduleSelections: [] },
      ),
    );
  });

  it('loads a saved Bauplan into the real designer and builds by its identity', async () => {
    render(<StationShipyardPanel stationId={9} onChanged={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Shuttle/ }));
    expect(screen.queryByRole('button', { name: /Waffe/ })).toBeNull();
    fireEvent.change(screen.getByLabelText('Bauplan'), {
      target: { value: '7' },
    });
    expect(
      screen.getByRole('button', { name: /Waffe Laserkanone/ }),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Schiffsname'), {
      target: { value: 'Wache' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Schiff bauen' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/spacecraft/9/station-shipyard/build',
        { buildPlanId: 7, name: 'Wache' },
      ),
    );
  });
});
