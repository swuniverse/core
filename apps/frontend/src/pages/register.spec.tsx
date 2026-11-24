import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from './register';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  ApiError: class ApiError extends Error {},
}));

const faction = {
  id: 1,
  key: 'GALACTIC_EMPIRE',
  name: 'Galaktisches Imperium',
  colorPrimary: '#ff0000',
  playerCount: 3,
  playerLimit: 0,
  isSelectable: true,
  hasFreePlayerSlots: true,
  modifiers: [],
};

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset().mockResolvedValue([faction]);
    vi.mocked(api.post).mockReset();
  });

  it('shows no colony growth bonus, even if an old API still sends one', async () => {
    vi.mocked(api.get).mockResolvedValue([
      { ...faction, modifiers: [{ researchMultiplier: 1.1, colonyGrowthMultiplier: 1.1 }] },
    ]);
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await screen.findByText('Galaktisches Imperium');
    expect(screen.getByText('+10%')).toBeTruthy();
    expect(screen.queryByText(/Koloniewachstum/)).toBeNull();
  });

  it('shows n/limit, marks full factions and hides unselectable ones', async () => {
    vi.mocked(api.get).mockResolvedValue([
      { ...faction, playerLimit: 3, hasFreePlayerSlots: false },
      { ...faction, id: 2, name: 'Rebellenallianz', playerCount: 1, playerLimit: 5 },
      { ...faction, id: 3, name: 'Hutten', isSelectable: false },
    ]);
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    const full = (await screen.findByText('Galaktisches Imperium')).closest('button')!;
    expect(full.disabled).toBe(true);
    expect(full.textContent).toContain('3/3 Siedler – voll');
    const open = screen.getByText('Rebellenallianz').closest('button')!;
    expect(open.disabled).toBe(false);
    expect(open.textContent).toContain('1/5 Siedler');
    expect(screen.queryByText('Hutten')).toBeNull();
  });

  it('has no invite key field', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await screen.findByText('Galaktisches Imperium');
    expect(screen.queryByText(/Invite Key/i)).toBeNull();
  });

  it('shows the confirmation view instead of logging in after registering', async () => {
    vi.mocked(api.post).mockResolvedValue({
      message: 'confirm',
      email: 'tarkin@galaxy.net',
    });

    const { container } = render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    const type = (name: string, value: string) =>
      fireEvent.change(container.querySelector(`[name=${name}]`)!, {
        target: { value },
      });

    fireEvent.click(await screen.findByText('Galaktisches Imperium'));
    type('commander', 'Tarkin');
    type('email', 'tarkin@galaxy.net');
    type('password', 'correct-horse');
    type('confirm-password', 'correct-horse');
    fireEvent.click(
      screen.getByRole('button', { name: 'Commander registrieren' }),
    );

    await waitFor(() =>
      expect(screen.getByText('Prüfe dein Postfach.')).toBeTruthy(),
    );
    expect(screen.getByText('tarkin@galaxy.net')).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      username: 'Tarkin',
      email: 'tarkin@galaxy.net',
      password: 'correct-horse',
      factionId: 1,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mail erneut senden' }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/resend-verification', {
        email: 'tarkin@galaxy.net',
      }),
    );
  });
});
