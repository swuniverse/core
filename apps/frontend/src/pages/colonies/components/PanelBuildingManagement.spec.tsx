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
  usableCommodities: [
    { id: 2, name: 'Baumaterial' },
    { id: 3, name: 'Duranium' },
  ],
} satisfies NonNullable<ColonyDetailV2['buildingManagement']>;

const getBuildingRow = (buildingName: string) => {
  const row = screen.getByText(buildingName).closest('label');
  if (!row) throw new Error(`Missing row for ${buildingName}`);
  return within(row);
};

describe('PanelBuildingManagement', () => {
  it('associates field numbers with effective row statuses and preserves selection actions', async () => {
    const onActivate = vi.fn().mockResolvedValue({ changed: [], skipped: [] });

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
    fireEvent.click(screen.getByText('1 ausgewählt').parentElement!.querySelector('button')!);

    await waitFor(() => {
      expect(onActivate).toHaveBeenCalledWith(2, { fieldIndexes: [13] });
    });
  });

  it.each([
    ['Energieverbraucher', 1],
    ['Energieerzeuger', 3],
    ['Arbeitgeber', 4],
    ['Wohngebäude', 5],
  ])('sends the %s group mode for activation and deactivation', async (label, mode) => {
    const onActivate = vi.fn().mockResolvedValue({ changed: [], skipped: [] });
    const onDeactivate = vi.fn().mockResolvedValue({ changed: [], skipped: [] });

    render(
      <PanelBuildingManagement
        management={management}
        onActivate={onActivate}
        onDeactivate={onDeactivate}
      />,
    );

    const group = screen.getByRole('group', { name: label });
    fireEvent.click(within(group).getByRole('button', { name: 'Aktivieren' }));
    await waitFor(() => expect(onActivate).toHaveBeenCalledWith(mode, {}));

    fireEvent.click(within(group).getByRole('button', { name: 'Deaktivieren' }));
    await waitFor(() => expect(onDeactivate).toHaveBeenCalledWith(mode, {}));
  });

  it('sends the selected commodity for consumer and producer groups', async () => {
    const onActivate = vi.fn().mockResolvedValue({
      changed: [{ buildingName: 'Aktivwerk' }],
      skipped: [],
    });
    const onDeactivate = vi.fn().mockResolvedValue({ changed: [], skipped: [] });

    render(
      <PanelBuildingManagement
        management={management}
        onActivate={onActivate}
        onDeactivate={onDeactivate}
      />,
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Ware' }), {
      target: { value: '3' },
    });
    const consumers = screen.getByRole('group', { name: 'Warenverbraucher' });
    fireEvent.click(
      within(consumers).getByRole('button', { name: 'Aktivieren' }),
    );
    await waitFor(() =>
      expect(onActivate).toHaveBeenCalledWith(6, { commodityId: 3 }),
    );

    await waitFor(() =>
      expect(screen.getByText('1 Gebäude geschaltet')).toBeTruthy(),
    );

    const producers = screen.getByRole('group', { name: 'Warenerzeuger' });
    fireEvent.click(
      within(producers).getByRole('button', { name: 'Deaktivieren' }),
    );
    await waitFor(() =>
      expect(onDeactivate).toHaveBeenCalledWith(7, { commodityId: 3 }),
    );
  });
});
