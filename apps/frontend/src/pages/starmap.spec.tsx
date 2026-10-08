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
    StarmapCanvas: forwardRef<unknown, { worldOverlay?: ReactNode }>(
      function StarmapCanvasMock({ worldOverlay }, _ref) {
        return <div data-testid="starmap-canvas">{worldOverlay}</div>;
      },
    ),
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

let contactsByLayer: Record<number, StarmapContactDto[]>;

function mockApi() {
  apiMocks.get.mockImplementation((path: string) => {
    if (path === '/starmap/layers') return Promise.resolve(layers);
    const contacts = path.match(/^\/spacecraft\/starmap-contacts\?layerId=(\d+)$/);
    if (contacts) {
      const layerId = Number(contacts[1]);
      return Promise.resolve({
        layerId,
        allianceContactsActive: false,
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
    expect(within(panel).getByText('System 7 · 12|13')).toBeTruthy();
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
});
