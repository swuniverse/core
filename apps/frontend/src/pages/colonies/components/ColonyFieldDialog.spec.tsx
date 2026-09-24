import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

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

const commodity: CommodityDef = {
  id: 1,
  name: 'Durastahl',
  nameShort: 'DUR',
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
  energyCost: 5,
  duration: 120,
  researchId: null,
  costs: [],
};

const defaultProps = {
  field: builtField,
  building: airfield,
  buildingMap: { [airfield.id]: airfield, [spaceport.id]: spaceport },
  commodityMap: { [commodity.id]: commodity },
  terraformingDefs: [terraforming],
  onClose: vi.fn(),
  onOpenContext: vi.fn(),
  onOpenBuildMenu: vi.fn(),
  onTerraform: vi.fn(),
  onUpgrade: vi.fn(),
  onDemolish: vi.fn(),
  onToggle: vi.fn(),
};

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

  it('requires confirmation before demolishing a building', () => {
    const onDemolish = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ColonyFieldDialog {...defaultProps} onDemolish={onDemolish} />);

    fireEvent.click(screen.getByRole('button', { name: 'Demontieren' }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(onDemolish).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Demontieren' }));
    expect(onDemolish).toHaveBeenCalledWith(79);
    confirm.mockRestore();
  });

  it('uses non-submitting buttons for every dialog action', () => {
    render(<ColonyFieldDialog {...defaultProps} />);

    const dialog = screen.getByRole('dialog', {
      name: 'Feld 79 - Informationen',
    });
    for (const button of dialog.querySelectorAll('button')) {
      expect(button.getAttribute('type')).toBe('button');
    }
  });
});
