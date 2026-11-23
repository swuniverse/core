import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  it('shows the built-in beamblocker without an activation or deactivation button', async () => {
    render(<ShipControlCenter shipId={2} onUpdate={onUpdate} systems={{ BEAM_BLOCKER: { active: true, cooldown: 0, integrity: 72 } }} />);
    expect(screen.getByText(/Beamblocker · aktiv · 72% · 0 EPS/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Beamblocker/ })).toBeNull();
  });
  it('toggles scanner systems, shows their activation costs and reports backend errors', async () => {
    apiMocks.patch.mockRejectedValueOnce(new Error('Nicht genug EPS'));
    render(
      <ShipControlCenter
        shipId={2}
        onUpdate={onUpdate}
        systems={{
          SUBSPACE_SCANNER: { active: false, cooldown: 0, integrity: 100 },
          TACHYON_SCANNER: { active: true, cooldown: 0, integrity: 100 },
        }}
      />,
    );

    expect(screen.getByText('30 EPS beim Aktivieren · 15 EPS/Tick')).toBeTruthy();
    expect(screen.getByText('3 EPS/Tick')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Hyperraumfeldscanner aktivieren/ }));

    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith(
        '/spacecraft/2/systems/SUBSPACE_SCANNER',
        { active: true },
      ),
    );
    expect((await screen.findByRole('alert')).textContent).toContain('Nicht genug EPS');
  });
  it('ignores a pending scanner response after selecting another ship', async () => {
    let resolveToggle: (value: unknown) => void = () => undefined;
    apiMocks.patch.mockImplementationOnce(
      () => new Promise((resolve) => { resolveToggle = resolve; }),
    );
    const update = vi.fn();
    const { rerender } = render(
      <ShipControlCenter
        shipId={2}
        onUpdate={update}
        systems={{ TACHYON_SCANNER: { active: false, cooldown: 0, integrity: 100 } }}
      />,
    );
    const activate = screen.getByRole('button', { name: /Gravitationswellenscanner aktivieren/ });
    fireEvent.click(activate);
    fireEvent.click(activate);
    expect(apiMocks.patch).toHaveBeenCalledTimes(1);
    rerender(
      <ShipControlCenter
        shipId={3}
        onUpdate={update}
        systems={{ TACHYON_SCANNER: { active: false, cooldown: 0, integrity: 100 } }}
      />,
    );
    await act(async () => resolveToggle({}));
    expect(update).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });
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
          ASTROMETRY_LAB: { active: false, cooldown: 0, integrity: 100 },
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
    const shields = screen.getByRole('button', {
      name: 'Schilde deaktivieren',
    });
    const weapons = screen.getByRole('button', {
      name: 'Strahlenwaffen aktivieren',
    });
    const projectile = screen.getByRole('button', {
      name: 'Projektilwaffe aktivieren',
    });
    const torpedo = await screen.findByText('Schwerer Plasmatorpedo: 3');
    const laboratory = screen.getByRole('button', {
      name: 'Astrometrisches Labor aktivieren',
    });
    expect(shields.compareDocumentPosition(weapons)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(weapons.compareDocumentPosition(projectile)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(projectile.compareDocumentPosition(torpedo)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(torpedo.compareDocumentPosition(laboratory)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
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

  it('toggles the astrometric laboratory with STU button assets', async () => {
    apiMocks.patch.mockResolvedValue({});
    render(
      <ShipControlCenter
        shipId={baseProps.shipId}
        onUpdate={baseProps.onUpdate}
        systems={{
          ASTROMETRY_LAB: { active: false, cooldown: 0, integrity: 100 },
        }}
      />,
    );

    const activate = screen.getByRole('button', {
      name: 'Astrometrisches Labor aktivieren',
    });
    expect(activate.querySelector('img')?.getAttribute('src')).toBe(
      '/assets/buttons/map2.png',
    );
    fireEvent.click(activate);

    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith(
        '/spacecraft/2/systems/ASTROMETRY_LAB',
        { active: true },
      ),
    );
  });

  it('toggles the cloak with its STU icon', async () => {
    apiMocks.patch.mockResolvedValue({});
    render(
      <ShipControlCenter
        shipId={baseProps.shipId}
        onUpdate={baseProps.onUpdate}
        systems={{ CLOAK: { active: false, cooldown: 0, integrity: 100 } }}
      />,
    );

    const activate = screen.getByRole('button', { name: 'Tarnung aktivieren' });
    expect(activate.querySelector('img')?.getAttribute('src')).toBe(
      '/assets/buttons/tarn2.png',
    );
    fireEvent.click(activate);

    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith(
        '/spacecraft/2/systems/CLOAK',
        { active: true },
      ),
    );
  });

  it('offers deactivation with the active cloak icon', () => {
    render(
      <ShipControlCenter
        shipId={baseProps.shipId}
        onUpdate={baseProps.onUpdate}
        systems={{ CLOAK: { active: true, cooldown: 0, integrity: 100 } }}
      />,
    );

    expect(
      screen
        .getByRole('button', { name: 'Tarnung deaktivieren' })
        .querySelector('img')
        ?.getAttribute('src'),
    ).toBe('/assets/buttons/tarn1.png');
  });

  it('uses the active laboratory asset for deactivation', () => {
    render(
      <ShipControlCenter
        shipId={baseProps.shipId}
        onUpdate={baseProps.onUpdate}
        systems={{
          ASTROMETRY_LAB: { active: true, cooldown: 0, integrity: 100 },
        }}
      />,
    );

    const deactivate = screen.getByRole('button', {
      name: 'Astrometrisches Labor deaktivieren',
    });
    expect(deactivate.querySelector('img')?.getAttribute('src')).toBe(
      '/assets/buttons/map1.png',
    );
    expect(deactivate.querySelector('span')?.className).toContain('leading-5');
  });

  it('shows a tracked target location and attacks it from the control center', async () => {
    apiMocks.get.mockImplementation((path: string) =>
      path.endsWith('/tracker')
        ? Promise.resolve({
            targetId: 7,
            targetName: 'Vagrant Hope',
            ticksRemaining: 42,
            location: { scope: 'GALAXY', x: 12, y: 9, fieldId: 33 },
          })
        : Promise.resolve(null),
    );
    apiMocks.post.mockResolvedValue({ rounds: [] });

    render(
      <ShipControlCenter
        shipId={baseProps.shipId}
        onUpdate={baseProps.onUpdate}
        systems={{ TRACKER: { active: true, cooldown: 0, integrity: 100 } }}
      />,
    );

    expect(await screen.findByText(/Vagrant Hope/)).toBeTruthy();
    expect(screen.getByText(/12\|9.*Feld #33/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Getracktes Ziel angreifen' }),
    );
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/combat/attack-tracked', {
        attackerId: 2,
        targetId: 7,
      }),
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
  it('replaces weapon toggles with the STU hint while unalerted', () => {
    const systems = {
      WEAPONS: { active: false, cooldown: 0, integrity: 100 },
      TORPEDO_BANK: { active: false, cooldown: 0, integrity: 100 },
      COMPUTER: { active: true, cooldown: 0, integrity: 100 },
    };
    const { rerender } = render(
      <ShipControlCenter shipId={2} onUpdate={vi.fn()} systems={systems} alertState="GREEN" />,
    );
    expect(screen.getByText('Strahlenwaffen bei Alarmstufe deaktiviert')).toBeTruthy();
    expect(screen.getByText('Projektilwaffe bei Alarmstufe deaktiviert')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Strahlenwaffen aktivieren/ })).toBeNull();

    rerender(
      <ShipControlCenter shipId={2} onUpdate={vi.fn()} systems={systems} alertState="YELLOW" />,
    );
    expect(screen.getByRole('button', { name: /Strahlenwaffen aktivieren/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Projektilwaffe aktivieren/ })).toBeTruthy();

    const { COMPUTER: _computer, ...withoutComputer } = systems;
    rerender(
      <ShipControlCenter shipId={2} onUpdate={vi.fn()} systems={withoutComputer} alertState="YELLOW" />,
    );
    expect(screen.getByText('Strahlenwaffen bei Alarmstufe deaktiviert')).toBeTruthy();
  });
});
