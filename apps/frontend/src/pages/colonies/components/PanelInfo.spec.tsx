import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ColonyEnvironmentScanDto } from '@swuniverse/shared';
import { MemoryRouter } from 'react-router-dom';

import type { Colony, ColonyDetailV2 } from '../types';
import { PanelInfo } from './PanelInfo';

const colony = {
  id: 1,
  name: 'Testkolonie',
  energy: 20,
  energyMax: 40,
  population: 12,
  populationMax: 30,
  storageUsed: 4,
  storageMax: 20,
  posX: 2,
  posY: 2,
  celestialObject: {
    name: 'Testwelt',
    description: null,
    classId: 201,
  },
  starSystem: {
    id: 7,
    name: 'Testsystem',
    cx: 3,
    cy: 4,
    systemTypeId: 1,
    systemTypeName: 'Gelber Stern',
    maxX: 4,
    maxY: 4,
  },
  storage: [{ id: 1, commodityId: 1, amount: 4 }],
} satisfies Colony;

const detail = {
  population: {
    current: 12,
    max: 30,
    growth: 1,
    workers: 5,
    available: 7,
    housing: 30,
    housingFree: 18,
    housingMax: 30,
  },
  productionDeltas: [
    { commodityId: 1, name: 'Erz', nameShort: 'ERZ', amount: 3 },
    {
      commodityId: 1001,
      name: 'Ausbildungsgrad',
      nameShort: 'AUS',
      amount: 2,
    },
  ],
  orbitShips: [
    {
      id: 7,
      name: 'Eigenes Schiff',
      shipClassId: 101,
      status: 'ACTIVE',
      hull: 80,
      hullMax: 100,
      shields: 40,
      shieldsMax: 50,
      energy: 30,
      energyMax: 60,
      crew: 4,
      crewRequired: 3,
      crewMax: 6,
      hasEnoughCrew: true,
      canManage: true,
    },
    {
      id: 8,
      name: 'Zweites Schiff',
      shipClassId: 102,
      status: 'ACTIVE',
      hull: 70,
      hullMax: 100,
      shields: 20,
      shieldsMax: 50,
      energy: 10,
      energyMax: 60,
      crew: 2,
      crewRequired: 2,
      crewMax: 5,
      hasEnoughCrew: true,
      canManage: false,
    },
  ],
  eventSummary: {
    unreadCount: 1,
    latest: [
      {
        id: 3,
        type: 'BUILDING_FINISHED',
        severity: 'INFO',
        title: 'Bau abgeschlossen',
        message: 'Das Gebäude ist bereit.',
        createdAt: '2026-09-24T12:00:00.000Z',
      },
    ],
  },
} as ColonyDetailV2;

const environmentScan = {
  bounds: { minX: 1, maxX: 3, minY: 1, maxY: 3 },
  fields: [
    {
      x: 2,
      y: 2,
      fieldTypeId: 1,
      fieldTypeName: 'Leerer Raum',
      celestialObject: {
        id: 21,
        objectType: 1,
        name: 'Testwelt',
        classId: 201,
      },
    },
  ],
  signatures: [
    {
      x: 2,
      y: 2,
      visibleCount: 2,
      shipId: 4711,
      shipName: 'Geheime Korvette',
    },
  ],
  fadedSignatures: { uncloaked: 0, cloaked: 0 },
  colonyShields: [{ colonyId: 1, x: 2, y: 2, shielded: true }],
  anomalies: [],
} satisfies ColonyEnvironmentScanDto & {
  signatures: Array<
    ColonyEnvironmentScanDto['signatures'][number] & {
      shipId: number;
      shipName: string;
    }
  >;
};

const eventProps = {
  initialEvents: detail.eventSummary!.latest,
  onLoadEvents: vi.fn().mockResolvedValue(detail.eventSummary!.latest),
  onMarkRead: vi.fn(),
  onMarkAllRead: vi.fn(),
};

