import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardColonies } from './DashboardColonies';
import type { DashboardData } from './types';

describe('DashboardColonies', () => {
  it('shows colonies themselves with compact operational values', () => {
    const data = {
      colonyCount: 1,
      colonies: [
        {
          id: 9,
          name: 'Alpha',
          energy: 20,
          energyMax: 100,
          population: 30,
          populationMax: 50,
          storageUsed: 40,
          storageMax: 100,
          locationLabel: 'Tactical-46',
        },
      ],
      warnings: [],
    } as DashboardData;

    render(
      <MemoryRouter>
        <DashboardColonies data={data} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Tactical-46')).toBeTruthy();
    expect(screen.getByText('EPS 20/100')).toBeTruthy();
    expect(screen.getByText('Lager 40/100')).toBeTruthy();
  });
});
