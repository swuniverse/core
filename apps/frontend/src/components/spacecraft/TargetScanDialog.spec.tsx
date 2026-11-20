import { fireEvent, render, screen } from '@testing-library/react';
import type { SpacecraftTargetScanDto } from '@swuniverse/shared';
import { TargetScanDialog } from './TargetScanDialog';

const result = {
  id: 5,
  name: 'Falke',
  shipClassId: 1,
  username: 'Han',
  hull: 10,
  hullMax: 10,
  shields: 0,
  shieldsMax: 0,
  crew: 2,
  crewMax: 4,
  energy: 3,
  battery: 0,
  reactorFuel: 0,
  reactorFuelMax: 0,
  alertState: 'GREEN',
  modules: [],
  runtimeSystems: {},
  logbook: [
    {
      id: 1,
      body: 'Kessel-Flug in 12 Parsec',
      createdAt: '2026-11-20T12:00:00.000Z',
      editedAt: null,
    },
  ],
  crewPositions: [
    {
      slot: 'CAPTAIN',
      target: 1,
      crew: [{ id: 3, name: 'Solo', rankLabel: 'Captain', ownerName: 'Han' }],
    },
    { slot: 'CREWMAN', target: null, crew: [] },
  ],
} as unknown as SpacecraftTargetScanDto;

describe('TargetScanDialog', () => {
  it('shows details first and switches to logbook and read-only crew tabs', () => {
    render(<TargetScanDialog result={result} onClose={vi.fn()} />);

    expect(screen.getByText('Details · Falke')).toBeTruthy();
    expect(screen.getByText('Logbuch verfügbar')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Logbuch' }));
    expect(screen.getByText('Kessel-Flug in 12 Parsec')).toBeTruthy();
    expect(screen.queryByText('Details · Falke')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Crew' }));
    expect(screen.getByText('CAPTAIN · 1/1')).toBeTruthy();
    expect(screen.getByText(/Captain Solo/).textContent).toContain('(Han)');
    expect(screen.getByText('Keine Crew')).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('reports an empty logbook without the availability hint', () => {
    render(
      <TargetScanDialog result={{ ...result, logbook: [] }} onClose={vi.fn()} />,
    );
    expect(screen.queryByText('Logbuch verfügbar')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Logbuch' }));
    expect(screen.getByText('Keine Logbucheinträge vorhanden')).toBeTruthy();
  });
});
