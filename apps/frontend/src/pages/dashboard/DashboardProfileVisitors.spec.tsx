import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardProfileVisitors } from './DashboardLowerSections';

it('renders recent profile visitors as linked players', () => {
  render(
    <MemoryRouter>
      <DashboardProfileVisitors
        visitors={[
          {
            userId: 4,
            username: 'Leia',
            displayName: 'General Organa',
            visitedAt: '2026-10-29T10:00:00.000Z',
          },
        ]}
      />
    </MemoryRouter>,
  );

  expect(screen.getByRole('heading', { name: 'Profilbesucher' })).toBeTruthy();
  expect(
    screen.getByRole('link', { name: 'General Organa' }).getAttribute('href'),
  ).toBe('/players/4');
});

it('renders an empty state without recent visitors', () => {
  render(
    <MemoryRouter>
      <DashboardProfileVisitors visitors={[]} />
    </MemoryRouter>,
  );

  expect(screen.getByText('Keine Besucher')).toBeTruthy();
});
