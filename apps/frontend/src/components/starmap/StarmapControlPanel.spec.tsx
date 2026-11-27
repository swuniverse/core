import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { StarmapGalaxyFieldDto } from '@swuniverse/shared';
import { StarmapControlPanel } from './StarmapControlPanel';

const baseField = {
  id: 1, cx: 4, cy: 7, factionZone: 'NEUTRAL',
  fieldType: { name: 'Leerer Raum' },
  starSystem: { id: 9, name: 'Bespin', isMapOnly: false },
} as StarmapGalaxyFieldDto;

function renderPanel(selectedField: StarmapGalaxyFieldDto) {
  return render(
    <MemoryRouter>
      <StarmapControlPanel
        layer={{ width: 100, height: 100, sectorSize: 10 }}
        showGrid={false} onToggleGrid={vi.fn()} showShips={false} onToggleShips={vi.fn()}
        overlays={{ territory: false, impassable: false, fieldEffects: false, sensorCoverage: false }}
        onToggleOverlay={vi.fn()} selectedSector={null} onSelectSector={vi.fn()}
        onZoomIn={vi.fn()} onZoomOut={vi.fn()} selectedField={selectedField} selectedSystem={null}
        onOpenSystem={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe('StarmapControlPanel field details', () => {
  it('shows owner, trade post, region and the database link of a known system', () => {
    renderPanel({
      ...baseField,
      details: {
        territoryOwner: { playerId: 7, playerName: 'Lando', allianceId: null, allianceName: null },
        tradePost: { id: 20, name: 'Posten Bespin', licenseCondition: null },
        region: { id: 4, name: 'Anoat-Sektor', description: 'Gasriesen am Rand' },
        effectTexts: ['Leck am EPS'],
        isImpassable: true,
        databaseSystemId: 9,
      },
    });

    expect(screen.getByText('Gebiet: Lando')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Posten Bespin' }).getAttribute('href')).toBe('/trade?post=20');
    expect(screen.getByText('Region: Anoat-Sektor')).toBeTruthy();
    expect(screen.getByText('Gasriesen am Rand')).toBeTruthy();
    expect(screen.getByText('Leck am EPS')).toBeTruthy();
    expect(screen.getByText('Unpassierbar', { selector: 'p' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Datenbank' }).getAttribute('href')).toBe('/database/systems/9');
  });

  it('shows no extra info and no database link for fields without details', () => {
    renderPanel(baseField);

    expect(screen.queryByText(/^Gebiet:/)).toBeNull();
    expect(screen.queryByText(/^Region:/)).toBeNull();
    expect(screen.queryByRole('link', { name: 'Datenbank' })).toBeNull();
  });
});
