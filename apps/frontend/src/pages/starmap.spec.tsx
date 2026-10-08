import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  WsEventType,
  type StarmapContactDto,
  type StarmapContactsDto,
} from '@swuniverse/shared';
import { StarmapPage } from './starmap';

const apiMocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../services/api', () => ({ api: apiMocks }));

const socketHandlers = vi.hoisted(
  () => new Map<string, (payload: unknown) => void>(),
);
vi.mock('../hooks/use-socket', () => ({
  useSocket: (event: string, handler: (payload: unknown) => void) => {
    socketHandlers.set(event, handler);
  },
}));

// Pixi cannot render in jsdom; the canvas only has to host the DOM overlay.
vi.mock('../components/starmap/StarmapCanvas', async () => {
  const { forwardRef } = await import('react');
  return {
    StarmapCanvas: forwardRef<
      unknown,
      {
        worldOverlay?: ReactNode;
        onInlineSystemsVisibleChange?: (visible: boolean) => void;
      }
    >(function StarmapCanvasMock(
      { worldOverlay, onInlineSystemsVisibleChange },
      ref,
    ) {
      void ref;
      return (
        <div data-testid="starmap-canvas">
          <button
            type="button"
            onClick={() => onInlineSystemsVisibleChange?.(true)}
          >
            Test: Systemraster zoomen
          </button>
          <button
            type="button"
            onClick={() => onInlineSystemsVisibleChange?.(false)}
          >
            Test: Galaxie zoomen
          </button>
          {worldOverlay}
        </div>
      );
    }),
  };
});

const layers = [
  { id: 3, name: 'Galaxis', width: 100, height: 100, sectorSize: 20 },
  { id: 4, name: 'Unbekannte Regionen', width: 50, height: 50, sectorSize: 10 },
];

function ownContact(overrides: Partial<StarmapContactDto> = {}): StarmapContactDto {
  return {
    spacecraftId: 10,
    spacecraftName: 'Falke',
    shipClassId: 100,
    ownerId: 1,
    ownerName: 'Viewer',
    location: { scope: 'GALAXY', locationId: 1000, layerId: 3, x: 4, y: 5 },
    galaxyCell: { layerId: 3, x: 4, y: 5 },
    reason: 'OWN',
    management: {
      status: 'IDLE',
      alertState: 'YELLOW',
      hull: 80,
      hullMax: 120,
      crew: 9,
      crewMax: 12,
    },
    ...overrides,
  };
}

function allianceContact(
  overrides: Partial<StarmapContactDto> = {},
): StarmapContactDto {
  return {
    spacecraftId: 30,
    spacecraftName: 'Kranich',
    shipClassId: 100,
    ownerId: 2,
    ownerName: 'Mate',
    location: { scope: 'GALAXY', locationId: 3000, layerId: 3, x: 8, y: 9 },
    galaxyCell: { layerId: 3, x: 8, y: 9 },
    reason: 'ALLIANCE',
    stance: 'FRIEND',
    alliance: { id: 5, name: 'Rote Schwadron', color: '#ff8800' },
    ...overrides,
  };
}

let contactsByLayer: Record<number, StarmapContactDto[]>;
let allianceContactsActive: boolean;

const kessel = {
  id: 7,
  name: 'Kessel',
  cx: 40,
  cy: 41,
  maxX: 20,
  maxY: 20,
  systemTypeId: 1,
};

const layerThreeFields = [
  {
    id: 500,
    cx: 40,
    cy: 41,
    fieldTypeId: 1,
    systemTypeId: 1,
    factionZone: 'NEUTRAL',
    adminRegionKey: null,
    starSystemId: 7,
    regionId: null,
    borderTypeId: null,
    effects: null,
    passableOverride: null,
    fieldType: { key: 'EMPTY_SPACE' },
    starSystem: kessel,
  },
];

function mockApi() {
  apiMocks.get.mockImplementation((path: string) => {
    if (path === '/starmap/layers') return Promise.resolve(layers);
    if (path === '/starmap/layers/3/fields') return Promise.resolve(layerThreeFields);
    if (path === '/starmap/systems/7/grid') {
      return Promise.resolve({ system: kessel, fields: [], celestialObjects: [] });
    }
    const contacts = path.match(/^\/spacecraft\/starmap-contacts\?layerId=(\d+)$/);
    if (contacts) {
      const layerId = Number(contacts[1]);
      return Promise.resolve({
        layerId,
        allianceContactsActive,
        contacts: contactsByLayer[layerId] ?? [],
      } satisfies StarmapContactsDto);
    }
    return Promise.resolve([]);
  });
}

