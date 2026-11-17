import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SpacecraftPage } from './spacecraft';
import { SpacecraftDetailPage } from './spacecraft-detail';
import { StarmapPage } from './starmap';
import { MessagesPage } from './messages';
import { HolonetComposePage, HolonetPage } from './holonet';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));
const tutorialMocks = vi.hoisted(() => ({ event: vi.fn() }));
vi.mock('../services/api', () => ({ api: apiMocks, ApiError: class ApiError extends Error {} }));
vi.mock('../components/tutorial/useTutorial', () => ({ tutorialEvent: tutorialMocks.event }));
vi.mock('../hooks/use-socket', () => ({ useSocket: vi.fn() }));
vi.mock('../lib/assets', () => ({
  shipImage: () => '/ship.png',
  alertStateImage: (state: string) => `/alert-${state}.png`,
  commodityImage: () => '/commodity.png',
  planetThumbnail: () => '/planet.png',
  spaceBackgroundTile: () => '/space.png',
  starTileImage: () => '/star.png',
  systemTypeImage: () => '/system.png',
  shipCursorImage: () => null,
}));
vi.mock('../components/Toast', () => ({ useToast: () => ({ info: vi.fn(), error: vi.fn() }) }));
vi.mock('../components/spacecraft/LssMap', () => ({
  LssMap: ({ onFieldClick }: { onFieldClick?: (x: number, y: number) => void }) => <div><button type="button" onClick={() => onFieldClick?.(6, 6)}>Ziel wählen</button></div>,
}));
vi.mock('../components/starmap/StarmapCanvas', async () => {
  const { forwardRef, useImperativeHandle } = await import('react');
  return {
    StarmapCanvas: forwardRef(function StarmapCanvasMock({ worldOverlay }: { worldOverlay?: React.ReactNode }, ref) {
      useImperativeHandle(ref, () => ({ zoomIn: vi.fn(), zoomOut: vi.fn(), fitView: vi.fn(), openSystem: vi.fn() }));
      return <div data-testid="starmap-canvas">{worldOverlay}</div>;
    }),
  };
});

const ship = {
  id: 2, name: 'Falke', shipClassId: 7, shipClassName: 'Korvette', status: 'IDLE',
  alertState: 'GREEN', hull: 90, hullMax: 100, shields: 40, shieldsMax: 50,
  energy: 70, energyMax: 100, reactorOutput: 12, warpdrive: 8, warpdriveMax: 20,
  battery: 5, batteryMax: 10, warpSpeed: 2, crew: 4,
  crewRequired: 2, crewMax: 8, cargoUsed: 0, cargoMax: 20, reactorWarpSplit: 30,
  reactorAutoCarryOver: false, runtimeSystems: {
    SHIELDS: { active: true, cooldown: 0, integrity: 100 },
    SHORT_RANGE_SENSORS: { active: true, cooldown: 0, integrity: 100 },
    LONG_RANGE_SENSORS: { active: true, cooldown: 0, integrity: 100 },
    WEAPONS: { active: false, cooldown: 0, integrity: 100 },
  },
  systems: {
    SHORT_RANGE_SENSORS: { present: true, active: true, damaged: false },
    LONG_RANGE_SENSORS: { present: true, active: true, damaged: false },
    WEAPONS: { present: true, active: false, damaged: false },
    TORPEDO_BANK: { present: false, active: false, damaged: false },
  },
  location: { scope: 'GALAXY' as const, layerId: 3, x: 5, y: 6 },
  navigationBounds: { minX: 1, maxX: 100, minY: 1, maxY: 100 },
  tractor: null,
};
const localMap = {
  mode: 'galaxy', shipX: 5, shipY: 6, sensorRange: 3, canEnterSystem: false,
  canLeaveSystem: false, fields: [
    { id: 1, cx: 5, cy: 6, fieldType: { id: 1, key: 'EMPTY_SPACE', name: 'Leerer Raum' }, starSystemId: null, starSystem: null },
    { id: 2, cx: 6, cy: 6, fieldType: { id: 1, key: 'EMPTY_SPACE', name: 'Leerer Raum' }, starSystemId: null, starSystem: null },
  ], ships: [],
};
const layers = [{ id: 3, name: 'Galaxis', width: 100, height: 100, sectorSize: 20 }, { id: 4, name: 'Randgebiete', width: 50, height: 50, sectorSize: 10 }];

function expectTargets(keys: string[]) {
  for (const key of keys) {
    const targets = Array.from(document.querySelectorAll('[data-tutorial]'));
    expect(targets.some((target) => target.getAttribute('data-tutorial')?.split(/\\s+/).includes(key)), key).toBe(true);
  }
}

