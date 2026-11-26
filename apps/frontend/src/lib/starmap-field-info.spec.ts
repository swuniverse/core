import type { StarmapGalaxyFieldDto, StarmapGalaxyFieldDetailsDto } from '@swuniverse/shared';
import { fieldTooltipLines } from './starmap-field-info';

const field = {
  cx: 4,
  cy: 7,
  fieldType: { name: 'Asteroidenfeld' },
  starSystem: { name: 'Bespin' },
} as StarmapGalaxyFieldDto;

const details: StarmapGalaxyFieldDetailsDto = {
  territoryOwner: { playerId: 7, playerName: 'Lando', allianceId: 3, allianceName: 'Wolkenstadt' },
  tradePost: {
    id: 20,
    name: 'Posten Bespin',
    licenseCondition: { commodityId: 5, commodityName: 'Tibanna', amount: 100, durationDays: 7 },
  },
  region: { id: 4, name: 'Anoat-Sektor', description: 'Gasriesen' },
  effectTexts: ['Leck am EPS'],
  isImpassable: true,
  databaseSystemId: 9,
};

describe('fieldTooltipLines', () => {
  it('lists the field info in STU order', () => {
    expect(fieldTooltipLines({ ...field, details })).toEqual([
      '4, 7',
      'Asteroidenfeld',
      'Leck am EPS',
      'Unpassierbar',
      'Gebiet: Wolkenstadt (Lando)',
      'Posten Bespin (Lizenz für 7 Tage: 100 Tibanna) über Bespin-System, Anoat-Sektor',
    ]);
  });

  it('names only the player without alliance and only the post without license condition', () => {
    const lines = fieldTooltipLines({
      ...field,
      starSystem: null,
      details: {
        ...details,
        territoryOwner: { ...details.territoryOwner!, allianceId: null, allianceName: null },
        tradePost: { ...details.tradePost!, licenseCondition: null },
        region: null,
      },
    });
    expect(lines).toContain('Gebiet: Lando');
    expect(lines.at(-1)).toBe('Posten Bespin');
  });

  it('shows only coordinates and field type without details', () => {
    expect(fieldTooltipLines(field)).toEqual(['4, 7', 'Asteroidenfeld']);
  });
});