describe('PanelInfo', () => {
  it('renders the STU information hierarchy and opens orbit management', () => {
    const onOpenOrbitManagement = vi.fn();

    render(
      <MemoryRouter>
        <PanelInfo
          colony={colony}
          detail={detail}
          environmentScan={environmentScan}
          environmentScanError={null}
          onOpenOrbitManagement={onOpenOrbitManagement}
          eventProps={eventProps}
        />
      </MemoryRouter>,
    );

    const sections = screen
      .getAllByRole('heading')
      .map((node) => node.textContent);
    expect(sections.indexOf('Orbitalmanagement')).toBeLessThan(
      sections.indexOf('Planet'),
    );
    expect(
      screen.getByText('Eigenes Schiff').closest('a')?.getAttribute('href'),
    ).toBe('/spacecraft/7');
    expect(screen.queryByText('Zweites Schiff')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Schiffsliste aufklappen' }),
    );
    expect(screen.getByText('Zweites Schiff').closest('a')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Orbitalmanagement' }),
    ).toBeTruthy();
    expect(screen.getByText('Umgebungsscan')).toBeTruthy();
    expect(screen.getByText('Sternensystem')).toBeTruthy();
    expect(screen.getByText('Bevölkerung')).toBeTruthy();
    expect(screen.getByText('Effekte')).toBeTruthy();
    expect(screen.getByText('Ereignisse')).toBeTruthy();
    const sectionHeadings = [
      'Orbitalmanagement',
      'Planet',
      'Schiffe im Orbit',
      'Umgebungsscan',
      'Sternensystem',
      'Bevölkerung',
      'Effekte',
      'Ereignisse',
    ].map((heading) => screen.getByRole('heading', { name: heading }));
    for (let index = 1; index < sectionHeadings.length; index += 1) {
      expect(
        sectionHeadings[index - 1].compareDocumentPosition(
          sectionHeadings[index],
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(screen.getByText('X 1')).toBeTruthy();
    expect(screen.getByText('X 3')).toBeTruthy();
    expect(screen.getByText('Y 1')).toBeTruthy();
    expect(screen.getByText('Y 3')).toBeTruthy();
    const scan = screen.getByRole('heading', {
      name: 'Umgebungsscan',
    }).parentElement;
    expect(scan).toBeTruthy();
    expect(scan?.textContent).not.toContain('Geheime Korvette');
    expect(scan?.textContent).not.toContain('4711');
    const scanCellNames = within(scan as HTMLElement)
      .getAllByLabelText(/^\d+\|\d+:/)
      .map((cell) => cell.getAttribute('aria-label'));
    expect(scanCellNames).toContain(
      '2|2: Testwelt, 2 Signaturen, Kolonieschild',
    );
    expect(scanCellNames.join(' ')).not.toContain('Geheime Korvette');
    expect(scanCellNames.join(' ')).not.toContain('4711');
    fireEvent.click(screen.getByRole('button', { name: 'Orbitalmanagement' }));
    expect(onOpenOrbitManagement).toHaveBeenCalledOnce();
  });

  it('keeps colony information visible when the local scan fails', () => {
    render(
      <MemoryRouter>
        <PanelInfo
          colony={colony}
          detail={detail}
          environmentScan={null}
          environmentScanError="Umgebungsscan nicht verfügbar"
          onOpenOrbitManagement={vi.fn()}
          eventProps={eventProps}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Planet')).toBeTruthy();
    expect(screen.getByText('Bevölkerung')).toBeTruthy();
    expect(screen.getByText('Effekte')).toBeTruthy();
    expect(screen.getByText('Ereignisse')).toBeTruthy();
    const scan = screen.getByText('Umgebungsscan').closest('section');
    expect(scan).toBeTruthy();
    expect(screen.getByText('Umgebungsscan nicht verfügbar')).toBeTruthy();
    expect(scan?.textContent).toContain('Umgebungsscan nicht verfügbar');
  });

  it('never links a foreign first orbit ship', () => {
    render(
      <MemoryRouter>
        <PanelInfo
          colony={colony}
          detail={{
            ...detail,
            orbitShips: [
              {
                ...detail.orbitShips[0],
                name: 'Fremdes Schiff',
                canManage: false,
              },
            ],
          }}
          environmentScan={environmentScan}
          environmentScanError={null}
          onOpenOrbitManagement={vi.fn()}
          eventProps={eventProps}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Fremdes Schiff').closest('a')).toBeNull();
  });

  it('collapses the expanded ship list when the colony changes', () => {
    const { rerender } = render(
      <MemoryRouter>
        <PanelInfo
          colony={colony}
          detail={detail}
          environmentScan={environmentScan}
          environmentScanError={null}
          onOpenOrbitManagement={vi.fn()}
          eventProps={eventProps}
        />
      </MemoryRouter>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Schiffsliste aufklappen' }),
    );
    expect(screen.getByText('Zweites Schiff')).toBeTruthy();

    rerender(
      <MemoryRouter>
        <PanelInfo
          colony={{ ...colony, id: 2 }}
          detail={detail}
          environmentScan={environmentScan}
          environmentScanError={null}
          onOpenOrbitManagement={vi.fn()}
          eventProps={eventProps}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Zweites Schiff')).toBeNull();
  });

  it('retains planetary defense, asteroid exhaustion, and deposits without a standalone shield section', () => {
    const retainedDetail = {
      ...detail,
      defense: {
        shields: { current: 25, max: 100, frequency: null },
        activeFunctionIds: [],
        energyPhalanx: false,
        particlePhalanx: false,
        antiParticle: false,
        torpedoTypeId: null,
      },
      planetaryDefense: [
        {
          fieldIndex: 7,
          buildingId: 70,
          buildingName: 'Abwehranlage',
          functionId: 24,
          functionName: 'Phalanx',
        },
      ],
      asteroidExhausted: true,
      deposits: [
        {
          commodityId: 9,
          name: 'Kristall',
          nameShort: 'KRI',
          amountLeft: 40,
          delta: -2,
          depleted: false,
        },
      ],
    } satisfies ColonyDetailV2;

    render(
      <MemoryRouter>
        <PanelInfo
          colony={{
            ...colony,
            celestialObject: { ...colony.celestialObject, objectType: 3 },
          }}
          detail={retainedDetail}
          environmentScan={environmentScan}
          environmentScanError={null}
          onOpenOrbitManagement={vi.fn()}
          eventProps={eventProps}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('heading', { name: 'Schilde' })).toBeNull();
    expect(
      screen.getByRole('heading', { name: 'Planetare Verteidigung' }),
    ).toBeTruthy();
    expect(screen.getByText('Feld 7: Abwehranlage')).toBeTruthy();
    expect(screen.getByText(/vollständig erschöpft/)).toBeTruthy();
    expect(
      screen.getByRole('heading', {
        name: 'Asteroidenlagerstätten · accountgebunden',
      }),
    ).toBeTruthy();
    expect(screen.getByText('Kristall')).toBeTruthy();
    expect(screen.getByText('-2')).toBeTruthy();
    const effects = screen.getByRole('heading', {
      name: 'Effekte',
    }).parentElement;
    expect(effects?.textContent).toContain('Ausbildungsgrad+2');
  });
});