beforeEach(() => {
  apiMocks.get.mockReset();
  apiMocks.post.mockReset();
  apiMocks.patch.mockReset();
  apiMocks.put.mockReset();
  apiMocks.delete.mockReset();
  tutorialMocks.event.mockReset().mockResolvedValue(undefined);
  apiMocks.get.mockImplementation((path: string) => {
    if (path === '/spacecraft') return Promise.resolve([{ ...ship, layer: { id: 3, name: 'Normalraum' }, kind: 'SHIP', specialStatus: 'STANDBY', energyGain: 1, energyConsumption: 1, reactorUsage: 2, warpdriveGain: 1, reactorFuel: 1, reactorFuelMax: 2, fleetId: null, dockedAtId: null, shieldsActive: true, shieldRegeneration: 0, crewRequired: 2, systems: { SHORT_RANGE_SENSORS: { present: true, active: true, damaged: false }, LONG_RANGE_SENSORS: { present: true, active: true, damaged: false }, WEAPONS: { present: true, active: false, damaged: false }, TORPEDO_BANK: { present: false, active: false, damaged: false } } }]);
    if (path === '/spacecraft/2') return Promise.resolve(ship);
    if (path === '/spacecraft/2/local-map') return Promise.resolve({ ...localMap, fields: [...localMap.fields, { id: 3, cx: 6, cy: 6, fieldType: { id: 1, key: 'EMPTY_SPACE', name: 'Leerer Raum' }, starSystemId: null, starSystem: null }] });
    if (path === '/spacecraft/2/modules' || path === '/spacecraft/2/cargo') return Promise.resolve([]);
    if (path === '/spacecraft/2/torpedoes') return Promise.resolve(null);
    if (path === '/spacecraft/2/nearby') return Promise.resolve({ ships: [], escapePods: [], wrecks: [], actionsAvailable: true });
    if (path === '/spacecraft/2/field-context') return Promise.resolve({ coordinates: { x: 5, y: 6 }, region: null, adminRegion: null, information: {}, colony: null, actions: {} });
    if (path === '/spacecraft/2/energy-flow') return Promise.resolve({ effectiveEpsProduction: 3, totalSystemConsumption: 2, reactorOutput: 5 });
    if (path === '/starmap/layers') return Promise.resolve(layers);
    if (path.endsWith('/fields')) return Promise.resolve([]);
    if (path.endsWith('/hyperspace-routes') || path.endsWith('/wormholes')) return Promise.resolve([]);
    if (path.startsWith('/spacecraft/starmap-contacts')) return Promise.resolve({ layerId: 3, contacts: [], viewerAlliance: null });
    if (path === '/holonet' || path.startsWith('/holonet?')) return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
    if (path === '/holonet/unread') return Promise.resolve({ unreadCount: 0, lastReadPostId: null });
    if (path === '/holonet/categories') return Promise.resolve([]);
    if (path === '/messages/folders') return Promise.resolve([{ folder: 'PERSONAL', unread: 0, total: 0 }, { folder: 'OUTBOX', unread: 0, total: 0 }]);
    if (path === '/messages/folders/personal?page=1' || path === '/messages/folders/outbox?page=1') return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
    if (path === '/user/settings') return Promise.resolve({});
    if (path === '/rpg/plots/mine?page=1') return Promise.resolve({ data: [] });
    if (path === '/contacts') return Promise.resolve([]);
    if (path === '/contacts/received') return Promise.resolve([]);
    if (path === '/ignore-list') return Promise.resolve([]);
    if (path === '/ignore-list/ignored-by') return Promise.resolve([]);
    return Promise.resolve([]);
  });
  apiMocks.post.mockResolvedValue({});
  apiMocks.patch.mockResolvedValue({});
  apiMocks.put.mockResolvedValue({});
});

