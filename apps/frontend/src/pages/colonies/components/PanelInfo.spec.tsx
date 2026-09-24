import { fireEvent, render, screen } from '@testing-library/react';
import type { StarmapSystemGridDto } from '@swuniverse/shared';
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
      id: 9,
      name: 'Falke',
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

const systemGrid = {
  system: {
    id: 7,
    name: 'Testsystem',
    cx: 3,
    cy: 4,
    maxX: 4,
    maxY: 4,
    systemTypeId: 1,
    systemTypeName: 'Gelber Stern',
  },
  fields: [
    {
      id: 12,
      sx: 2,
      sy: 2,
      fieldTypeId: 1,
      celestialObjectId: 21,
      isPassable: true,
      energyCost: 1,
      damage: 0,
      effects: [],
      regionKey: null,
      adminRegionKey: null,
      influenceAreaId: null,
      borderMask: null,
      fieldType: {
        id: 1,
        key: 'EMPTY_SPACE',
        name: 'Leerer Raum',
        passable: true,
        energyCost: 1,
        damage: 0,
        isSystem: true,
        colorKey: null,
        category: null,
      },
      celestialObject: {
        id: 21,
        objectType: 1,
        name: 'Testwelt',
        description: null,
        posX: 2,
        posY: 2,
        classId: 201,
        isColonizable: true,
      },
    },
  ],
} satisfies StarmapSystemGridDto;

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
          systemGrid={systemGrid}
          systemGridError={null}
          onOpenOrbitManagement={onOpenOrbitManagement}
          eventProps={eventProps}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Schiffe im Orbit')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Orbitalmanagement' }),
    ).toBeTruthy();
    expect(screen.getByText('Umgebungsscan')).toBeTruthy();
    expect(screen.getByText('Sternensystem')).toBeTruthy();
    expect(screen.getByText('Bevölkerung')).toBeTruthy();
    expect(screen.getByText('Effekte')).toBeTruthy();
    expect(screen.getByText('Ereignisse')).toBeTruthy();
    const sectionHeadings = [
      'Schiffe im Orbit',
      'Planet',
      'Umgebungsscan',
      'Sternensystem',
      'Bevölkerung',
      'Effekte',
      'Ereignisse',
    ].map((heading) => screen.getByText(heading));
    for (let index = 1; index < sectionHeadings.length; index += 1) {
      expect(
        sectionHeadings[index - 1].compareDocumentPosition(
          sectionHeadings[index],
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(screen.queryAllByLabelText(/^0\|/)).toHaveLength(0);
    expect(screen.queryAllByLabelText(/\|0:/)).toHaveLength(0);
    expect(screen.getByLabelText('1|1: Nicht verfügbar')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Orbitalmanagement' }));
    expect(onOpenOrbitManagement).toHaveBeenCalledOnce();
  });

  it('keeps colony information visible when the local scan fails', () => {
    render(
      <MemoryRouter>
        <PanelInfo
          colony={colony}
          detail={detail}
          systemGrid={null}
          systemGridError="Umgebungsscan nicht verfügbar"
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

  it('retains shields, planetary defense, asteroid exhaustion, and deposits', () => {
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
          systemGrid={systemGrid}
          systemGridError={null}
          onOpenOrbitManagement={vi.fn()}
          eventProps={eventProps}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Schilde' })).toBeTruthy();
    expect(screen.getByText('25/100')).toBeTruthy();
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
