import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { PanelDefense } from './PanelDefense';
import type { ColonyDetailV2 } from '../types';

const defense = {
  shields: { current: 0, max: 0, frequency: null },
  activeFunctionIds: [27],
  energyPhalanx: false,
  particlePhalanx: true,
  antiParticle: false,
  torpedoTypeId: null,
  availableTorpedoTypes: [
    {
      id: 81,
      commodityId: 81,
      name: 'Microtorpedo',
      level: 1,
      baseDamage: 90,
      criticalChance: 0,
      hitFactor: 1,
      hullDamageFactor: 1,
      shieldDamageFactor: 1,
      variance: 0,
      energyCost: 0,
      productionAmount: 1,
      researchId: null,
      amount: 5,
    },
  ],
} satisfies NonNullable<ColonyDetailV2['defense']>;

describe('PanelDefense', () => {
  it('shows and toggles the sole shield generator', async () => {
    const onToggleShieldGenerator = vi.fn();
    const panel = (
      shieldGenerators: Array<{
        fieldIndex: number;
        isActive: boolean;
        isBuilding?: boolean;
      }>,
    ) => (
      <PanelDefense
        defense={defense}
        inventory={[]}
        shieldGenerators={shieldGenerators}
        onToggleShieldGenerator={onToggleShieldGenerator}
        onLoadColonyShields={vi.fn()}
        onSetShieldFrequency={vi.fn()}
        onSetDefenseTorpedoType={vi.fn()}
      />
    );
    const { rerender } = render(panel([{ fieldIndex: 7, isActive: true }]));

    const deactivateButton = screen.getByRole('button', {
      name: 'Schildgenerator deaktivieren',
    });
    expect(deactivateButton.parentElement?.textContent).toContain(
      'Schildgenerator: aktiv',
    );
    await act(async () => {
      fireEvent.click(deactivateButton);
    });
    expect(onToggleShieldGenerator).toHaveBeenNthCalledWith(1, 7);

    rerender(panel([{ fieldIndex: 7, isActive: false }]));
    const activateButton = screen.getByRole('button', {
      name: 'Schildgenerator aktivieren',
    });
    expect(activateButton.parentElement?.textContent).toContain(
      'Schildgenerator: inaktiv',
    );
    await act(async () => {
      fireEvent.click(activateButton);
    });
    expect(onToggleShieldGenerator).toHaveBeenNthCalledWith(2, 7);

    rerender(panel([]));
    expect(screen.queryByText(/Schildgenerator:/)).toBeNull();
    expect(
      screen.queryByRole('button', { name: /Schildgenerator/ }),
    ).toBeNull();

    rerender(
      panel([
        { fieldIndex: 7, isActive: true },
        { fieldIndex: 8, isActive: false },
      ]),
    );
    expect(screen.queryByText(/Schildgenerator:/)).toBeNull();
    expect(
      screen.queryByRole('button', { name: /Schildgenerator/ }),
    ).toBeNull();
  });

  it('does not offer the toggle while the shield generator is being built', () => {
    render(
      <PanelDefense
        defense={defense}
        inventory={[]}
        shieldGenerators={[
          { fieldIndex: 7, isActive: false, isBuilding: true },
        ]}
        onToggleShieldGenerator={vi.fn()}
        onLoadColonyShields={vi.fn()}
        onSetShieldFrequency={vi.fn()}
        onSetDefenseTorpedoType={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Schildgenerator:/)).toBeNull();
    expect(
      screen.queryByRole('button', { name: /Schildgenerator/ }),
    ).toBeNull();
  });

  it('offers only torpedo types returned as available', async () => {
    const onSetDefenseTorpedoType = vi.fn();

    render(
      <PanelDefense
        defense={defense}
        inventory={[]}
        shieldGenerators={[]}
        onToggleShieldGenerator={vi.fn()}
        onLoadColonyShields={vi.fn()}
        onSetShieldFrequency={vi.fn()}
        onSetDefenseTorpedoType={onSetDefenseTorpedoType}
      />,
    );

    expect(screen.getByRole('option', { name: /Microtorpedo/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Quantentorpedo/ })).toBeNull();

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: '81' },
      });
    });
    expect(onSetDefenseTorpedoType).toHaveBeenCalledWith(81);
  });
});
