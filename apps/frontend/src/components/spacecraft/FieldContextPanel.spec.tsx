import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FieldContextPanel } from './FieldContextPanel';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));
vi.mock('../../services/api', () => ({
  api: apiMocks,
}));

describe('FieldContextPanel', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.patch.mockReset();
    apiMocks.get.mockResolvedValue(null);
  });

  it('shows cartography controls only for a qualified local ship', async () => {
    apiMocks.get.mockResolvedValue({
      id: 4,
      starSystemId: 8,
      status: 'MEASURED',
      remainingFieldIds: [],
      remainingCoordinates: [],
      finalizationStartedAt: null,
      finalizationTick: null,
      finalizingSpacecraftId: null,
      completedAt: null,
      actions: {
        plan: { available: false, reason: null },
        finalize: { available: true, reason: null },
      },
    });

    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            coordinates: { x: 5, y: 23 },
            starSystem: {
              id: 8,
              name: 'Testsystem',
              canLeave: true,
              leaveReason: null,
            },
            colony: null,
            information: { canSectorScan: false, cartographyKnown: false },
          }}
          runtimeSystems={{
            ASTROMETRY_LAB: { active: true, integrity: 100, cooldown: 0 },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('button', { name: 'Kartographie finalisieren' }),
    ).toBeTruthy();
    expect(screen.getByText('Messpunkte abgeschlossen')).toBeTruthy();
  });

  it('renders legacy cartography without action availability as read-only', async () => {
    apiMocks.get.mockResolvedValue({
      id: 4,
      starSystemId: 8,
      status: 'MEASURED',
      remainingFieldIds: [],
      remainingCoordinates: [],
      finalizationStartedAt: null,
      finalizationTick: null,
      finalizingSpacecraftId: null,
      completedAt: null,
    });

    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            coordinates: { x: 5, y: 23 },
            starSystem: {
              id: 8,
              name: 'Testsystem',
              canLeave: true,
              leaveReason: null,
            },
            colony: null,
            information: { canSectorScan: false, cartographyKnown: false },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Messpunkte abgeschlossen')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Kartographie finalisieren' }),
    ).toBeNull();
  });

  it('keeps shared cartography status read-only for an unqualified ship', async () => {
    apiMocks.get.mockResolvedValue({
      id: 4,
      starSystemId: 8,
      status: 'PLANNED',
      remainingFieldIds: [10, 11],
      remainingCoordinates: [
        { x: 4, y: 7 },
        { x: 8, y: 2 },
      ],
      finalizationStartedAt: null,
      finalizationTick: null,
      finalizingSpacecraftId: null,
      completedAt: null,
      actions: { plan: { available: false, reason: 'Labor nicht aktiv' } },
    });

    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={2}
          context={{
            coordinates: { x: 5, y: 23 },
            starSystem: {
              id: 8,
              name: 'Testsystem',
              canLeave: true,
              leaveReason: null,
            },
            colony: null,
            information: { canSectorScan: false, cartographyKnown: false },
          }}
          runtimeSystems={{}}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Verbleibende Messpunkte: 2')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Kartographie/ })).toBeNull();
  });

  it('shows planned cartography as a non-interactive remaining-point count', async () => {
    apiMocks.get.mockResolvedValue({
      id: 4,
      starSystemId: 8,
      status: 'PLANNED',
      remainingFieldIds: [10, 11],
      remainingCoordinates: [
        { x: 4, y: 7 },
        { x: 8, y: 2 },
      ],
      finalizationStartedAt: null,
      finalizationTick: null,
      finalizingSpacecraftId: null,
      completedAt: null,
      actions: {
        plan: { available: false, reason: null },
        finalize: { available: false, reason: null },
      },
    });
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            coordinates: { x: 5, y: 23 },
            starSystem: {
              id: 8,
              name: 'Testsystem',
              canLeave: true,
              leaveReason: null,
            },
            colony: null,
            information: { canSectorScan: false, cartographyKnown: false },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    const remainingPoints = await screen.findByText(
      'Verbleibende Messpunkte: 2',
    );
    expect(remainingPoints.tagName).toBe('DIV');
    expect(remainingPoints.className).toContain('min-h-5');
    expect(remainingPoints.querySelector('img')?.getAttribute('src')).toBe(
      '/assets/buttons/map2.png',
    );
    expect(
      screen.queryByRole('button', { name: 'Verbleibende Messpunkte: 2' }),
    ).toBeNull();
    expect(screen.queryByText('Kartographierung ist geplant')).toBeNull();
    expect(screen.queryByText('4|7')).toBeNull();
    expect(screen.queryByText('8|2')).toBeNull();
    expect(apiMocks.post).not.toHaveBeenCalled();
  });

  it('does not make a non-plannable state actionable', async () => {
    apiMocks.get.mockResolvedValue({
      id: null,
      starSystemId: 8,
      status: 'PLANNABLE',
      remainingFieldIds: [],
      remainingCoordinates: [],
      finalizationStartedAt: null,
      finalizationTick: null,
      finalizingSpacecraftId: null,
      completedAt: null,
      completionOutcome: null,
      actions: {
        plan: { available: false, reason: 'Labor nicht aktiv' },
        finalize: { available: false, reason: null },
      },
    });
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            coordinates: { x: 5, y: 23 },
            starSystem: {
              id: 8,
              name: 'Testsystem',
              canLeave: true,
              leaveReason: null,
            },
            colony: null,
            information: { canSectorScan: false, cartographyKnown: false },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText('System nicht kartographiert')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Kartographie planen' }),
    ).toBeNull();
  });

  it('requires confirmation before planning and sends the request only after confirmation', async () => {
    apiMocks.get.mockResolvedValue({
      id: null,
      starSystemId: 8,
      status: 'PLANNABLE',
      remainingFieldIds: [],
      remainingCoordinates: [],
      finalizationStartedAt: null,
      finalizationTick: null,
      finalizingSpacecraftId: null,
      completedAt: null,
      completionOutcome: null,
      actions: {
        plan: { available: true, reason: null },
        finalize: { available: false, reason: null },
      },
    });
    apiMocks.post.mockResolvedValue({
      id: 4,
      starSystemId: 8,
      status: 'PLANNED',
      remainingFieldIds: [],
      remainingCoordinates: [],
      finalizationStartedAt: null,
      finalizationTick: null,
      finalizingSpacecraftId: null,
      completedAt: null,
      actions: {
        plan: { available: false, reason: null },
        finalize: { available: false, reason: null },
      },
    });
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            coordinates: { x: 5, y: 23 },
            starSystem: {
              id: 8,
              name: 'Testsystem',
              canLeave: true,
              leaveReason: null,
            },
            colony: null,
            information: { canSectorScan: false, cartographyKnown: false },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Kartographie planen' }),
    );
    expect(apiMocks.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(apiMocks.post).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Kartographie planen' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Bestätigen' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/spacecraft/1/cartography',
        {},
      ),
    );
  });

  it('confirms finalization and displays finalization and done statuses', async () => {
    apiMocks.get.mockResolvedValue({
      id: 4,
      starSystemId: 8,
      status: 'MEASURED',
      remainingFieldIds: [],
      remainingCoordinates: [],
      finalizationStartedAt: null,
      finalizationTick: null,
      finalizingSpacecraftId: null,
      completedAt: null,
      actions: {
        plan: { available: false, reason: null },
        finalize: { available: true, reason: null },
      },
    });
    apiMocks.post.mockResolvedValue({
      id: 4,
      starSystemId: 8,
      status: 'FINISHING',
      remainingFieldIds: [],
      remainingCoordinates: [],
      finalizationStartedAt: '2026-10-16T10:00:00.000Z',
      finalizationTick: 1,
      finalizingSpacecraftId: 1,
      completedAt: null,
      actions: {
        plan: { available: false, reason: null },
        finalize: { available: false, reason: null },
      },
    });
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            coordinates: { x: 5, y: 23 },
            starSystem: {
              id: 8,
              name: 'Testsystem',
              canLeave: true,
              leaveReason: null,
            },
            colony: null,
            information: { canSectorScan: false, cartographyKnown: false },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Kartographie finalisieren' }),
    );
    expect(apiMocks.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Bestätigen' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/spacecraft/1/cartography/finalize',
        {},
      ),
    );
    const finalizationStatus = await screen.findByText('Kartographie: 1/3');
    const finalizationRow = finalizationStatus.closest('div');
    expect(finalizationRow?.className).toContain('whitespace-nowrap');
    expect(finalizationRow?.querySelector('img')?.getAttribute('src')).toBe(
      '/assets/buttons/map2.png',
    );
    expect(screen.queryByText(/Hauptticks/)).toBeNull();
  });

  it('renders success only for an explicitly successful terminal plan', async () => {
    apiMocks.get.mockResolvedValue({
      id: 4,
      starSystemId: 8,
      status: 'DONE',
      remainingFieldIds: [],
      remainingCoordinates: [],
      finalizationStartedAt: null,
      finalizationTick: null,
      finalizingSpacecraftId: null,
      completedAt: '2026-10-16T10:00:00.000Z',
      completionOutcome: 'SUCCESS',
      actions: {
        plan: { available: false, reason: null },
        finalize: { available: false, reason: null },
      },
    });
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            coordinates: { x: 5, y: 23 },
            starSystem: {
              id: 8,
              name: 'Testsystem',
              canLeave: true,
              leaveReason: null,
            },
            colony: null,
            information: { canSectorScan: false, cartographyKnown: false },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    const successStatus = await screen.findByText('System ist kartographiert');
    const successRow = successStatus.closest('div');
    expect(successRow?.className).toContain('whitespace-nowrap');
    expect(successRow?.querySelector('img')?.getAttribute('src')).toBe(
      '/assets/buttons/map2.png',
    );
    const systemLink = screen.getByRole('link', { name: '✦ Testsystem' });
    expect(systemLink.getAttribute('href')).toBe('/database/systems/8');
    const systemActions = systemLink.parentElement;
    expect(systemActions?.className).toContain('flex-col');
    expect(systemActions?.contains(screen.getByRole('button', { name: 'System verlassen' }))).toBe(
      true,
    );
    expect(apiMocks.get).toHaveBeenCalledWith('/spacecraft/1/cartography', {
      cache: 'no-store',
    });
  });

  it.each([['INVALIDATED', 'Kartographie ohne Belohnung beendet']])(
    'does not render success for a terminal plan with outcome %s',
    async (completionOutcome, expectedStatus) => {
      apiMocks.get.mockResolvedValue({
        id: 4,
        starSystemId: 8,
        status: 'DONE',
        remainingFieldIds: [],
        remainingCoordinates: [],
        finalizationStartedAt: null,
        finalizationTick: null,
        finalizingSpacecraftId: null,
        completedAt: '2026-10-16T10:00:00.000Z',
        completionOutcome,
        actions: {
          plan: { available: false, reason: null },
          finalize: { available: false, reason: null },
        },
      });
      render(
        <MemoryRouter>
          <FieldContextPanel
            shipId={1}
            context={{
              coordinates: { x: 5, y: 23 },
              starSystem: {
                id: 8,
                name: 'Testsystem',
                canLeave: true,
                leaveReason: null,
              },
              colony: null,
              information: { canSectorScan: false, cartographyKnown: false },
            }}
            onUpdate={vi.fn()}
          />
        </MemoryRouter>,
      );

      expect(await screen.findByText(expectedStatus)).toBeTruthy();
      expect(screen.queryByText('System ist kartographiert')).toBeNull();
      expect(
        screen.getByRole('link', { name: '✦ Testsystem' }).getAttribute('href'),
      ).toBe('/database/systems/8');
    },
  );

  it('treats a legacy terminal plan without an outcome as successful', async () => {
    apiMocks.get.mockResolvedValue({
      id: 4,
      starSystemId: 8,
      status: 'DONE',
      remainingFieldIds: [],
      remainingCoordinates: [],
      finalizationStartedAt: null,
      finalizationTick: null,
      finalizingSpacecraftId: null,
      completedAt: '2026-10-16T10:00:00.000Z',
      completionOutcome: null,
      actions: {
        plan: { available: false, reason: null },
        finalize: { available: false, reason: null },
      },
    });
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            coordinates: { x: 5, y: 23 },
            starSystem: {
              id: 8,
              name: 'Testsystem',
              canLeave: true,
              leaveReason: null,
            },
            colony: null,
            information: { canSectorScan: false, cartographyKnown: false },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    const successStatus = await screen.findByText('System ist kartographiert');
    const successRow = successStatus.closest('div');
    expect(successRow?.className).toContain('whitespace-nowrap');
    expect(successRow?.querySelector('img')?.getAttribute('src')).toBe(
      '/assets/buttons/map2.png',
    );
    expect(
      screen.getByRole('link', { name: '✦ Testsystem' }).getAttribute('href'),
    ).toBe('/database/systems/8');
    expect(screen.queryByText('Kartographiestatus unbekannt')).toBeNull();
  });

  it('clears a stale cartography plan when a refresh fails', async () => {
    let rejectRefresh!: (error: Error) => void;
    apiMocks.get
      .mockResolvedValueOnce({
        id: 4,
        starSystemId: 8,
        status: 'DONE',
        remainingFieldIds: [],
        remainingCoordinates: [],
        finalizationStartedAt: null,
        finalizationTick: null,
        finalizingSpacecraftId: null,
        completedAt: '2026-10-16T10:00:00.000Z',
        completionOutcome: 'SUCCESS',
        actions: {
          plan: { available: false, reason: null },
          finalize: { available: false, reason: null },
        },
      })
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectRefresh = reject;
          }),
      );
    const context = {
      coordinates: { x: 5, y: 23 },
      starSystem: {
        id: 8,
        name: 'Testsystem',
        canLeave: true,
        leaveReason: null,
      },
      colony: null,
      information: { canSectorScan: false, cartographyKnown: false },
    };
    const { rerender } = render(
      <MemoryRouter>
        <FieldContextPanel shipId={1} context={context} onUpdate={vi.fn()} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('System ist kartographiert')).toBeTruthy();

    rerender(
      <MemoryRouter>
        <FieldContextPanel shipId={2} context={context} onUpdate={vi.fn()} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Kartographie wird geladen…')).toBeTruthy();
    expect(screen.queryByText('System ist kartographiert')).toBeNull();

    rejectRefresh(new Error('Status nicht verfügbar'));

    expect(
      await screen.findByRole('dialog', { name: 'Kartographie' }),
    ).toBeTruthy();
    expect(screen.getByText('Status nicht verfügbar')).toBeTruthy();
    expect(screen.queryByText('System ist kartographiert')).toBeNull();
  });

  it('keeps sector scan available and shows the server rejection in a dialog', async () => {
    apiMocks.get.mockResolvedValue(null);
    apiMocks.post.mockRejectedValue(
      new Error('Kurzstreckensensoren sind nicht aktiv'),
    );

    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            coordinates: { x: 5, y: 23 },
            starSystem: null,
            colony: null,
            information: { canSectorScan: false, cartographyKnown: true },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Sektor .* scannen/ }));

    expect(
      await screen.findByRole('dialog', { name: 'Sektor-Scan' }),
    ).toBeTruthy();
    expect(
      screen.getByText('Kurzstreckensensoren sind nicht aktiv'),
    ).toBeTruthy();
  });

  it('does not render astrometry controls in Informationen', () => {
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            coordinates: { x: 5, y: 23 },
            starSystem: null,
            colony: null,
            information: { canSectorScan: false, cartographyKnown: true },
          }}
          runtimeSystems={{
            ASTROMETRY_LAB: { active: false, integrity: 100, cooldown: 0 },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Astrometrie-Labor:')).toBeNull();
    expect(screen.queryByRole('button', { name: 'aktivieren' })).toBeNull();
  });

  it('shows a database discovery notification after a sector scan', async () => {
    apiMocks.post.mockResolvedValue({
      result: {
        field: {
          x: 5,
          y: 23,
          fieldType: { id: 1, name: 'Planet' },
          movementEnergyCost: 0,
          damage: 0,
          specialDamage: 0,
          effects: [],
          celestialObject: { name: 'Tatooine', classId: 701 },
        },
        discovery: {
          discovered: true,
          prestigeAwarded: 100,
          name: 'Klasse M',
        },
      },
      energyCost: 1,
    });
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            coordinates: { x: 5, y: 23 },
            starSystem: null,
            colony: null,
            information: { canSectorScan: true, cartographyKnown: true },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Sektor .* scannen/ }));

    expect(
      await screen.findByText(
        'Neuer Datenbankeintrag: Klasse M (+100 Prestige)',
      ),
    ).toBeTruthy();
  });

  it('does not show a notification for an already known planet class', async () => {
    apiMocks.post.mockResolvedValue({
      result: {
        field: {
          x: 5,
          y: 23,
          fieldType: { id: 1, name: 'Planet' },
          movementEnergyCost: 0,
          damage: 0,
          specialDamage: 0,
          effects: [],
          celestialObject: { name: 'Tatooine', classId: 701 },
        },
        discovery: {
          discovered: false,
          prestigeAwarded: 0,
          name: 'Klasse M',
        },
      },
      energyCost: 1,
    });
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            coordinates: { x: 5, y: 23 },
            starSystem: null,
            colony: null,
            information: { canSectorScan: true, cartographyKnown: true },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Sektor .* scannen/ }));

    await screen.findByRole('dialog', { name: 'Sektor-Scan' });
    expect(screen.queryByText(/Neuer Datenbankeintrag/)).toBeNull();
  });

  it('links a completed colony scan to an already discovered system without changing the scan result', async () => {
    apiMocks.post.mockResolvedValue({
      scanId: 42,
      colony: {
        id: 3,
        name: 'Alpha',
        owner: { id: 2, username: 'Leia' },
        colonyClassId: 7,
        starSystemId: 8,
        celestialObject: null,
      },
      surface: { width: 1, height: 1, deposits: [], fields: [] },
      intelligence: { level: 'SURFACE_SCAN', redacted: [] },
      systemReference: { id: 8, href: '/database/systems/8' },
    });
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            coordinates: { x: 3, y: 4 },
            starSystem: null,
            colony: {
              id: 3,
              name: 'Alpha',
              planetName: 'Alpha',
              isOwn: false,
              canLand: false,
              canSurfaceScan: true,
            },
            information: { canSectorScan: false, cartographyKnown: true },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Scannen' }));

    expect(
      await screen.findByRole('dialog', { name: 'Kolonie-Oberflächenscan' }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'Systemdatenbank öffnen' })
        .getAttribute('href'),
    ).toBe('/database/systems/8');
    expect(screen.getByText('Kolonie-Oberflächenscan: Alpha')).toBeTruthy();
  });

  it('does not render a system link for a scan of an undiscovered system', async () => {
    apiMocks.post.mockResolvedValue({
      scanId: 42,
      colony: {
        id: 3,
        name: 'Alpha',
        owner: { id: 2, username: 'Leia' },
        colonyClassId: 7,
        starSystemId: 8,
        celestialObject: null,
      },
      surface: { width: 1, height: 1, deposits: [], fields: [] },
      intelligence: { level: 'SURFACE_SCAN', redacted: [] },
    });
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            coordinates: { x: 3, y: 4 },
            starSystem: null,
            colony: {
              id: 3,
              name: 'Alpha',
              planetName: 'Alpha',
              isOwn: false,
              canLand: false,
              canSurfaceScan: true,
            },
            information: { canSectorScan: false, cartographyKnown: true },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Scannen' }));

    await screen.findByRole('dialog', { name: 'Kolonie-Oberflächenscan' });
    expect(
      screen.queryByRole('link', { name: 'Systemdatenbank öffnen' }),
    ).toBeNull();
  });

  it('disables system exit when no hyperdrive is available', () => {
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            coordinates: { x: 5, y: 23 },
            starSystem: {
              id: 7,
              name: 'Testsystem',
              canLeave: false,
              leaveReason: 'Kein Hyperantrieb installiert',
            },
            colony: null,
            information: {
              canSectorScan: false,
              cartographyKnown: false,
            },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    const button = screen.getByRole('button', { name: 'System verlassen' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute('title')).toBe('Kein Hyperantrieb installiert');
  });

  it('lands from the ship colony controls after both transfer buttons', async () => {
    apiMocks.post.mockResolvedValue({});
    const onLanded = vi.fn();
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          context={{
            coordinates: { x: 1, y: 4 },
            starSystem: null,
            colony: {
              id: 3,
              name: 'Alpha',
              planetName: 'Alpha',
              isOwn: true,
              canLand: true,
              canSurfaceScan: false,
            },
            information: {
              canSectorScan: false,
              cartographyKnown: true,
            },
          }}
          onUpdate={vi.fn()}
          onLanded={onLanded}
        />
      </MemoryRouter>,
    );

    const buttons = screen.getAllByRole('button');
    const unloadIndex = buttons.indexOf(
      screen.getByRole('button', { name: 'Entladen' }),
    );
    const landIndex = buttons.indexOf(
      screen.getByRole('button', { name: 'Landen' }),
    );
    const loadIndex = buttons.indexOf(
      screen.getByRole('button', { name: 'Verladen' }),
    );
    expect(loadIndex).toBe(unloadIndex + 1);
    expect(landIndex).toBe(loadIndex + 1);

    fireEvent.click(screen.getByRole('button', { name: 'Landen' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/colonies/3/ships/7/land',
        {},
      ),
    );
    expect(onLanded).toHaveBeenCalledWith(3);
  });

  it('hides landing when the current ship cannot land', () => {
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          context={{
            coordinates: { x: 1, y: 4 },
            starSystem: null,
            colony: {
              id: 3,
              name: 'Alpha',
              planetName: 'Alpha',
              isOwn: true,
              canLand: false,
              canSurfaceScan: false,
            },
            information: {
              canSectorScan: false,
              cartographyKnown: true,
            },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: 'Landen' })).toBeNull();
  });

  it('shows landing errors in the ship context', async () => {
    apiMocks.post.mockRejectedValue(new Error('Nicht genug Lagerraum'));
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          context={{
            coordinates: { x: 1, y: 4 },
            starSystem: null,
            colony: {
              id: 3,
              name: 'Alpha',
              planetName: 'Alpha',
              isOwn: true,
              canLand: true,
              canSurfaceScan: false,
            },
            information: {
              canSectorScan: false,
              cartographyKnown: true,
            },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Landen' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Nicht genug Lagerraum',
    );
  });

  it('shows the STU-style colonization action for an uncolonized target', () => {
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          canColonize
          context={{
            coordinates: { x: 1, y: 4 },
            starSystem: null,
            colony: null,
            information: {
              canSectorScan: false,
              cartographyKnown: true,
              colonizationTarget: {
                celestialObjectId: 9,
                name: 'Tatooine',
                classId: 701,
                className: 'Klasse M',
                isAbandoned: false,
              },
            },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Klasse M')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Kolonie gründen/ }),
    ).toBeTruthy();
  });

  it('does not show a colonization action for an occupied colony', () => {
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          canColonize
          context={{
            coordinates: { x: 1, y: 4 },
            starSystem: null,
            colony: {
              id: 3,
              name: 'Alpha',
              planetName: 'Alpha',
              isOwn: true,
              canLand: false,
              canSurfaceScan: false,
            },
            information: {
              canSectorScan: false,
              cartographyKnown: true,
              colonizationTarget: null,
            },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole('button', { name: /Kolonie gründen/ }),
    ).toBeNull();
    expect(screen.getByText('Alpha')).toBeTruthy();
  });

  it('labels abandoned colonies as a takeover target', () => {
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          canColonize
          context={{
            coordinates: { x: 1, y: 4 },
            starSystem: null,
            colony: null,
            information: {
              canSectorScan: false,
              cartographyKnown: true,
              colonizationTarget: {
                celestialObjectId: 9,
                name: 'Tatooine',
                classId: 701,
                className: 'Klasse M',
                isAbandoned: true,
              },
            },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('button', { name: /Ruinen übernehmen/ }),
    ).toBeTruthy();
  });
});