describe('tutorial targets', () => {
  it('renders targets for the spacecraft list and detail views', async () => {
    const list = render(<MemoryRouter><SpacecraftPage /></MemoryRouter>);
    await screen.findAllByText('Falke');
    expectTargets(['ship-list']);
    list.unmount();

    render(<MemoryRouter initialEntries={['/spacecraft/2']}><Routes><Route path="/spacecraft/:id" element={<SpacecraftDetailPage />} /></Routes></MemoryRouter>);
    await screen.findByText('Korvette');
    await waitFor(() => expectTargets(['ship-header', 'ship-systems', 'ship-alarm', 'ship-navigation', 'ship-nearby']));
  });

  it('dispatches the flight tutorial event only after a successful flight', async () => {
    apiMocks.get.mockImplementation((path: string) => {
      if (path === '/spacecraft/2') return Promise.resolve({ ...ship, runtimeSystems: { ...ship.runtimeSystems, LONG_RANGE_SENSORS: { active: true, cooldown: 0, integrity: 100 } } });
      if (path === '/spacecraft/2/local-map') return Promise.resolve({ ...localMap, fields: [...localMap.fields, { id: 3, cx: 6, cy: 6, fieldType: { id: 1, key: 'EMPTY_SPACE', name: 'Leerer Raum' }, starSystemId: null, starSystem: null }] });
      if (path === '/spacecraft/2/modules' || path === '/spacecraft/2/cargo') return Promise.resolve([]);
      if (path === '/spacecraft/2/torpedoes') return Promise.resolve(null);
      if (path === '/spacecraft/2/nearby') return Promise.resolve({ ships: [], escapePods: [], wrecks: [], actionsAvailable: true });
      if (path === '/spacecraft/2/field-context') return Promise.resolve({ coordinates: { x: 5, y: 6 }, region: null, adminRegion: null, information: {}, colony: null, actions: {} });
      if (path === '/spacecraft/2/energy-flow') return Promise.resolve({ effectiveEpsProduction: 3, totalSystemConsumption: 2, reactorOutput: 5 });
      return Promise.resolve([]);
    });
    render(<MemoryRouter initialEntries={['/spacecraft/2']}><Routes><Route path="/spacecraft/:id" element={<SpacecraftDetailPage />} /></Routes></MemoryRouter>);
    await screen.findByText('Korvette');
    await screen.findByText('Ziel wählen');
    fireEvent.click(screen.getByText('Ziel wählen'));
    await screen.findByRole('button', { name: 'Flug starten' });
    apiMocks.post.mockRejectedValueOnce(new Error('Flug fehlgeschlagen'));
    fireEvent.click(screen.getByRole('button', { name: 'Flug starten' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/fly', { targetX: 6, targetY: 6 }));
    expect(tutorialMocks.event).not.toHaveBeenCalledWith('spacecraft.flight.started');

    apiMocks.post.mockResolvedValueOnce({});
    fireEvent.click(screen.getByRole('button', { name: 'Flug starten' }));
    await waitFor(() => expect(tutorialMocks.event).toHaveBeenCalledWith('spacecraft.flight.started'));
  });

  it('renders targets for the starmap view', async () => {
    render(<MemoryRouter><StarmapPage /></MemoryRouter>);
    await screen.findByTestId('starmap-canvas');
    expectTargets(['map-layer', 'map-view-controls', 'map-system-details', 'map-legend']);
    expect(screen.getByText('Legende')).toBeTruthy();
  });

  it('dispatches the message tutorial event only after a successful send', async () => {
    render(<MemoryRouter initialEntries={['/messages?tab=compose&to=2']}><MessagesPage /></MemoryRouter>);
    await screen.findByText('Betreff');
    apiMocks.post.mockRejectedValueOnce(new Error('Senden fehlgeschlagen'));
    fireEvent.click(screen.getByRole('button', { name: 'Senden' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/messages', { recipientId: 2, subject: '', body: '' }));
    expect(tutorialMocks.event).not.toHaveBeenCalledWith('messages.sent');

    apiMocks.post.mockResolvedValueOnce({});
    fireEvent.click(screen.getByRole('button', { name: 'Senden' }));
    await waitFor(() => expect(tutorialMocks.event).toHaveBeenCalledWith('messages.sent'));
  });

  it('renders folder and compose targets for messages', async () => {
    const inbox = render(<MemoryRouter><MessagesPage /></MemoryRouter>);
    await screen.findByText('Nachrichten');
    expectTargets(['message-folders']);
    inbox.unmount();

    render(<MemoryRouter initialEntries={['/messages?tab=compose&to=2']}><MessagesPage /></MemoryRouter>);
    await screen.findByText('Betreff');
    expectTargets(['message-compose', 'message-send']);
  });

  it('dispatches the HoloNet tutorial event only after a successful publish', async () => {
    render(<MemoryRouter initialEntries={['/holonet/new']}><Routes><Route path="/holonet/new" element={<HolonetComposePage />} /><Route path="/holonet/:id" element={<div>created</div>} /></Routes></MemoryRouter>);
    await screen.findByText('/ HoloNet / Beitrag schreiben');
    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Meldung' } });
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'Inhalt' } });
    const postResponse: { resolve?: (post: { id: number }) => void } = {};
    apiMocks.post.mockImplementationOnce(() => new Promise((resolve) => {
      postResponse.resolve = resolve;
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/holonet', { title: 'Meldung', body: 'Inhalt', category: 'NEWS' }));
    expect(tutorialMocks.event).not.toHaveBeenCalledWith('holonet.post.created');

    postResponse.resolve?.({ id: 99 });
    await waitFor(() => expect(tutorialMocks.event).toHaveBeenCalledWith('holonet.post.created'));
  });

  it('renders archive and compose targets for HoloNet', async () => {
    const archive = render(<MemoryRouter initialEntries={['/holonet']}><Routes><Route path="/holonet" element={<HolonetPage />} /></Routes></MemoryRouter>);
    await screen.findByText('/ HoloNet / Archiv');
    expectTargets(['holonet-archive']);
    archive.unmount();

    render(<MemoryRouter initialEntries={['/holonet/new']}><Routes><Route path="/holonet/new" element={<HolonetComposePage />} /></Routes></MemoryRouter>);
    await screen.findByText('/ HoloNet / Beitrag schreiben');
    expect(document.querySelector('[data-tutorial="holonet-compose"]')).toBeTruthy();
    expect(document.querySelector('[data-tutorial="holonet-publish"]')).toBeTruthy();
  });
});
