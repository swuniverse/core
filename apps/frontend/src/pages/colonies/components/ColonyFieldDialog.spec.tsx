import { useState } from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

import type {
  BuildingDef,
  BuildingRepairPreview,
  ColonyField,
  CommodityDef,
  TerraformingDef,
} from '../types';
import { ColonyFieldDialog } from './ColonyFieldDialog';
import { repairErrorMessage } from './RepairCostList';

const airfield: BuildingDef = {
  id: 81010100,
  name: 'Raumbahnhof',
  description: 'Versorgt Schiffe im Orbit.',
  category: 'SPECIAL',
  costs: { buildTime: 120 },
  allowedFieldTypes: [901],
  isUnique: false,
  production: [{ commodityId: 1, amount: 3 }],
  bonuses: { energy: 0, population: 0, storage: 20 },
  epsProc: -4,
  bevUse: 5,
  bevPro: 2,
  integrity: 1500,
  functions: [4],
};

const spaceport: BuildingDef = {
  ...airfield,
  id: 81010200,
  name: 'Raumhafen',
  functions: [4, 5],
};

const warehouse: BuildingDef = {
  ...airfield,
  id: 81010300,
  name: 'Lagerhaus',
  functions: [23],
};

const colonyCentral: BuildingDef = {
  ...airfield,
  id: 82010100,
  name: 'Koloniezentrale',
  functions: [1],
};

const commodity: CommodityDef = {
  id: 1,
  name: 'Durastahl',
  nameShort: 'DUR',
};

const secondCommodity: CommodityDef = {
  id: 2,
  name: 'Tritanium',
  nameShort: 'TRI',
};

const builtField: ColonyField = {
  id: 79,
  fieldIndex: 79,
  fieldType: 901,
  terrainTileId: null,
  layer: 'ORBIT',
  buildingId: airfield.id,
  isBuilding: false,
  isActive: true,
  integrity: 1500,
  maxIntegrity: 1500,
  buildProgress: 100,
  buildFinishesAt: null,
  availableUpgrades: [
    {
      id: 8101020079,
      fromBuildingId: airfield.id,
      toBuildingId: spaceport.id,
      researchId: null,
      description: 'Erweitert Hangar und Werft.',
      energyCost: 10,
      costs: [{ commodityId: commodity.id, amount: 25 }],
    },
  ],
};

const terraforming: TerraformingDef = {
  id: '201',
  description: 'Ebene vorbereiten',
  fromFieldType: '101',
  toFieldType: '102',
  energyCost: 50,
  duration: 4 * 60 * 60,
  researchId: null,
  costs: [
    { commodityId: commodity.id, amount: 10 },
    { commodityId: secondCommodity.id, amount: 20 },
  ],
};

const defaultProps = {
  field: builtField,
  building: airfield,
  buildingMap: {
    [airfield.id]: airfield,
    [spaceport.id]: spaceport,
    [colonyCentral.id]: colonyCentral,
  },
  commodityMap: {
    [commodity.id]: commodity,
    [secondCommodity.id]: secondCommodity,
  },
  terraformingDefs: [terraforming],
  onClose: vi.fn(),
  onOpenContext: vi.fn(),
  onOpenBuildMenu: vi.fn(),
  onFilterBuildMenuByCommodity: vi.fn(),
  onOpenAcademy: vi.fn(),
  onTerraform: vi.fn(),
  onBuildDome: vi.fn(),
  onRepairWreck: vi.fn(),
  onUpgrade: vi.fn(),
  onDemolish: vi.fn(),
  onToggle: vi.fn(),
  colonyId: 42,
  energyAvailable: 10,
  storageAmounts: { [commodity.id]: 20 },
  onFetchRepairPreview: vi.fn().mockResolvedValue({
    fields: [],
    totalEnergyCost: 0,
    totalCosts: [],
  } satisfies BuildingRepairPreview),
  onRepairBuilding: vi.fn(),
};

