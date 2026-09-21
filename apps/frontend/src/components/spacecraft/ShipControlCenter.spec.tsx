import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ShipControlCenter } from './ShipControlCenter';
import type { LocalMapResponse } from './LssMap';

const apiMocks = vi.hoisted(() => ({
  patch: vi.fn(),
  post: vi.fn(),
  get: vi.fn(),
}));
vi.mock('../../services/api', () => ({ api: apiMocks }));

const onUpdate = vi.fn<() => void>();
const baseProps: {
  shipId: number;
  localMap: LocalMapResponse;
  onUpdate: () => void;
} = {
  shipId: 2,
  localMap: {
    mode: 'galaxy' as const,
    shipX: 5,
    shipY: 5,
    sensorRange: 2,
    fields: [],
    canEnterSystem: false,
    canLeaveSystem: false,
    context: {
      layerId: null,
      sectorX: 5,
      sectorY: 5,
      sectorNumber: 1,
      coordinates: { x: 5, y: 5 },
      galaxyCoordinates: { x: 5, y: 5 },
      sensorRange: 2,
      factionZone: 'REBEL',
      adminRegionKey: null,
      systemName: null,
      nearestSystem: null,
      nearbyRouteNames: [],
    },
  },
  onUpdate,
};

describe('ShipControlCenter', () => {
  beforeEach(() => {
    apiMocks.patch.mockReset();
    apiMocks.post.mockReset();
    apiMocks.get.mockReset();
    apiMocks.get.mockResolvedValue(null);
    onUpdate.mockReset();
  });

  it('renders STU-style controls only for present systems', async () => {
    apiMocks.patch.mockResolvedValue({});
    apiMocks.get.mockResolvedValue({
      capacity: 6,
      fireable: [
        {
          amount: 3,
          commodityId: 8,
          torpedoTypeId: 2,
          name: 'Schwerer Plasmatorpedo',
          isActive: true,
        },
      ],
      transport: [],
    });
    render(
      <ShipControlCenter
        shipId={baseProps.shipId}
        onUpdate={baseProps.onUpdate}
        systems={{
          SHIELDS: { active: true, cooldown: 0, integrity: 88 },
          WEAPONS: { active: false, cooldown: 0, integrity: 100 },
          TORPEDO_BANK: { active: false, cooldown: 0, integrity: 100 },
        }}
      />,
    );
    expect(screen.getByText('Schiffskontrolle')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Schilde deaktivieren/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Strahlenwaffen aktivieren/ }),
    ).toBeTruthy();
    expect(screen.queryByText('Hyperantrieb aktivieren')).toBeNull();
    expect(await screen.findByText('Schwerer Plasmatorpedo: 3')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: /Strahlenwaffen aktivieren/ }),
    );
    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith(
        '/spacecraft/2/systems/WEAPONS',
        { active: true },
      ),
    );
  });

  it('shows empty torpedo storage when a torpedo bank is present', async () => {
    apiMocks.get.mockResolvedValue({
      capacity: 6,
      fireable: [],
      transport: [],
    });
    render(
      <ShipControlCenter
        shipId={baseProps.shipId}
        onUpdate={baseProps.onUpdate}
        systems={{
          TORPEDO_BANK: { active: false, cooldown: 0, integrity: 100 },
        }}
      />,
    );
    expect(await screen.findByText('keine Torpedos geladen')).toBeTruthy();
  });
});
