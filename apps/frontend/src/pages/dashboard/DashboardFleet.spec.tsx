import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardFleet } from './DashboardFleet';
import type { DashboardData } from './types';

describe('DashboardFleet', () => {
  it.each([
    ['RED', 'Alarmstufe Rot', 'bg-swu-negative'],
    ['YELLOW', 'Alarmstufe Gelb', 'bg-swu-warning'],
    ['GREEN', 'Alarmstufe Grün', 'bg-swu-positive'],
  ])('renders %s as an accessible status point', (alertState, title, expectedClass) => {
    const data = {
      fleetTotal: 1,
      allShips: [
        {
          id: 1,
          name: 'Home One',
          status: 'IDLE',
          alertState,
        },
      ],
    } as DashboardData;

    render(
      <MemoryRouter>
        <DashboardFleet data={data} />
      </MemoryRouter>,
    );

    const point = screen.getByTitle(title);
    expect(point.className).toContain('size-1.5');
    expect(point.className).toContain('rounded-full');
    expect(point.className).toContain(expectedClass);
  });
});
