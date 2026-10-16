import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PlayerProfilePage } from './player-profile';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn() }));
vi.mock('../services/api', () => ({
  api: apiMocks,
  ApiError: class ApiError {},
}));
vi.mock('./alliances', () => ({
  SettlerPublicDiplomacy: () => null,
}));

const foreignProfile = {
  id: 77,
  username: 'lando',
  displayName: 'Lando',
  avatar: null,
  description: null,
  faction: null,
  factionName: 'Unbekannt',
  prestige: 0,
  colonies: 1,
  ships: 0,
  completedResearch: 0,
  onboardingCompleted: true,
  isAdmin: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  alliance: null,
  colonyScans: [
    {
      id: 501,
      colonyId: 201,
      scanner: { id: 42, username: 'leia' },
      provenance: 'OWN',
      canDelete: true,
      snapshot: {
        colonyName: 'Cloud City',
        owner: { id: 77, username: 'lando' },
        scannedAt: '2026-01-01T00:00:00.000Z',
        surface: {
          width: 3,
          height: 4,
          deposits: [],
          fields: [{ fieldIndex: 1, fieldType: 101, buildingName: null }],
        },
      },
      current: {
        colony: {
          id: 201,
          name: 'Cloud City',
          owner: { id: 77, username: 'lando' },
          isAbandoned: false,
          posX: 3,
          posY: 4,
          celestialObjectId: 5,
        },
      },
      system: { id: 9, name: 'Bespin', discovered: true },
    },
    {
      id: 502,
      colonyId: 202,
      scanner: { id: 88, username: 'han' },
      provenance: 'ALLIANCE',
      canDelete: false,
      snapshot: {
        colonyName: 'Hidden Base',
        owner: { id: 77, username: 'lando' },
        scannedAt: '2026-01-01T00:00:00.000Z',
        surface: { width: 1, height: 1, deposits: [], fields: [] },
      },
      current: { colony: null },
      system: { id: 10, name: null, discovered: false },
    },
  ],
};

function renderProfile() {
  render(
    <MemoryRouter initialEntries={['/database/settlers/77']}>
      <Routes>
        <Route path="/database/settlers/:id" element={<PlayerProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PlayerProfilePage colony scans', () => {
  it('shows authorized foreign profile scans with a non-tactical surface inspector, a discovered system link, and only own deletion', async () => {
    apiMocks.get.mockResolvedValue(foreignProfile);
    renderProfile();

    await screen.findByText('Neueste zugängliche Kolonie-Scans');
    expect(screen.getByText(/Scanner: leia/)).not.toBeNull();
    expect(screen.getByText(/Scanner: han/)).not.toBeNull();
    expect(
      screen.getByRole('link', { name: 'Bespin' }).getAttribute('href'),
    ).toBe('/database/systems/9');
    expect(screen.queryByRole('link', { name: 'System #10' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Scan 501 löschen' }),
    ).not.toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Scan 502 löschen' }),
    ).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Cloud City öffnen/ }));
    expect(
      (await screen.findByRole('dialog', { name: 'Gespeicherte Oberfläche' }))
        .textContent,
    ).toContain('keine taktischen Aktionen verfügbar');

    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Scan 501 löschen' }));
    await waitFor(() =>
      expect(apiMocks.delete).toHaveBeenCalledWith(
        '/spacecraft/colony-scans/501',
      ),
    );
  });

  it('does not render a scan section when the own-profile response omits scans', async () => {
    apiMocks.get.mockResolvedValue({
      ...foreignProfile,
      id: 42,
      colonyScans: undefined,
    });
    renderProfile();

    await screen.findByText('Lando');
    expect(screen.queryByText('Neueste zugängliche Kolonie-Scans')).toBeNull();
  });
});
