import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './login';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  ApiError: class ApiError extends Error {},
}));

describe('LoginPage', () => {
  const observer = vi.fn();

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the current maintenance status and hides game entry actions', async () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = observer;
        unobserve = observer;
        disconnect = observer;
      },
    );
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path === '/game-status') {
        return Promise.resolve({
          status: 'MAINTENANCE',
          message: 'Update läuft.',
        });
      }
      return Promise.resolve({
        settlers: 1,
        colonies: 1,
        ships: 1,
        totalTechs: 1,
        shipClasses: 1,
        planetTypes: 1,
        buildingTypes: 1,
      });
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Wartung läuft')).toBeTruthy());
    expect(screen.getByLabelText('Spielstatus').className).toContain(
      'swu-game-status',
    );
    expect(screen.getByText('Spielstatus')).toBeTruthy();
    expect(screen.getByText('Update läuft.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Registrieren' })).toBeNull();
  });
});
