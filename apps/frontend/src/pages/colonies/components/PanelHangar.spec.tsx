import { render, screen } from '@testing-library/react';
import { PanelHangar } from './PanelHangar';

describe('PanelHangar STU costs', () => {
  it('shows resource costs without exposing fixed start modules', () => {
    render(
      <PanelHangar
        hangar={{
          hasAirfield: true,
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
});
