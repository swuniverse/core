import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PanelHangar } from './PanelHangar';

describe('PanelHangar STU costs', () => {
  it('shows resource costs without exposing fixed start modules', () => {
    render(
      <PanelHangar
        hangar={{
          hasAirfield: true,
          hasFighterShipyard: false,
          inventory: [],
          buildable: [
            {
              shipClassId: 1,
              shipClassKey: 'REBEL_COLONIZER_ICARUS',
              shipClassName: 'GR-75 Kolonietransporter',
              hangarCommodityId: 21501,
              displayName: 'GR-75 Kolonietransporter Rumpf',
              buildEnergyCost: 90,
              startEnergyCost: 125,
              buildCosts: [
                { commodityId: 2, amount: 30 },
                { commodityId: 21, amount: 12 },
              ],
              defaultModules: [
                { commodityId: 10101, name: 'Matrix-Panzerung' },
              ],
              maxBuildable: 1,
              crewRequired: 0,
            },
          ],
          startable: [
            {
              shipClassId: 1,
              shipClassKey: 'REBEL_COLONIZER_ICARUS',
              shipClassName: 'GR-75 Kolonietransporter',
              hangarCommodityId: 21501,
              displayName: 'GR-75 Kolonietransporter Rumpf',
              amount: 1,
              startEnergyCost: 125,
              crewRequired: 0,
              defaultModules: [
                { commodityId: 10101, name: 'Matrix-Panzerung' },
              ],
            },
          ],
          landableOrbitShips: [],
        }}
        commodityMap={{
          2: { id: 2, name: 'Duranium', nameShort: 'DUR' },
          21: { id: 21, name: 'Transparentstahl', nameShort: 'TRA' },
        }}
        onBuildAirfieldRump={vi.fn()}
        onStartHangarShip={vi.fn()}
      />,
    );

    expect(screen.getByText(/30 Duranium, 12 Transparentstahl/)).toBeTruthy();
    expect(screen.queryByText(/Matrix-Panzerung/)).toBeNull();
    expect(screen.queryByText(/Defaultmodule/)).toBeNull();
    expect(screen.queryByText(/Startet mit/)).toBeNull();
  });

  it('allows fighter construction with a fighter shipyard and no airfield', () => {
    render(
      <PanelHangar
        hangar={{
          hasAirfield: false,
          hasFighterShipyard: true,
          inventory: [],
          buildable: [
            {
              shipClassId: 1,
              shipClassKey: 'REBEL_SHUTTLE_LAAT',
              shipClassName: 'LAAT Shuttle',
              hangarCommodityId: 21401,
              displayName: 'LAAT Shuttle Rumpf',
              buildEnergyCost: 90,
              startEnergyCost: 90,
              buildCosts: [{ commodityId: 2, amount: 10 }],
              defaultModules: [],
              maxBuildable: 1,
              crewRequired: 5,
            },
          ],
          startable: [],
          landableOrbitShips: [],
        }}
        commodityMap={{
          2: { id: 2, name: 'Duranium', nameShort: 'DUR' },
        }}
        onBuildAirfieldRump={vi.fn()}
        onStartHangarShip={vi.fn()}
      />,
    );

    expect(screen.queryByText('Aktiver Raumhafen erforderlich.')).toBeNull();
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Bauen' }).disabled,
    ).toBe(false);
  });

  const colonizer = (startLockReason: string | null) => ({
    shipClassId: 1,
    shipClassKey: 'REBEL_COLONIZER_ICARUS',
    shipClassName: 'GR-75 Kolonietransporter',
    hangarCommodityId: 21501,
    displayName: 'GR-75 Kolonietransporter Rumpf',
    buildEnergyCost: 90,
    startEnergyCost: 125,
    buildCosts: [{ commodityId: 2, amount: 30 }],
    defaultModules: [],
    maxBuildable: 4,
    crewRequired: 0,
    amount: 1,
    startLockReason,
  });

  it('shows the server message after a partial hull build', async () => {
    const onBuild = vi.fn(async () => 'Es wurden daher nur 2 Stück gebaut');
    render(
      <PanelHangar
        hangar={{
          hasAirfield: true,
          hasFighterShipyard: false,
          inventory: [],
          buildable: [colonizer(null)],
          startable: [],
          landableOrbitShips: [],
        }}
        commodityMap={{ 2: { id: 2, name: 'Duranium', nameShort: 'DUR' } }}
        onBuildAirfieldRump={onBuild}
        onStartHangarShip={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Bauen' }));
    expect(await screen.findByText(/nur 2 Stück gebaut/)).toBeTruthy();
    await waitFor(() => expect(onBuild).toHaveBeenCalledWith(1, 1));
  });

  it('locks starting a colony ship and shows the reason', () => {
    const reason = 'Es kann nur ein Schiff mit Kolonisierungsfunktion genutzt werden';
    render(
      <PanelHangar
        hangar={{
          hasAirfield: true,
          hasFighterShipyard: false,
          inventory: [],
          buildable: [],
          startable: [colonizer(reason)],
          landableOrbitShips: [],
        }}
        commodityMap={{}}
        onBuildAirfieldRump={vi.fn()}
        onStartHangarShip={vi.fn()}
      />,
    );
    expect(screen.getByText(reason)).toBeTruthy();
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Starten' })
        .disabled,
    ).toBe(true);
  });
});
