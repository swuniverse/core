import { fireEvent, render, screen } from '@testing-library/react';
import { ColonyScansPage } from './colony-scans';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn() }));
vi.mock('../services/api', () => ({ api: apiMocks }));

describe('ColonyScansPage', () => {
  it('keeps full scan history while labeling alliance provenance and exposing deletion only for own scans', async () => {
    const own = {
      id: 2,
      colonyId: 7,
      scanner: { id: 1, username: 'Eigener Scout' },
      provenance: 'OWN' as const,
      canDelete: true,
      colonyOwnerId: 9,
      colonyName: 'Alderaan',
      colonyOwnerUsername: 'Leia',
      starSystemId: 8,
      celestialObjectId: 10,
      colonyClassId: 3,
      surfaceWidth: 1,
      surfaceHeight: 1,
      deposits: [],
      createdAt: '2026-10-16T12:00:00.000Z',
      abandoned: false,
    };
    const alliance = {
      ...own,
      id: 1,
      scanner: { id: 2, username: 'Allianz Scout' },
      provenance: 'ALLIANCE' as const,
      canDelete: false,
      createdAt: '2026-10-15T12:00:00.000Z',
    };
    apiMocks.get
      .mockResolvedValueOnce([{ ...own, history: [own, alliance] }])
      .mockResolvedValueOnce({ ...own, surface: [] });

    render(<ColonyScansPage />);

    expect((await screen.findAllByText('Alderaan')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Eigener Scan/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Scanner: Eigener Scout/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Löschen' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '2 Scans anzeigen' }));

    expect(await screen.findByText(/Allianz-Scan/)).toBeTruthy();
    expect(screen.getByText(/Scanner: Allianz Scout/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Löschen' })).toHaveLength(1);
  });
});