function previewFor(
  fieldIndex: number,
  values: Partial<BuildingRepairPreview['fields'][number]> = {},
): BuildingRepairPreview {
  return {
    fields: [
      {
        fieldIndex,
        buildingId: airfield.id,
        buildingName: airfield.name,
        integrity: 70,
        maxIntegrity: 100,
        damageRatio: 0.3,
        energyCost: 4,
        costs: [{ commodityId: commodity.id, amount: 3 }],
        repairable: true,
        ...values,
      },
    ],
    totalEnergyCost: 4,
    totalCosts: [{ commodityId: commodity.id, amount: 3 }],
  };
}

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe('ColonyFieldDialog', () => {
  it.each([
    ['Colony not found', 'Kolonie nicht gefunden'],
    [
      'Cannot repair orbital buildings while colony is blockaded',
      'Orbitalgebäude können während einer Blockade nicht repariert werden',
    ],
    [
      'Not enough resource #12: need 3, have 1',
      'Nicht genug Ware #12: benötigt 3, vorhanden 1',
    ],
  ])('translates repair endpoint error "%s"', (english, german) => {
    expect(repairErrorMessage(new Error(english))).toBe(german);
  });

  it('shows repair costs and disables repair when current storage is short', async () => {
    const onFetchRepairPreview = vi
      .fn()
      .mockResolvedValue(previewFor(79));
    const onRepairBuilding = vi.fn();

    render(
      <ColonyFieldDialog
        {...defaultProps}
        field={{ ...builtField, integrity: 70, maxIntegrity: 100 }}
        energyAvailable={2}
        storageAmounts={{ [commodity.id]: 1 }}
        onFetchRepairPreview={onFetchRepairPreview}
        onRepairBuilding={onRepairBuilding}
      />,
    );

    const repairButton = await screen.findByRole('button', {
      name: 'Reparieren',
    });
    expect(onFetchRepairPreview).toHaveBeenCalledWith(79);
    expect(screen.getByText('2 / 4')).toBeTruthy();
    expect(screen.getByText('1 / 3')).toBeTruthy();
    expect(screen.getByAltText('Durastahl').getAttribute('src')).toBe(
      '/assets/commodities/1.png',
    );
    expect((repairButton as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen.getByText(
        'Waren- oder Energievorrat reicht für diese Reparatur nicht aus.',
      ),
    ).toBeTruthy();
    fireEvent.click(repairButton);
    expect(onRepairBuilding).not.toHaveBeenCalled();
  });

  it('hides repair for healthy buildings, construction sites, and sandbox previews', () => {
    const onFetchRepairPreview = vi
      .fn()
      .mockResolvedValue(previewFor(79));
    const { rerender } = render(
      <ColonyFieldDialog
        {...defaultProps}
        onFetchRepairPreview={onFetchRepairPreview}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Reparieren' })).toBeNull();
    expect(onFetchRepairPreview).not.toHaveBeenCalled();

    rerender(
      <ColonyFieldDialog
        {...defaultProps}
        field={{
          ...builtField,
          integrity: 10,
          maxIntegrity: 100,
          isBuilding: true,
        }}
        onFetchRepairPreview={onFetchRepairPreview}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Reparieren' })).toBeNull();
    expect(onFetchRepairPreview).not.toHaveBeenCalled();

    rerender(
      <ColonyFieldDialog
        {...defaultProps}
        field={{ ...builtField, integrity: 70, maxIntegrity: 100 }}
        sandboxMode
        onFetchRepairPreview={onFetchRepairPreview}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Reparieren' })).toBeNull();
    expect(onFetchRepairPreview).not.toHaveBeenCalled();
  });

  it('submits the selected field index once and translates repair errors', async () => {
    const pending = deferred();
    const onRepairBuilding = vi.fn(() => pending.promise);
    const firstMount = render(
      <ColonyFieldDialog
        {...defaultProps}
        field={{ ...builtField, integrity: 70, maxIntegrity: 100 }}
        onFetchRepairPreview={vi.fn().mockResolvedValue(previewFor(79))}
        onRepairBuilding={onRepairBuilding}
      />,
    );

    const button = await screen.findByRole('button', { name: 'Reparieren' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onRepairBuilding).toHaveBeenCalledOnce();
    expect(onRepairBuilding).toHaveBeenCalledWith(79);
    expect((button as HTMLButtonElement).disabled).toBe(true);

    await act(async () => pending.resolve());
    expect((button as HTMLButtonElement).disabled).toBe(false);
    firstMount.unmount();

    const failingRepair = vi
      .fn()
      .mockRejectedValue(new Error('Building is not damaged'));
    const { unmount } = render(
      <ColonyFieldDialog
        {...defaultProps}
        field={{ ...builtField, integrity: 70, maxIntegrity: 100 }}
        onFetchRepairPreview={vi.fn().mockResolvedValue(previewFor(79))}
        onRepairBuilding={failingRepair}
      />,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Reparieren' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Gebäude ist nicht beschädigt',
    );
    unmount();
  });

  it('fails closed while preview is loading or failed, and allows retry', async () => {
    const first = deferred<BuildingRepairPreview>();
    const onFetchRepairPreview = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockRejectedValueOnce(new Error('preview offline'))
      .mockResolvedValueOnce(previewFor(79));
    const firstRender = render(
      <ColonyFieldDialog
        {...defaultProps}
        field={{ ...builtField, integrity: 70, maxIntegrity: 100 }}
        onFetchRepairPreview={onFetchRepairPreview}
      />,
    );

    expect(screen.getByRole('status').textContent).toContain(
      'Reparaturvorschau wird geladen',
    );
    expect(screen.queryByRole('button', { name: 'Reparieren' })).toBeNull();
    await act(async () => first.resolve(previewFor(79)));
    expect(await screen.findByRole('button', { name: 'Reparieren' })).toBeTruthy();
    firstRender.unmount();

    render(
      <ColonyFieldDialog
        {...defaultProps}
        field={{ ...builtField, integrity: 70, maxIntegrity: 100 }}
        colonyId={43}
        onFetchRepairPreview={onFetchRepairPreview}
      />,
    );
    expect(
      await screen.findByText('Reparaturvorschau fehlgeschlagen: preview offline'),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reparieren' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    expect(await screen.findByRole('button', { name: 'Reparieren' })).toBeTruthy();
  });

  it('ignores an older preview after the selected field changes', async () => {
    const first = deferred<BuildingRepairPreview>();
    const onFetchRepairPreview = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(previewFor(80));
    const onRepairBuilding = vi.fn();
    const { rerender } = render(
      <ColonyFieldDialog
        {...defaultProps}
        field={{ ...builtField, integrity: 70, maxIntegrity: 100 }}
        onFetchRepairPreview={onFetchRepairPreview}
        onRepairBuilding={onRepairBuilding}
      />,
    );

    rerender(
      <ColonyFieldDialog
        {...defaultProps}
        field={{ ...builtField, fieldIndex: 80, integrity: 70, maxIntegrity: 100 }}
        onFetchRepairPreview={onFetchRepairPreview}
        onRepairBuilding={onRepairBuilding}
      />,
    );
    const repairButton = await screen.findByRole('button', { name: 'Reparieren' });
    await act(async () => first.resolve(previewFor(79)));
    expect(screen.getByRole('button', { name: 'Reparieren' })).toBe(repairButton);
    await act(async () => {
      fireEvent.click(repairButton);
    });
    expect(onRepairBuilding).toHaveBeenCalledWith(80);
  });

  it('uses the rounded high-damage threshold and keeps deactivate available', () => {
    const onFetchRepairPreview = vi.fn(
      () => new Promise<BuildingRepairPreview>(() => undefined),
    );
    const { rerender } = render(
      <ColonyFieldDialog
        {...defaultProps}
        onFetchRepairPreview={onFetchRepairPreview}
        field={{
          ...builtField,
          isActive: false,
          integrity: 99,
          maxIntegrity: 200,
        }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Aktivieren' })).toBeTruthy();
    expect(
      screen.queryByText('Stark beschädigt – kann nicht aktiviert werden'),
    ).toBeNull();

    rerender(
      <ColonyFieldDialog
        {...defaultProps}
        onFetchRepairPreview={onFetchRepairPreview}
        field={{
          ...builtField,
          isActive: false,
          integrity: 98,
          maxIntegrity: 200,
        }}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Aktivieren' })).toBeNull();
    expect(
      screen.getByText('Stark beschädigt – kann nicht aktiviert werden'),
    ).toBeTruthy();

    rerender(
      <ColonyFieldDialog
        {...defaultProps}
        onFetchRepairPreview={onFetchRepairPreview}
        field={{ ...builtField, isActive: true, integrity: 98, maxIntegrity: 200 }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Deaktivieren' })).toBeTruthy();
  });

  it('shows building details, upgrades, production, and enabled context actions', () => {
    const onOpenContext = vi.fn();

    render(
      <ColonyFieldDialog {...defaultProps} onOpenContext={onOpenContext} />,
    );

    expect(
      screen.getByRole('dialog', { name: 'Feld 79 - Informationen' }),
    ).toBeTruthy();
    expect(screen.getByText('Integrität: 1500/1500')).toBeTruthy();
    expect(screen.getByText('Auswirkungen')).toBeTruthy();
    expect(screen.getByText('Produktion')).toBeTruthy();
    const hangarButton = screen.getByRole('button', {
      name: 'Hangar öffnen',
    });
    expect((hangarButton as HTMLButtonElement).disabled).toBe(false);
    expect(
      screen.getByRole('button', { name: 'Upgrade auf Raumhafen' }),
    ).toBeTruthy();

    fireEvent.click(hangarButton);

    expect(onOpenContext).toHaveBeenCalledWith('hangar');
  });

  it('opens the academy from a colony central', () => {
    const onOpenAcademy = vi.fn();

    render(
      <ColonyFieldDialog
        {...defaultProps}
        field={{ ...builtField, buildingId: colonyCentral.id }}
        building={colonyCentral}
        onOpenAcademy={onOpenAcademy}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Akademie' }));

    expect(onOpenAcademy).toHaveBeenCalledOnce();
  });

  it('disables context actions from an inactive field and explains why', () => {
    render(
      <ColonyFieldDialog
        {...defaultProps}
        field={{ ...builtField, isActive: false }}
      />,
    );

    expect(
      (
        screen.getByRole('button', {
          name: 'Hangar öffnen',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(screen.getByText('Gebäude ist deaktiviert')).toBeTruthy();
  });

  it.each([true, false])(
    'enables Müllverbrennung for a completed %s warehouse when the server allows it',
    (isActive) => {
      const onOpenContext = vi.fn();
      render(
        <ColonyFieldDialog
          {...defaultProps}
          field={{ ...builtField, buildingId: warehouse.id, isActive }}
          building={warehouse}
          wasteAvailability={{ enabled: true }}
          onOpenContext={onOpenContext}
        />,
      );

      const action = screen.getByRole('button', { name: 'Müllverbrennung' });
      expect((action as HTMLButtonElement).disabled).toBe(false);
      fireEvent.click(action);
      expect(onOpenContext).toHaveBeenCalledWith('waste');
    },
  );

  it('uses only the passed server availability for the clicked warehouse', () => {
    render(
      <ColonyFieldDialog
        {...defaultProps}
        field={{ ...builtField, buildingId: warehouse.id }}
        building={warehouse}
        wasteAvailability={{ enabled: false, reason: 'Lager blockiert' }}
      />,
    );

    expect(
      (
        screen.getByRole('button', {
          name: 'Müllverbrennung',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(screen.getByText('Lager blockiert')).toBeTruthy();
  });

  it('does not offer Müllverbrennung for a warehouse still under construction', () => {
    render(
      <ColonyFieldDialog
        {...defaultProps}
        field={{
          ...builtField,
          buildingId: warehouse.id,
          isBuilding: true,
          buildProgress: 50,
        }}
        building={warehouse}
        wasteAvailability={{ enabled: true }}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Müllverbrennung' }),
    ).toBeNull();
  });

  it('shows terraforming and opens the build menu for a free field', () => {
    const onOpenBuildMenu = vi.fn();
    const freeField: ColonyField = {
      ...builtField,
      fieldIndex: 12,
      fieldType: 101,
      layer: 'SURFACE',
      buildingId: null,
      integrity: undefined,
      maxIntegrity: undefined,
      availableUpgrades: [],
    };

    render(
      <ColonyFieldDialog
        {...defaultProps}
        field={freeField}
        building={undefined}
        onOpenBuildMenu={onOpenBuildMenu}
      />,
    );

    expect(screen.getByText('Terraforming')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Ebene vorbereiten' }),
    ).toBeTruthy();
    expect(screen.getByText('Kosten')).toBeTruthy();
    expect(screen.getByAltText('Energie').getAttribute('src')).toBe(
      '/assets/buttons/e_trans2.png',
    );
    expect(screen.getByText('50')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('20')).toBeTruthy();
    expect(screen.getByAltText('Durastahl').getAttribute('src')).toBe(
      '/assets/commodities/1.png',
    );
    expect(screen.getByAltText('Tritanium').getAttribute('src')).toContain(
      '2-baumaterial.png',
    );
    expect(screen.getAllByAltText('Wiese')[1].getAttribute('src')).toBe(
      '/assets/generated/fields/101.png',
    );
    expect(screen.getByAltText('102').getAttribute('src')).toBe(
      '/assets/generated/fields/102.png',
    );
    expect(screen.getByText('Dauer')).toBeTruthy();
    expect(screen.getAllByText('4h')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Baumenü öffnen' }));
    expect(onOpenBuildMenu).toHaveBeenCalledOnce();
  });

  it('shows field transformation progress while terraforming is active', () => {
    const freeField: ColonyField = {
      ...builtField,
      fieldIndex: 12,
      fieldType: 101,
      layer: 'SURFACE',
      buildingId: null,
      integrity: undefined,
      maxIntegrity: undefined,
      availableUpgrades: [],
      terraformingId: terraforming.id,
      terraformingFinishesAt: new Date(
        Date.now() + 2 * 60 * 60 * 1000,
      ).toISOString(),
    };

    render(
      <ColonyFieldDialog
        {...defaultProps}
        field={freeField}
        building={undefined}
      />,
    );

    expect(screen.getByText('Ebene vorbereiten läuft')).toBeTruthy();
    expect(
      screen
        .getByRole('progressbar', { name: 'Terraforming-Fortschritt' })
        .getAttribute('aria-valuenow'),
    ).toMatch(/^(4[5-9]|5[0-5])$/);
    expect(screen.getByText('Fertigstellung:', { exact: false })).toBeTruthy();
  });

  it('closes via its button, backdrop, and Escape', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <ColonyFieldDialog {...defaultProps} onClose={onClose} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dialog schließen' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<ColonyFieldDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('field-dialog-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('focuses the close button and traps focus in both directions', () => {
    render(<ColonyFieldDialog {...defaultProps} />);

    const closeButton = screen.getByRole('button', {
      name: 'Dialog schließen',
    });
    const demolishButton = screen.getByRole('button', { name: 'Demontieren' });
    expect(document.activeElement).toBe(closeButton);

    demolishButton.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(closeButton);

    closeButton.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(demolishButton);
  });

  it('restores focus to the trigger when the dialog closes', () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Feld 79
          </button>
          {open && (
            <ColonyFieldDialog
              {...defaultProps}
              onClose={() => setOpen(false)}
            />
          )}
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Feld 79' });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Dialog schließen' }));

    expect(document.activeElement).toBe(trigger);
  });

  it('requires confirmation before demolishing a building', async () => {
    const onDemolish = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ColonyFieldDialog {...defaultProps} onDemolish={onDemolish} />);

    fireEvent.click(screen.getByRole('button', { name: 'Demontieren' }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(onDemolish).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Demontieren' }));
    expect(onDemolish).toHaveBeenCalledWith(79);
    await act(async () => undefined);
    confirm.mockRestore();
  });

  it.each([
    ['upgrade', 'Upgrade auf Raumhafen', 'Deaktivieren', 'onUpgrade'],
    ['toggle', 'Deaktivieren', 'Upgrade auf Raumhafen', 'onToggle'],
  ] as const)(
    'prevents duplicate %s mutations while only its trigger is pending',
    async (_action, label, otherActionLabel, callbackName) => {
      const pending = deferred();
      const callback = vi.fn(() => pending.promise);
      render(
        <ColonyFieldDialog
          {...defaultProps}
          {...{ [callbackName]: callback }}
        />,
      );
      const trigger = screen.getByRole('button', { name: label });
      const close = screen.getByRole('button', { name: 'Dialog schließen' });

      fireEvent.click(trigger);
      fireEvent.click(trigger);

      expect(callback).toHaveBeenCalledOnce();
      expect((trigger as HTMLButtonElement).disabled).toBe(true);
      expect(
        (
          screen.getByRole('button', {
            name: otherActionLabel,
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false);
      expect((close as HTMLButtonElement).disabled).toBe(false);
      await act(async () => pending.resolve());
      expect((trigger as HTMLButtonElement).disabled).toBe(false);
    },
  );

  it('confirms once and prevents duplicate demolition while pending', async () => {
    const pending = deferred();
    const onDemolish = vi.fn(() => pending.promise);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ColonyFieldDialog {...defaultProps} onDemolish={onDemolish} />);
    const trigger = screen.getByRole('button', { name: 'Demontieren' });

    fireEvent.click(trigger);
    fireEvent.click(trigger);

    expect(confirm).toHaveBeenCalledOnce();
    expect(onDemolish).toHaveBeenCalledOnce();
    expect((trigger as HTMLButtonElement).disabled).toBe(true);
    expect(
      (
        screen.getByRole('button', {
          name: 'Deaktivieren',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    await act(async () => pending.resolve());
    expect((trigger as HTMLButtonElement).disabled).toBe(false);
    confirm.mockRestore();
  });

  it('prevents duplicate terraforming while only that option is pending', async () => {
    const pending = deferred();
    const onTerraform = vi.fn(() => pending.promise);
    const freeField: ColonyField = {
      ...builtField,
      fieldIndex: 12,
      fieldType: 101,
      layer: 'SURFACE',
      buildingId: null,
      integrity: undefined,
      maxIntegrity: undefined,
      availableUpgrades: [],
    };
    render(
      <ColonyFieldDialog
        {...defaultProps}
        field={freeField}
        building={undefined}
        onTerraform={onTerraform}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Ebene vorbereiten' });
    const buildMenu = screen.getByRole('button', { name: 'Baumenü öffnen' });

    fireEvent.click(trigger);
    fireEvent.click(trigger);

    expect(onTerraform).toHaveBeenCalledOnce();
    expect((trigger as HTMLButtonElement).disabled).toBe(true);
    expect((buildMenu as HTMLButtonElement).disabled).toBe(false);
    await act(async () => pending.resolve());
    expect((trigger as HTMLButtonElement).disabled).toBe(false);
  });

  it('uses non-submitting buttons for every dialog action', () => {
    render(<ColonyFieldDialog {...defaultProps} />);

    const dialog = screen.getByRole('dialog', {
      name: 'Feld 79 - Informationen',
    });
    for (const button of Array.from(dialog.querySelectorAll('button'))) {
      expect(button.getAttribute('type')).toBe('button');
    }
  });
});
