import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from './settings';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));
vi.mock('../services/api', () => ({ api: apiMocks }));

describe('SettingsPage vacation instructions', () => {
  beforeEach(() => {
    apiMocks.get.mockReset().mockResolvedValue({
      vacationMode: true,
      vacationStartedAt: '2026-01-01T00:00:00.000Z',
    });
    apiMocks.post.mockReset().mockResolvedValue({});
    apiMocks.patch.mockReset().mockResolvedValue({});
  });

  it('explains STU vacation timing, effects, reactivation and continuing work', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Gefahrenzone' }));

    expect(
      await screen.findByRole('heading', { name: 'Kryoschlaf (Urlaubsmodus)' }),
    ).toBeTruthy();
    expect(screen.getByText(/dein Konto und die Koloniewirtschaft eingefroren/)).toBeTruthy();
    expect(screen.getByText(/andere Spieler können nicht mit dir interagieren/)).toBeTruthy();
    expect(screen.getByText(/erst nach 48 Stunden ohne Login/)).toBeTruthy();
    expect(screen.getByText(/Jeder Login beendet den Urlaub/)).toBeTruthy();
    expect(screen.getByText(/an deinem Spielernamen gekennzeichnet/)).toBeTruthy();
    expect(screen.getByText(/7 Tage nach deiner letzten Aktivierung/)).toBeTruthy();
    expect(screen.getByText(/Schiffsbau, Umrüstung sowie Schiffs- und Stationsreparaturen/)).toBeTruthy();
    expect(screen.queryByText(/Nach Deaktivierung/i)).toBeNull();
    expect(screen.getByText(/Wirksam ab/)).toBeTruthy();
  });
});
