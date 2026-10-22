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
  it('offers only torpedo types returned as available', async () => {
    const onSetDefenseTorpedoType = vi.fn();

    render(
      <PanelDefense
        defense={defense}
        inventory={[]}
        onLoadColonyShields={vi.fn()}
        onSetShieldFrequency={vi.fn()}
        onSetDefenseTorpedoType={onSetDefenseTorpedoType}
      />,
    );

    expect(screen.getByRole('option', { name: /Microtorpedo/ })).toBeTruthy();
    expect(
      screen.queryByRole('option', { name: /Quantentorpedo/ }),
    ).toBeNull();

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: '81' },
      });
    });
    expect(onSetDefenseTorpedoType).toHaveBeenCalledWith(81);
  });
});
