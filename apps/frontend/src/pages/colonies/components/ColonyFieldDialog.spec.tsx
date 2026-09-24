import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

import type {
  BuildingDef,
  ColonyField,
  CommodityDef,
  TerraformingDef,
} from '../types';
import { ColonyFieldDialog } from './ColonyFieldDialog';

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
  id: 201,
  description: 'Ebene vorbereiten',
  fromFieldType: 101,
  toFieldType: 102,
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
  onTerraform: vi.fn(),
  onUpgrade: vi.fn(),
  onDemolish: vi.fn(),
  onToggle: vi.fn(),
};

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe('ColonyFieldDialog', () => {
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
    expect(screen.getByText('Energie')).toBeTruthy();
    expect(screen.getByText('⚡ 50')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('20')).toBeTruthy();
    expect(screen.getByText('Durastahl')).toBeTruthy();
    expect(screen.getByText('Tritanium')).toBeTruthy();
    const costIcons = Array.from(screen.getAllByAltText('')).map((image) =>
      image.getAttribute('src'),
    );
    expect(costIcons).toContain('/assets/commodities/1.png');
    expect(costIcons.some((src) => src?.includes('2-baumaterial.png'))).toBe(
      true,
    );
    expect(screen.getByText('Dauer')).toBeTruthy();
    expect(screen.getAllByText('4h')).toHaveLength(1);
    const costs = screen.getByText('Kosten').parentElement;
    const energy = screen.getByText('Energie').parentElement;
    expect(costs?.nextElementSibling).toBe(energy);
    expect(costs?.textContent).not.toContain('50');
    fireEvent.click(screen.getByRole('button', { name: 'Baumenü öffnen' }));
    expect(onOpenBuildMenu).toHaveBeenCalledOnce();
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
