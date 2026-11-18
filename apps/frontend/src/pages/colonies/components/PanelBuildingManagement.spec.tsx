import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';

import type {
  BuildingRepairPreview,
  BuildingRepairResult,
  ColonyDetailV2,
  CommodityDef,
} from '../types';
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

const panelProps = {
  colonyId: 25,
  commodityMap: {
    2: { id: 2, name: 'Baumaterial', nameShort: 'BAU' },
    3: { id: 3, name: 'Duranium', nameShort: 'DUR' },
  } satisfies Record<number, CommodityDef>,
  energyAvailable: 100,
  storageAmounts: {},
  onFetchRepairPreview: vi.fn().mockResolvedValue({
    fields: [],
    totalEnergyCost: 0,
    totalCosts: [],
  } satisfies BuildingRepairPreview),
  onRepairDamaged: vi.fn().mockResolvedValue({
    action: 'REPAIR',
    repaired: [],
    skipped: [],
    totalEnergyCost: 0,
    totalCosts: [],
    previewAfter: { fields: [], totalEnergyCost: 0, totalCosts: [] },
  } satisfies BuildingRepairResult),
};

const getBuildingRow = (buildingName: string) => {
  const row = screen.getByText(buildingName).closest('label');
  if (!row) throw new Error(`Missing row for ${buildingName}`);
  return within(row);
};

describe('PanelBuildingManagement', () => {
  it('loads the bulk preview first, shows backend totals and skips, then submits after confirmation', async () => {
    const sequence: string[] = [];
    const preview: BuildingRepairPreview = {
      fields: [
        {
          fieldIndex: 11,
          buildingId: 101,
          buildingName: 'Aktivwerk',
          integrity: 100,
          maxIntegrity: 100,
          damageRatio: 0,
          energyCost: 0,
          costs: [],
          repairable: false,
          reason: 'Nicht beschädigt',
        },
        {
          fieldIndex: 13,
          buildingId: 103,
          buildingName: 'Schadwerk',
          integrity: 60,
          maxIntegrity: 100,
          damageRatio: 0.4,
          energyCost: 5,
          costs: [{ commodityId: 2, amount: 25 }],
          repairable: true,
        },
        {
          fieldIndex: 14,
          buildingId: 104,
          buildingName: 'Neubauwerk',
          integrity: 40,
          maxIntegrity: 100,
          damageRatio: 0,
          energyCost: 0,
          costs: [],
          repairable: false,
          reason: 'Gebäude im Bau',
        },
        {
          fieldIndex: 15,
          buildingId: 105,
          buildingName: 'Knappwerk',
          integrity: 20,
          maxIntegrity: 100,
          damageRatio: 0.8,
          energyCost: 3,
          costs: [{ commodityId: 3, amount: 9 }],
          repairable: false,
          reason: 'Nicht genug Duranium: benötigt 9, vorhanden 2',
        },
      ],
      totalEnergyCost: 5,
      totalCosts: [{ commodityId: 2, amount: 25 }],
    };
    const onFetchRepairPreview = vi.fn(async () => {
      sequence.push('preview');
      return preview;
    });
    const onRepairDamaged = vi.fn(async () => {
      sequence.push('repair');
      return {
        action: 'REPAIR',
        repaired: [
          { fieldIndex: 13, buildingId: 103, buildingName: 'Schadwerk' },
        ],
        skipped: [
          {
            fieldIndex: 15,
            buildingId: 105,
            reason: 'Not enough resources in colony storage',
          },
        ],
        totalEnergyCost: 5,
        totalCosts: [{ commodityId: 2, amount: 25 }],
        previewAfter: { fields: [], totalEnergyCost: 0, totalCosts: [] },
      } satisfies BuildingRepairResult;
    });

    render(
      <PanelBuildingManagement
        {...panelProps}
        management={management}
        energyAvailable={4}
        storageAmounts={{ 2: 10, 3: 2 }}
        onFetchRepairPreview={onFetchRepairPreview}
        onRepairDamaged={onRepairDamaged}
        onActivate={vi.fn().mockResolvedValue({ changed: [], skipped: [] })}
        onDeactivate={vi.fn().mockResolvedValue({ changed: [], skipped: [] })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Alle reparieren' }));
    expect(onRepairDamaged).not.toHaveBeenCalled();
    expect(await screen.findByText(/2 beschädigte Gebäude gefunden/)).toBeTruthy();
    expect(sequence).toEqual(['preview']);
    expect(screen.getByText('4 / 5')).toBeTruthy();
    expect(screen.getByText('10 / 25')).toBeTruthy();
    expect(
      screen.getByText(
        'Die Gesamtkosten übersteigen den aktuellen Vorrat. Verfügbar und benötigt stehen oben.',
      ),
    ).toBeTruthy();
    expect(screen.getByText(/Feld 15 · Knappwerk: Nicht genug Duranium/)).toBeTruthy();
    expect(
      screen.getByText('Feld 14 · Neubauwerk: Gebäude im Bau'),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: 'Reparaturen jetzt durchführen' }),
    );
    await waitFor(() => expect(onRepairDamaged).toHaveBeenCalledOnce());
    expect(sequence).toEqual(['preview', 'repair']);
    expect(await screen.findByText('1 Gebäude repariert')).toBeTruthy();
    expect(screen.getByText('Feld 13 · Schadwerk')).toBeTruthy();
    expect(
      screen.getByText('Feld 15: Nicht genügend Waren im Kolonielager'),
    ).toBeTruthy();
  });

  it('shows bulk preview loading and failure without enabling repair', async () => {
    const pending = new Promise<BuildingRepairPreview>(() => undefined);
    const onFetchRepairPreview = vi
      .fn()
      .mockReturnValueOnce(pending)
      .mockRejectedValueOnce(new Error('preview offline'));
    const { rerender } = render(
      <PanelBuildingManagement
        {...panelProps}
        management={management}
        onFetchRepairPreview={onFetchRepairPreview}
        onActivate={vi.fn().mockResolvedValue({ changed: [], skipped: [] })}
        onDeactivate={vi.fn().mockResolvedValue({ changed: [], skipped: [] })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Alle reparieren' }));
    expect(screen.getByRole('button', { name: 'Vorschau …' })).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Reparaturen jetzt durchführen' }),
    ).toBeNull();
    rerender(
      <PanelBuildingManagement
        {...panelProps}
        colonyId={26}
        management={management}
        onFetchRepairPreview={onFetchRepairPreview}
        onActivate={vi.fn().mockResolvedValue({ changed: [], skipped: [] })}
        onDeactivate={vi.fn().mockResolvedValue({ changed: [], skipped: [] })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Alle reparieren' }));
    await waitFor(() => {
      expect(
        screen.getByText('Reparaturvorschau fehlgeschlagen: preview offline'),
      ).toBeTruthy();
    });
    expect(
      screen.queryByRole('button', { name: 'Reparaturen jetzt durchführen' }),
    ).toBeNull();
  });

  it('associates field numbers with effective row statuses and preserves selection actions', async () => {
    const onActivate = vi.fn().mockResolvedValue({ changed: [], skipped: [] });

    render(
      <PanelBuildingManagement
        {...panelProps}
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
        {...panelProps}
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
        {...panelProps}
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
