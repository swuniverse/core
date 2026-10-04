import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';

import type { ColonyDetailV2 } from '../types';
import { PanelBuildingManagement } from './PanelBuildingManagement';

const management = {
  counts: { active: 2, inactive: 1, damaged: 2, building: 1 },
  fields: [
    {
      fieldIndex: 11,
      layer: 'SURFACE',
      buildingId: 101,
      buildingName: 'Aktivwerk',
      isActive: true,
      isBuilding: false,
      integrity: 100,
      maxIntegrity: 100,
      epsProc: 0,
      bevUse: 0,
      bevPro: 0,
      production: [],
    },
    {
      fieldIndex: 12,
      layer: 'SURFACE',
      buildingId: 102,
      buildingName: 'Ruhewerk',
      isActive: false,
      isBuilding: false,
      integrity: 100,
      maxIntegrity: 100,
      epsProc: 0,
      bevUse: 0,
      bevPro: 0,
      production: [],
    },
    {
      fieldIndex: 13,
      layer: 'SURFACE',
      buildingId: 103,
      buildingName: 'Schadwerk',
      isActive: true,
      isBuilding: false,
      integrity: 60,
      maxIntegrity: 100,
      epsProc: 0,
      bevUse: 0,
      bevPro: 0,
      production: [],
    },
    {
      fieldIndex: 14,
      layer: 'SURFACE',
      buildingId: 104,
      buildingName: 'Neubauwerk',
      isActive: true,
      isBuilding: true,
      integrity: 40,
      maxIntegrity: 100,
      epsProc: 0,
      bevUse: 0,
      bevPro: 0,
      production: [],
    },
  ],
  usableCommodities: [],
} satisfies NonNullable<ColonyDetailV2['buildingManagement']>;

const getBuildingRow = (buildingName: string) => {
  const row = screen.getByText(buildingName).closest('label');
  if (!row) throw new Error(`Missing row for ${buildingName}`);
  return within(row);
};

describe('PanelBuildingManagement', () => {
  it('associates field numbers with effective row statuses and preserves selection actions', async () => {
    const onActivate = vi.fn().mockResolvedValue({});

    render(
      <PanelBuildingManagement
        management={management}
        onActivate={onActivate}
        onDeactivate={vi.fn().mockResolvedValue({})}
      />,
    );

    expect(getBuildingRow('Aktivwerk').getByText('Feld 11')).toBeTruthy();
    expect(getBuildingRow('Aktivwerk').getByText('aktiv')).toBeTruthy();
    expect(getBuildingRow('Ruhewerk').getByText('Feld 12')).toBeTruthy();
    expect(getBuildingRow('Ruhewerk').getByText('inaktiv')).toBeTruthy();

    const damagedRow = getBuildingRow('Schadwerk');
    expect(damagedRow.getByText('Feld 13')).toBeTruthy();
    expect(damagedRow.getByText('beschädigt')).toBeTruthy();
    expect(damagedRow.queryByText('aktiv')).toBeNull();

    const buildingRow = getBuildingRow('Neubauwerk');
    expect(buildingRow.getByText('Feld 14')).toBeTruthy();
    expect(buildingRow.getByText('im Bau')).toBeTruthy();
    expect(buildingRow.queryByText('beschädigt')).toBeNull();
    expect(buildingRow.queryByText('aktiv')).toBeNull();

    fireEvent.click(damagedRow.getByRole('checkbox'));
    expect(screen.getByText('1 ausgewählt')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Aktivieren' }));

    await waitFor(() => {
      expect(onActivate).toHaveBeenCalledWith(2, { fieldIndexes: [13] });
    });
  });
});
