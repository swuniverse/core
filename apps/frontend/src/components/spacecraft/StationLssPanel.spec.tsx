import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { StationLssPanel } from './StationLssPanel';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));
vi.mock('../../lib/assets', () => ({
  anomalyImage: () => '/anomaly.png',
  planetThumbnail: () => '/planet.png',
  spaceBackgroundTile: () => '/space.png',
  starTileImage: () => '/star.png',
  systemTypeImage: () => '/system.png',
}));

const localMap = {
  mode: 'galaxy',
  shipX: 5,
  shipY: 5,
  sensorRange: 1,
  bounds: { minX: 5, maxX: 6, minY: 5, maxY: 5 },
  canEnterSystem: false,
  canLeaveSystem: false,
  ships: [],
  fields: [
    { id: 1, cx: 5, cy: 5, fieldType: { id: 1, key: 'EMPTY_SPACE', name: 'Leerer Raum' }, starSystemId: null, starSystem: null },
    { id: 2, cx: 6, cy: 5, fieldType: { id: 3, key: 'NEBULA', name: 'Nebel' }, starSystemId: null, starSystem: null },
  ],
};

const scan = {
  energyCost: 15,
  energy: 35,
  field: { scope: 'GALAXY', x: 6, y: 5, fieldType: { id: 3, name: 'Nebel' }, effects: [], celestialObject: null, starSystem: null },
  ships: [{ id: 20, name: 'Falke', shipClassId: 7, kind: 'SHIP', ownerName: 'Fremd', isOwn: false }],
  signatures: [],
  fadedSignatures: { uncloaked: 0, cloaked: 0 },
};

describe('StationLssPanel', () => {
  beforeEach(() => {
    apiMocks.get.mockReset().mockResolvedValue(localMap);
    apiMocks.post.mockReset();
  });

  it('shows the station LSS without flight controls and scans a clicked field with a sensor array', async () => {
    apiMocks.post.mockResolvedValue(scan);
    const onUpdate = vi.fn();
    render(<StationLssPanel stationId={4} isSensorArray onUpdate={onUpdate} />);

    fireEvent.click(await screen.findByRole('button', { name: /Feld 6,5: Nebel/ }));

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/4/sensor-scan', { x: 6, y: 5 }));
    const dialog = await screen.findByRole('dialog', { name: 'Sensorscan' });
    expect(within(dialog).getByText('Falke')).toBeTruthy();
    expect(within(dialog).getByText('Fremd')).toBeTruthy();
    expect(within(dialog).getByText('15 EPS verbraucht · 35 verbleibend')).toBeTruthy();
    expect(onUpdate).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /fliegen|Blindflug/i })).toBeNull();
    expect(apiMocks.get).toHaveBeenCalledWith('/spacecraft/4/local-map');
  });

  it('shows the backend reason when the scan fails', async () => {
    apiMocks.post.mockRejectedValue(new Error('Nicht genügend Energie vorhanden (15 benötigt)'));
    render(<StationLssPanel stationId={4} isSensorArray onUpdate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Feld 6,5: Nebel/ }));

    expect((await screen.findByRole('alert')).textContent).toBe('Nicht genügend Energie vorhanden (15 benötigt)');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the LSS of other station roles without a sensor scan', async () => {
    render(<StationLssPanel stationId={4} isSensorArray={false} onUpdate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Feld 6,5: Nebel/ }));

    expect(screen.getByText('Sensorscans sind nur mit einer Sensorphalanx möglich.')).toBeTruthy();
    expect(apiMocks.post).not.toHaveBeenCalled();
  });
});