const contactRequests = () =>
  apiMocks.get.mock.calls.filter(([path]) =>
    String(path).startsWith('/spacecraft/starmap-contacts'),
  );

function renderPage() {
  return render(
    <MemoryRouter>
      <StarmapPage />
    </MemoryRouter>,
  );
}

describe('StarmapPage ship layer', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    socketHandlers.clear();
    allianceContactsActive = false;
    contactsByLayer = {
      3: [
        ownContact(),
        ownContact({
          spacecraftId: 11,
          spacecraftName: 'Adler',
          location: { scope: 'SYSTEM', locationId: 1100, systemId: 7, x: 12, y: 13 },
          galaxyCell: { layerId: 3, x: 40, y: 41 },
        }),
        ownContact({
          spacecraftId: 12,
          spacecraftName: 'Sperber',
          location: { scope: 'SYSTEM', locationId: 1200, systemId: 7, x: 2, y: 2 },
          galaxyCell: { layerId: 3, x: 40, y: 41 },
        }),
      ],
      4: [
        ownContact({
          spacecraftId: 20,
          spacecraftName: 'Rabe',
          location: { scope: 'GALAXY', locationId: 2000, layerId: 4, x: 7, y: 8 },
          galaxyCell: { layerId: 4, x: 7, y: 8 },
        }),
      ],
    };
    mockApi();
  });

  it('loads the contacts of the displayed layer and draws a marker per cell', async () => {
    renderPage();

    expect(
      await screen.findByRole('button', { name: 'Schiff Falke bei 4|5' }),
    ).toBeTruthy();
    expect(contactRequests()).toEqual([
      ['/spacecraft/starmap-contacts?layerId=3'],
    ]);
  });

  it('bundles contacts on the same galaxy cell into one marker with a count', async () => {
    renderPage();

    const bundle = await screen.findByRole('button', {
      name: '2 Schiffe bei 40|41',
    });
    expect(within(bundle).getByText('2')).toBeTruthy();
  });

  it('shows the delivered data of a selected own ship with a link to the ship view', async () => {
    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Schiff Falke bei 4|5' }),
    );

    const panel = screen.getByRole('region', { name: 'Schiffe auf Feld 4|5' });
    expect(within(panel).getByText('Eigenes Schiff')).toBeTruthy();
    expect(within(panel).getByText('Viewer')).toBeTruthy();
    expect(within(panel).getByText('Alarmstufe Gelb')).toBeTruthy();
    expect(within(panel).getByText('Hülle 80/120')).toBeTruthy();
    expect(within(panel).getByText('Crew 9/12')).toBeTruthy();
    expect(
      within(panel).getByRole('link', { name: 'Falke' }).getAttribute('href'),
    ).toBe('/spacecraft/10');
  });

  it('lists every ship of a selected bundle', async () => {
    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: '2 Schiffe bei 40|41' }),
    );

    const panel = screen.getByRole('region', { name: 'Schiffe auf Feld 40|41' });
    expect(within(panel).getByRole('link', { name: 'Adler' })).toBeTruthy();
    expect(within(panel).getByRole('link', { name: 'Sperber' })).toBeTruthy();
    expect(within(panel).getByText('Kessel · 12|13')).toBeTruthy();
  });

  it('hides the ship layer with the control panel switch', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Schiff Falke bei 4|5' });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Schiffe' }));

    expect(
      screen.queryByRole('button', { name: 'Schiff Falke bei 4|5' }),
    ).toBeNull();
  });

  it('does not offer alliance or partner switches while alliance contacts are inactive', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Schiff Falke bei 4|5' });

    expect(screen.queryByRole('checkbox', { name: 'Allianzschiffe' })).toBeNull();
    expect(screen.queryByRole('checkbox', { name: 'Partnerschiffe' })).toBeNull();
  });

  it('reloads the contacts when the layer changes', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Schiff Falke bei 4|5' });

    fireEvent.change(screen.getByRole('combobox', { name: 'Kartenebene' }), {
      target: { value: '4' },
    });

    expect(
      await screen.findByRole('button', { name: 'Schiff Rabe bei 7|8' }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Schiff Falke bei 4|5' }),
    ).toBeNull();
    expect(contactRequests().at(-1)).toEqual([
      '/spacecraft/starmap-contacts?layerId=4',
    ]);
  });

  it.each([WsEventType.SHIP_MOVED, WsEventType.SPACECRAFT_EVENT])(
    'reloads the contacts on the existing %s socket event',
    async (event) => {
      renderPage();
      await screen.findByRole('button', { name: 'Schiff Falke bei 4|5' });
      contactsByLayer[3] = [
        ownContact({
          location: { scope: 'GALAXY', locationId: 1001, layerId: 3, x: 6, y: 5 },
          galaxyCell: { layerId: 3, x: 6, y: 5 },
        }),
      ];

      await act(async () => {
        socketHandlers.get(event)?.({ shipId: 10 });
      });

      expect(
        await screen.findByRole('button', { name: 'Schiff Falke bei 6|5' }),
      ).toBeTruthy();
    },
  );

  it('reloads the contacts every 30 seconds while the page is visible', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderPage();
      await screen.findByRole('button', { name: 'Schiff Falke bei 4|5' });
      const before = contactRequests().length;

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(contactRequests().length).toBe(before + 1);

      const visibility = vi
        .spyOn(document, 'visibilityState', 'get')
        .mockReturnValue('hidden');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(contactRequests().length).toBe(before + 1);
      visibility.mockRestore();
    } finally {
      vi.useRealTimers();
    }
  });

  describe('alliance ships', () => {
    beforeEach(() => {
      allianceContactsActive = true;
      contactsByLayer[3] = [
        ownContact(),
        allianceContact(),
        allianceContact({
          spacecraftId: 31,
          spacecraftName: 'Reiher',
          location: { scope: 'GALAXY', locationId: 3100, layerId: 3, x: 9, y: 9 },
          galaxyCell: { layerId: 3, x: 9, y: 9 },
          stance: 'NEUTRAL',
          alliance: { id: 6, name: 'Graue Staffel', color: null },
        }),
      ];
    });

    it('distinguishes alliance markers from own markers and names the stance', async () => {
      renderPage();

      const own = await screen.findByRole('button', {
        name: 'Schiff Falke bei 4|5',
      });
      const ally = screen.getByRole('button', {
        name: 'Schiff Kranich bei 8|9 (Allianzschiff, Freund)',
      });
      expect(own.getAttribute('data-reason')).toBe('OWN');
      expect(ally.getAttribute('data-reason')).toBe('ALLIANCE');
      expect(ally.getAttribute('data-stance')).toBe('FRIEND');
      expect(within(ally).getByText('+')).toBeTruthy();
      expect(
        within(
          screen.getByRole('button', {
            name: 'Schiff Reiher bei 9|9 (Allianzschiff, Neutral)',
          }),
        ).getByText('○'),
      ).toBeTruthy();
    });

    it('paints alliance markers in the alliance color or the default alliance color', async () => {
      renderPage();

      const colored = await screen.findByRole('button', {
        name: /^Schiff Kranich/,
      });
      const uncolored = screen.getByRole('button', { name: /^Schiff Reiher/ });
      const own = screen.getByRole('button', { name: 'Schiff Falke bei 4|5' });
      expect(colored.style.backgroundColor).toBe('rgb(255, 136, 0)');
      expect(uncolored.style.backgroundColor).toBe('rgb(167, 139, 250)');
      expect(own.style.backgroundColor).not.toBe(
        uncolored.style.backgroundColor,
      );
    });

    it('shows only base data of a selected alliance ship and offers no actions', async () => {
      renderPage();

      fireEvent.click(
        await screen.findByRole('button', { name: /^Schiff Kranich/ }),
      );

      const panel = screen.getByRole('region', { name: 'Schiffe auf Feld 8|9' });
      expect(within(panel).getByText('Kranich')).toBeTruthy();
      expect(within(panel).getByText('Allianzschiff · Freund')).toBeTruthy();
      expect(within(panel).getByText('Mate')).toBeTruthy();
      expect(within(panel).getByText('Rote Schwadron')).toBeTruthy();
      expect(within(panel).queryByText(/Hülle|Crew|Alarmstufe/)).toBeNull();
      expect(within(panel).queryByRole('link')).toBeNull();
      expect(
        within(panel)
          .getAllByRole('button')
          .map((button) => button.getAttribute('aria-label')),
      ).toEqual(['Auswahl schließen']);
    });

    it('hides alliance ships with their own switch while own ships stay', async () => {
      renderPage();
      await screen.findByRole('button', { name: /^Schiff Kranich/ });

      fireEvent.click(screen.getByRole('checkbox', { name: 'Allianzschiffe' }));

      expect(screen.queryByRole('button', { name: /^Schiff Kranich/ })).toBeNull();
      expect(
        screen.getByRole('button', { name: 'Schiff Falke bei 4|5' }),
      ).toBeTruthy();
    });
  });

  describe('partner ships', () => {
    const partnerContact = (
      overrides: Partial<StarmapContactDto> = {},
    ): StarmapContactDto => ({
      spacecraftId: 50,
      spacecraftName: 'Möwe',
      shipClassId: 100,
      ownerId: 5,
      ownerName: 'Partner',
      location: { scope: 'GALAXY', locationId: 5000, layerId: 3, x: 6, y: 7 },
      galaxyCell: { layerId: 3, x: 6, y: 7 },
      reason: 'SHARED_LIVE_POSITION',
      stance: 'NEUTRAL',
      ...overrides,
    });

    beforeEach(() => {
      allianceContactsActive = true;
      contactsByLayer[3] = [ownContact(), allianceContact(), partnerContact()];
    });

    it('marks partner ships as shared positions, distinct from own and alliance ships', async () => {
      renderPage();

      const partner = await screen.findByRole('button', {
        name: 'Schiff Möwe bei 6|7 (Geteilte Position, Neutral)',
      });
      const ally = screen.getByRole('button', { name: /^Schiff Kranich/ });
      const own = screen.getByRole('button', { name: 'Schiff Falke bei 4|5' });
      expect(partner.getAttribute('data-reason')).toBe('SHARED_LIVE_POSITION');
      expect(partner.getAttribute('data-stance')).toBe('NEUTRAL');
      expect(within(partner).getByText('○')).toBeTruthy();
      expect(partner.style.backgroundColor).not.toBe(own.style.backgroundColor);
      expect(partner.style.backgroundColor).not.toBe(ally.style.backgroundColor);
      expect(partner.style.borderStyle).toBe('dashed');
    });

    it('shows only base data of a selected partner ship', async () => {
      renderPage();

      fireEvent.click(await screen.findByRole('button', { name: /^Schiff Möwe/ }));

      const panel = screen.getByRole('region', { name: 'Schiffe auf Feld 6|7' });
      expect(within(panel).getByText('Möwe')).toBeTruthy();
      expect(
        within(panel).getByText('Geteilte Position · Neutral'),
      ).toBeTruthy();
      expect(within(panel).queryByText(/Hülle|Crew|Alarmstufe/)).toBeNull();
    });

    it('hides partner ships with their own switch while own and alliance ships stay', async () => {
      renderPage();
      await screen.findByRole('button', { name: /^Schiff Möwe/ });

      fireEvent.click(screen.getByRole('checkbox', { name: 'Partnerschiffe' }));

      expect(screen.queryByRole('button', { name: /^Schiff Möwe/ })).toBeNull();
      expect(screen.getByRole('button', { name: /^Schiff Kranich/ })).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Schiff Falke bei 4|5' }),
      ).toBeTruthy();
    });

    it('offers no partner switch while alliance contacts are inactive', async () => {
      allianceContactsActive = false;
      contactsByLayer[3] = [ownContact()];
      renderPage();

      await screen.findByRole('button', { name: 'Schiff Falke bei 4|5' });
      expect(
        screen.queryByRole('checkbox', { name: 'Partnerschiffe' }),
      ).toBeNull();
    });
  });

  describe('in the opened system grid', () => {
    const zoomIntoSystemGrid = async () => {
      await screen.findByRole('button', { name: '2 Schiffe bei 40|41' });
      fireEvent.click(
        screen.getByRole('button', { name: 'Test: Systemraster zoomen' }),
      );
    };
    const worldPosition = (marker: HTMLElement) => ({
      left: parseFloat(marker.style.left),
      top: parseFloat(marker.style.top),
    });

    it('places contacts with a system position at their system coordinates', async () => {
      renderPage();
      await zoomIntoSystemGrid();

      const adler = await screen.findByRole('button', {
        name: 'Schiff Adler bei Kessel 12|13',
      });
      const sperber = screen.getByRole('button', {
        name: 'Schiff Sperber bei Kessel 2|2',
      });
      expect(
        screen.queryByRole('button', { name: '2 Schiffe bei 40|41' }),
      ).toBeNull();
      // Both lie inside the system cell 40|41 (cell size 30 px) ...
      for (const marker of [adler, sperber]) {
        const { left, top } = worldPosition(marker);
        expect(left).toBeGreaterThan(39 * 30);
        expect(left).toBeLessThan(40 * 30);
        expect(top).toBeGreaterThan(40 * 30);
        expect(top).toBeLessThan(41 * 30);
      }
      // ... and Adler (12|13) lies right of and below Sperber (2|2).
      expect(worldPosition(adler).left).toBeGreaterThan(worldPosition(sperber).left);
      expect(worldPosition(adler).top).toBeGreaterThan(worldPosition(sperber).top);
      // Galaxy contacts stay on their galaxy cell.
      expect(
        screen.getByRole('button', { name: 'Schiff Falke bei 4|5' }),
      ).toBeTruthy();
    });

    it('bundles the same contacts at the system cell again on the galaxy map', async () => {
      renderPage();
      await zoomIntoSystemGrid();
      await screen.findByRole('button', { name: 'Schiff Adler bei Kessel 12|13' });

      fireEvent.click(screen.getByRole('button', { name: 'Test: Galaxie zoomen' }));

      expect(
        screen.getByRole('button', { name: '2 Schiffe bei 40|41' }),
      ).toBeTruthy();
      expect(
        screen.queryByRole('button', { name: 'Schiff Adler bei Kessel 12|13' }),
      ).toBeNull();
    });

    it('bundles contacts on the same system field with a count', async () => {
      contactsByLayer[3].push(
        ownContact({
          spacecraftId: 13,
          spacecraftName: 'Habicht',
          location: { scope: 'SYSTEM', locationId: 1100, systemId: 7, x: 12, y: 13 },
          galaxyCell: { layerId: 3, x: 40, y: 41 },
        }),
      );
      renderPage();
      await screen.findByRole('button', { name: '3 Schiffe bei 40|41' });
      fireEvent.click(
        screen.getByRole('button', { name: 'Test: Systemraster zoomen' }),
      );

      const bundle = screen.getByRole('button', {
        name: '2 Schiffe bei Kessel 12|13',
      });
      expect(within(bundle).getByText('2')).toBeTruthy();
    });

    it('keeps contacts of a system without a loaded grid at the system cell', async () => {
      contactsByLayer[3] = [
        ownContact({
          spacecraftId: 14,
          spacecraftName: 'Kranich',
          location: { scope: 'SYSTEM', locationId: 1400, systemId: 8, x: 3, y: 4 },
          galaxyCell: { layerId: 3, x: 60, y: 61 },
        }),
      ];
      renderPage();
      await screen.findByRole('button', { name: 'Schiff Kranich bei 60|61' });

      fireEvent.click(
        screen.getByRole('button', { name: 'Test: Systemraster zoomen' }),
      );

      expect(
        screen.getByRole('button', { name: 'Schiff Kranich bei 60|61' }),
      ).toBeTruthy();
    });

    it('opens the selection panel for a system marker and hides it with the switch', async () => {
      renderPage();
      await zoomIntoSystemGrid();

      fireEvent.click(
        await screen.findByRole('button', { name: 'Schiff Adler bei Kessel 12|13' }),
      );

      const panel = screen.getByRole('region', {
        name: 'Schiffe auf Feld Kessel 12|13',
      });
      expect(within(panel).getByRole('link', { name: 'Adler' })).toBeTruthy();
      expect(within(panel).getByText('Kessel · 12|13')).toBeTruthy();
      expect(within(panel).getByText('Hülle 80/120')).toBeTruthy();

      fireEvent.click(screen.getByRole('checkbox', { name: 'Schiffe' }));

      expect(
        screen.queryByRole('button', { name: 'Schiff Adler bei Kessel 12|13' }),
      ).toBeNull();
      expect(
        screen.queryByRole('region', { name: 'Schiffe auf Feld Kessel 12|13' }),
      ).toBeNull();
    });
  });
});
