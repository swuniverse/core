import { render, screen } from '@testing-library/react';
import { LssMap, type LocalMapSystem } from './LssMap';

vi.mock('../../lib/assets', () => ({
  planetThumbnail: (classId: number) => `/planet-${classId}.png`,
  spaceBackgroundTile: () => '/space.png',
  starTileImage: (tileId: number) => `/star-${tileId}.png`,
  systemTypeImage: () => '/system.png',
}));

function systemMap(
  classId: number,
  objectType = 1,
  isColonizable = false,
): LocalMapSystem {
  return {
    mode: 'system',
    shipX: 1,
    shipY: 13,
    sensorRange: 1,
    bounds: { minX: 1, maxX: 1, minY: 14, maxY: 14 },
    systemId: 1,
    systemName: 'Testsystem',
    systemTypeId: 1058,
    stars: [{ centerX: 1, centerY: 14, role: 'primary' }],
    fields: [
      {
        id: 1,
        sx: 1,
        sy: 14,
        fieldType: { id: 1, key: 'EMPTY_SPACE', name: 'Weltraum' },
        celestialObjectId: 10,
        celestialObject: {
          id: 10,
          name: 'Testobjekt',
          objectType,
          classId,
          posX: 1,
          posY: 14,
          isColonizable,
        },
      },
    ],
    canEnterSystem: false,
    canLeaveSystem: false,
  };
}

describe('LssMap', () => {
  it('renders dubious signatures without a numeric count', () => {
    const localMap = systemMap(201);
    localMap.overlays = {
      signatures: [{ x: 1, y: 14, state: 'DUBIOUS' }],
    };

    render(
      <LssMap
        localMap={localMap}
        navTarget={null}
        onFieldClick={vi.fn()}
      />,
    );

    expect(screen.getByText('!')).toBeTruthy();
  });

  it('renders subspace trace directions and highlights an analyzed trace', () => {
    const localMap = systemMap(201);
    localMap.overlays = {
      signatures: [],
      subspaceTraces: [
        {
          signatureId: 77,
          x: 1,
          y: 14,
          directions: ['WEST', 'EAST'],
          analyzed: true,
        },
      ],
    };

    render(
      <LssMap localMap={localMap} navTarget={null} onFieldClick={vi.fn()} />,
    );

    const trace = screen.getByLabelText(
      'Subraumspur auf Feld 1,14: WEST, EAST, analysiert',
    );
    expect(trace.className).toContain('text-amber-300');
    expect(trace.querySelectorAll('span')).toHaveLength(2);
  });

  it('renders the long-range sensor malfunction warning', () => {
    const localMap = systemMap(201);
    localMap.warning = 'Langstreckensensoren liefern keine verwertbaren Daten';

    render(
      <LssMap
        localMap={localMap}
        navTarget={null}
        onFieldClick={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Langstreckensensoren liefern keine verwertbaren Daten'),
    ).toBeTruthy();
  });

  it('includes field effect descriptions in the tooltip', () => {
    const localMap = systemMap(201);
    localMap.fields[0].effects = ['SHIELD_MALFUNCTION'];

    render(
      <LssMap localMap={localMap} navTarget={null} onFieldClick={vi.fn()} />,
    );

    expect(screen.getByRole('button').getAttribute('aria-label')).toContain(
      'Störung der Schildemitter',
    );
  });
  it.each([
    ['planet', 201, 1],
    ['moon', 203, 2],
    ['asteroid', 701, 3],
  ])('renders a %s over an overlapping star tile', (_, classId, objectType) => {
    render(
      <LssMap
        localMap={systemMap(classId, objectType)}
        navTarget={null}
        onFieldClick={vi.fn()}
      />,
    );

    const field = screen.getByRole('button', { name: /Feld 1,14/ });
    expect(field.querySelector('img')?.getAttribute('src')).toBe(
      `/planet-${classId}.png`,
    );
  });

  it('renders the colonizable marker with the celestial object', () => {
    render(
      <LssMap
        localMap={systemMap(201, 1, true)}
        navTarget={null}
        onFieldClick={vi.fn()}
      />,
    );

    const field = screen.getByRole('button', { name: /Feld 1,14/ });
    expect(field.textContent).toContain('K');
  });

  it('renders the celestial object and signature instead of an overlapping wreck', () => {
    const localMap = systemMap(201);
    localMap.wrecks = [{ id: 1, x: 1, y: 14, hull: 47 }];
    localMap.overlays = {
      signatures: [{ x: 1, y: 14, state: 'COUNT', count: 1 }],
    };

    render(
      <LssMap
        localMap={localMap}
        navTarget={null}
        onFieldClick={vi.fn()}
      />,
    );

    const field = screen.getByRole('button', { name: /Feld 1,14/ });
    expect(field.querySelector('img')?.getAttribute('src')).toBe(
      '/planet-201.png',
    );
    expect(field.textContent).toBe('1');
    expect(field.textContent).not.toContain('✹');
  });

  it('keeps the star tile for a star object', () => {
    render(
      <LssMap
        localMap={systemMap(9001)}
        navTarget={null}
        onFieldClick={vi.fn()}
      />,
    );

    const field = screen.getByRole('button', { name: /Feld 1,14/ });
    expect(field.querySelector('img')?.getAttribute('src')).toMatch(
      /^\/star-\d+\.png$/,
    );
  });

  it('marks supplied cartography points on system fields', () => {
    render(
      <LssMap
        localMap={systemMap(201)}
        navTarget={null}
        cartographyPoints={[{ x: 1, y: 14 }]}
        onFieldClick={vi.fn()}
      />,
    );

    const field = screen.getByRole('button', {
      name: /Feld 1,14.*verbleibender Messpunkt/,
    });
    expect(field.className).toContain('ring-red-400/70');
  });

  it('does not mark unmatched system fields', () => {
    render(
      <LssMap
        localMap={systemMap(201)}
        navTarget={null}
        cartographyPoints={[{ x: 2, y: 14 }]}
        onFieldClick={vi.fn()}
      />,
    );

    const field = screen.getByRole('button', { name: /Feld 1,14/ });
    expect(field.className).not.toContain('ring-red-400/70');
    expect(field.getAttribute('aria-label')).not.toContain('Messpunkt');
  });
});
