import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WidgetDistressSignals } from './WidgetDistressSignals';

it('shows globally active distress signals with ship links', () => {
  render(
    <MemoryRouter>
      <WidgetDistressSignals
        data={
          {
            distressSignals: [
              {
                id: 1,
                spacecraftId: 7,
                shipName: 'Falke',
                ownerId: 2,
                message: 'Hilfe',
                active: true,
                startedAt: '',
                stoppedAt: null,
                locationLabel: '[4,5]',
              },
            ],
          } as never
        }
      />
    </MemoryRouter>,
  );
  expect(screen.getByText('Hilfe')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Falke' }).getAttribute('href')).toBe(
    '/spacecraft/7',
  );
});
