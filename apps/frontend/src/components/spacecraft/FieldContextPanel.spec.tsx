import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FieldContextPanel } from './FieldContextPanel';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('../../services/api', () => ({
  api: apiMocks,
}));

describe('FieldContextPanel', () => {
  it('confirms construction creation from the field context', async () => {
    apiMocks.post.mockResolvedValue({});
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          context={{
            wormholePassages: [],
            coordinates: { x: 1, y: 2 },
            starSystem: null,
            colony: null,
            construction: { station: null, canBuild: true },
            information: { canSectorScan: false, cartographyKnown: false },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Konstrukt errichten' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bestätigen' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/7/construction', {}),
    );
  });

  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.patch.mockReset();
    apiMocks.delete.mockReset();
    apiMocks.get.mockResolvedValue(null);
  });

  describe('orbit order', () => {
    const base = {
      wormholePassages: [],
      coordinates: { x: 1, y: 2 },
      starSystem: null,
      colony: null,
      information: { canSectorScan: false, cartographyKnown: false },
    };
    const available = { available: true, reason: null };
    const renderPanel = (orbitOrder: object, onUpdate = vi.fn()) =>
      render(
        <MemoryRouter>
          <FieldContextPanel shipId={7} context={{ ...base, orbitOrder } as never} onUpdate={onUpdate} />
        </MemoryRouter>,
      );

    it('offers server-allowed orders and shows the server reason for disabled ones', async () => {
      const onUpdate = vi.fn();
      apiMocks.post.mockResolvedValue({ order: {}, message: 'Die Kolonie Endor wird nun von der Flotte Rot verteidigt' });
      renderPanel(
        {
          order: null,
          defend: available,
          blockade: { available: false, reason: 'Aktion nicht möglich, die Kolonie wird verteidigt!' },
          stop: { available: false, reason: 'Die Flotte hat keinen Orbitauftrag.' },
        },
        onUpdate,
      );

      const panel = screen.getByLabelText('Orbitauftrag');
      expect(within(panel).getByText('Die Flotte hat keinen Orbitauftrag.')).toBeTruthy();
      const blockade = within(panel).getByRole('button', { name: 'Kolonie blockieren' }) as HTMLButtonElement;
      expect(blockade.disabled).toBe(true);
      expect(blockade.title).toBe('Aktion nicht möglich, die Kolonie wird verteidigt!');
      expect(within(panel).getByText('Aktion nicht möglich, die Kolonie wird verteidigt!')).toBeTruthy();
      expect(within(panel).queryByRole('button', { name: /beenden/ })).toBeNull();

      fireEvent.click(within(panel).getByRole('button', { name: 'Kolonie verteidigen' }));

      await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/7/orbit-order', { mode: 'DEFEND' }));
      expect(await screen.findByText('Die Kolonie Endor wird nun von der Flotte Rot verteidigt')).toBeTruthy();
      expect(onUpdate).toHaveBeenCalled();
    });

    it('shows the fleet-wide order and ends it', async () => {
      const onUpdate = vi.fn();
      apiMocks.delete.mockResolvedValue({ cleared: true, order: {}, message: 'Blockade aufgehoben' });
      renderPanel(
        {
          order: { colonyId: 4, fleetId: 9, mode: 'BLOCKADE', colonyName: 'Endor' },
          defend: { available: false, reason: 'Die Flotte hat bereits einen Orbitauftrag.' },
          blockade: { available: false, reason: 'Diese Flotte blockiert die Kolonie bereits.' },
          stop: available,
        },
        onUpdate,
      );

      const panel = screen.getByLabelText('Orbitauftrag');
      expect(within(panel).getByText('Die Flotte blockiert Endor.')).toBeTruthy();
      expect(within(panel).queryByRole('button', { name: 'Kolonie verteidigen' })).toBeNull();
      fireEvent.click(within(panel).getByRole('button', { name: 'Blockade beenden' }));

      await waitFor(() => expect(apiMocks.delete).toHaveBeenCalledWith('/spacecraft/7/orbit-order'));
      expect(await screen.findByText('Blockade aufgehoben')).toBeTruthy();
      expect(onUpdate).toHaveBeenCalled();
    });

    it('reports a server rejection and still refreshes the field context', async () => {
      const onUpdate = vi.fn();
      apiMocks.post.mockRejectedValue(new Error('Die Flotte hat bereits einen Orbitauftrag.'));
      renderPanel({ order: null, defend: available, blockade: available, stop: available }, onUpdate);

      fireEvent.click(screen.getByRole('button', { name: 'Kolonie blockieren' }));

      expect(await screen.findByText('Die Flotte hat bereits einen Orbitauftrag.')).toBeTruthy();
      expect(onUpdate).toHaveBeenCalled();
    });
  });

  describe('quick PM to the colony in orbit', () => {
    const colonyContext = (colony: object) => ({
      wormholePassages: [],
      coordinates: { x: 3, y: 4 },
      starSystem: null,
      colony: {
        id: 30, name: 'Kolonie', planetName: 'Planet', isOwn: false,
        owner: { id: 2, name: 'Nachbar' }, canLand: false, canSurfaceScan: false,
        ...colony,
      },
      information: { canSectorScan: false, cartographyKnown: false },
    });
    const renderColony = (colony: object) =>
      render(
        <MemoryRouter>
          <FieldContextPanel shipId={7} context={colonyContext(colony)} onUpdate={vi.fn()} />
        </MemoryRouter>,
      );

    it('sends from the ship to the foreign colony owner', async () => {
      apiMocks.post.mockResolvedValue({ delivered: true });
      renderColony({});

      fireEvent.click(screen.getByTitle('Nachricht an Nachbar verfassen'));
      expect(screen.getByText(/Empfänger:/).textContent).toContain('Nachbar');
      fireEvent.change(screen.getByLabelText('Nachricht an Kolonie'), { target: { value: 'Hallo' } });
      fireEvent.click(screen.getByRole('button', { name: 'Absenden' }));

      await waitFor(() =>
        expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/7/communications/nearby/30', {
          body: 'Hallo',
          targetType: 'COLONY',
        }),
      );
    });

    it.each([
      ['an own colony', { isOwn: true, owner: { id: 1, name: 'Ich' } }],
      ['an ownerless colony', { owner: null }],
    ])('offers no message for %s', (_label, colony) => {
      renderColony(colony);

      expect(screen.queryByTitle(/Nachricht an .* verfassen/)).toBeNull();
    });
  });

  it('shows active anomalies with name and remaining duration', () => {
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          context={{
            wormholePassages: [],
            coordinates: { x: 1, y: 2 },
            starSystem: null,
            colony: null,
            anomalies: [
              { type: 'SUBSPACE_ELLIPSE', name: 'Subraumellipse', remainingTicks: 2 },
            ],
            information: { canSectorScan: false, cartographyKnown: false },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Anomalie: Subraumellipse (noch 2 Ticks)'),
    ).toBeTruthy();
  });

  it('shows region information in a dialog', async () => {
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          context={{
            wormholePassages: [],
            coordinates: { x: 1, y: 2 },
            starSystem: null,
            colony: null,
            region: {
              id: 3,
              name: 'Kernwelten',
              description: 'Das politische Zentrum der Galaxis.',
            },
            adminRegion: { key: 'CORE', name: 'Kernregion' },
            information: { canSectorScan: false, cartographyKnown: false },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Region: Kernwelten' }));

    const dialog = screen.getByRole('dialog', { name: 'Regionsinfo' });
    expect(dialog.textContent).toContain('Das politische Zentrum der Galaxis.');
    expect(dialog.textContent).toContain('Verwaltungsregion: Kernregion');
  });

  it('offers the STU finalization with an active laboratory', async () => {
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
            wormholePassages: [],
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
      await screen.findByRole('button', { name: 'Kartographierung finalisieren (System)' }),
    ).toBeTruthy();
    expect(screen.queryByText('Messpunkte abgeschlossen')).toBeNull();
  });

  it('shows a measured system as planned without an active laboratory (STU)', async () => {
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
            wormholePassages: [],
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

    expect(await screen.findByText('Kartographierung ist geplant (System)')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: /finalisieren/ }),
    ).toBeNull();
  });

  it('shows a planned system as planned without an active laboratory (STU)', async () => {
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
            wormholePassages: [],
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

    expect(await screen.findByText('Kartographierung ist geplant (System)')).toBeTruthy();
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
            wormholePassages: [],
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
          runtimeSystems={{ ASTROMETRY_LAB: { active: true, integrity: 100, cooldown: 0 } } as never}
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
            wormholePassages: [],
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
      screen.queryByRole('button', { name: 'System kartographieren' }),
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
            wormholePassages: [],
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
          runtimeSystems={{ ASTROMETRY_LAB: { active: true, integrity: 100, cooldown: 0 } } as never}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'System kartographieren' }),
    );
    expect(apiMocks.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(apiMocks.post).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'System kartographieren' }),
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
            wormholePassages: [],
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
          runtimeSystems={{ ASTROMETRY_LAB: { active: true, integrity: 100, cooldown: 0 } } as never}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Kartographierung finalisieren (System)' }),
    );
    expect(apiMocks.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Bestätigen' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/spacecraft/1/cartography/finalize',
        {},
      ),
    );
    const finalizationStatus = await screen.findByText('Kartographierung wird finalisiert (noch 2 Ticks)');
    const finalizationRow = finalizationStatus.closest('div');
    expect(finalizationRow?.className).toContain('whitespace-nowrap');
    expect(finalizationRow?.querySelector('img')?.getAttribute('src')).toBe(
      '/assets/buttons/map1.png',
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
            wormholePassages: [],
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
          runtimeSystems={{ WARPDRIVE: { active: false, cooldown: 0, integrity: 100 } } as never}
        />
      </MemoryRouter>,
    );

    const successStatus = await screen.findByText('System ist kartographiert');
    const successRow = successStatus.closest('div');
    expect(successRow?.className).toContain('whitespace-nowrap');
    expect(successRow?.querySelector('img')?.getAttribute('src')).toBe(
      '/assets/buttons/map1.png',
    );
    const systemLink = screen.getByRole('link', { name: '✦ Testsystem' });
    expect(systemLink.getAttribute('href')).toBe('/database/systems/8');
    const systemActions = systemLink.parentElement;
    expect(systemActions?.className).toContain('flex-col');
    expect(
      systemActions?.contains(
        screen.getByRole('button', { name: 'System verlassen' }),
      ),
    ).toBe(true);
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
            wormholePassages: [],
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
            wormholePassages: [],
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
      '/assets/buttons/map1.png',
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
      wormholePassages: [],
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
            wormholePassages: [],
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
            wormholePassages: [],
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
            wormholePassages: [],
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

  it('renders flight signatures and faded counts in the sector scan table', async () => {
    apiMocks.post.mockResolvedValue({
      result: {
        field: {
          x: 5,
          y: 23,
          fieldType: { id: 1, name: 'Leerer Raum' },
          movementEnergyCost: 1,
          damage: 0,
          specialDamage: 0,
          effects: [],
          celestialObject: null,
        },
        discovery: null,
        signatures: [
          {
            id: 101,
            spacecraftId: 9,
            shipClassId: 4,
            shipClassName: 'CR90-Korvette',
            spacecraftName: 'Tantive IV',
            fromDirection: null,
            toDirection: 'EAST',
            isCloaked: false,
            createdAt: new Date().toISOString(),
          },
        ],
        fadedSignatures: { uncloaked: 2, cloaked: 1 },
      },
      energyCost: 1,
    });
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            wormholePassages: [],
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

    expect(await screen.findByText('CR90-Korvette')).toBeTruthy();
    expect(screen.getByText('Tantive IV')).toBeTruthy();
    expect(screen.getByText('nach Ost')).toBeTruthy();
    expect(screen.getByText('Ungetarnt: 2')).toBeTruthy();
    expect(screen.getByText('Getarnt: 1')).toBeTruthy();
  });

  it('analyzes the selected signature by signature id even when two traces share one ship', async () => {
    apiMocks.post
      .mockResolvedValueOnce({
        result: {
          field: {
            x: 5,
            y: 23,
            fieldType: { id: 1, name: 'Leerer Raum' },
            movementEnergyCost: 1,
            damage: 0,
            specialDamage: 0,
            effects: [],
            celestialObject: null,
          },
          discovery: null,
          signatures: [
            {
              id: 51,
              spacecraftId: 9,
              shipClassId: 4,
              shipClassName: 'CR90-Korvette',
              spacecraftName: 'Tantive IV',
              fromDirection: null,
              toDirection: 'EAST',
              isCloaked: false,
              createdAt: new Date().toISOString(),
            },
            {
              id: 52,
              spacecraftId: 9,
              shipClassId: 4,
              shipClassName: 'CR90-Korvette',
              spacecraftName: 'Tantive IV',
              fromDirection: null,
              toDirection: 'NORTH',
              isCloaked: false,
              createdAt: new Date().toISOString(),
            },
          ],
          fadedSignatures: { uncloaked: 0, cloaked: 0 },
        },
        energyCost: 1,
      })
      .mockResolvedValueOnce({
        signatureId: 51,
        spacecraftId: 9,
        spacecraftName: null,
        energy: 899,
      });
    const onUpdate = vi.fn();
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            wormholePassages: [],
            coordinates: { x: 5, y: 23 },
            starSystem: null,
            colony: null,
            information: { canSectorScan: true, cartographyKnown: true },
          }}
          runtimeSystems={{
            SUBSPACE_SCANNER: { active: true, cooldown: 0, integrity: 100 },
            MATRIX_SCANNER: { active: false, cooldown: 0, integrity: 100 },
          }}
          onUpdate={onUpdate}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Sektor .* scannen/ }));
    const analyzeButtons = await screen.findAllByRole('button', {
      name: 'Analysieren · 100 EPS',
    });
    expect(analyzeButtons).toHaveLength(2);
    fireEvent.click(analyzeButtons[0]);

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenLastCalledWith(
        '/spacecraft/1/subspace-analysis/51',
        {},
      ),
    );
    expect(
      await screen.findByText(
        'Signatur 51 analysiert: ? · 899 EPS verbleibend.',
      ),
    ).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Analysiert' }) as HTMLButtonElement).disabled).toBe(true);
    expect(onUpdate).toHaveBeenCalledTimes(2);
  });

  it('disables analysis until both scanner systems are ready', async () => {
    apiMocks.post.mockResolvedValueOnce({
      result: {
        field: {
          x: 5,
          y: 23,
          fieldType: { id: 1, name: 'Leerer Raum' },
          movementEnergyCost: 1,
          damage: 0,
          specialDamage: 0,
          effects: [],
          celestialObject: null,
        },
        signatures: [{
          id: 61,
          spacecraftId: 9,
          shipClassId: 4,
          shipClassName: 'CR90-Korvette',
          spacecraftName: 'Tantive IV',
          fromDirection: null,
          toDirection: 'EAST',
          isCloaked: false,
          createdAt: new Date().toISOString(),
        }],
        fadedSignatures: { uncloaked: 0, cloaked: 0 },
      },
      energyCost: 1,
    });
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            wormholePassages: [],
            coordinates: { x: 5, y: 23 },
            starSystem: null,
            colony: null,
            information: { canSectorScan: true, cartographyKnown: true },
          }}
          runtimeSystems={{
            SUBSPACE_SCANNER: { active: false, cooldown: 0, integrity: 100 },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Sektor .* scannen/ }));

    const analyze = await screen.findByRole('button', {
      name: 'Analysieren · 100 EPS',
    });
    expect((analyze as HTMLButtonElement).disabled).toBe(true);
    expect(analyze.getAttribute('title')).toBe(
      'Hyperraumfeldscanner ist ausgeschaltet',
    );
    fireEvent.click(analyze);
    expect(apiMocks.post).toHaveBeenCalledTimes(1);
  });

  it('discards a pending analysis when the selected ship changes', async () => {
    apiMocks.post.mockResolvedValueOnce({
      result: {
        field: {
          x: 5,
          y: 23,
          fieldType: { id: 1, name: 'Leerer Raum' },
          movementEnergyCost: 1,
          damage: 0,
          specialDamage: 0,
          effects: [],
          celestialObject: null,
        },
        signatures: [{
          id: 71,
          spacecraftId: 9,
          shipClassId: 4,
          shipClassName: 'CR90-Korvette',
          spacecraftName: 'Tantive IV',
          fromDirection: null,
          toDirection: 'EAST',
          isCloaked: false,
          createdAt: new Date().toISOString(),
        }],
        fadedSignatures: { uncloaked: 0, cloaked: 0 },
      },
      energyCost: 1,
    });
    let resolveAnalysis: (value: unknown) => void = () => undefined;
    apiMocks.post.mockImplementationOnce(
      () => new Promise((resolve) => { resolveAnalysis = resolve; }),
    );
    const onUpdate = vi.fn();
    const context = {
      wormholePassages: [],
      coordinates: { x: 5, y: 23 },
      starSystem: null,
      colony: null,
      information: { canSectorScan: true, cartographyKnown: true },
    };
    const systems = {
      SUBSPACE_SCANNER: { active: true, cooldown: 0, integrity: 100 },
      MATRIX_SCANNER: { active: false, cooldown: 0, integrity: 100 },
    };
    const { rerender } = render(
      <MemoryRouter>
        <FieldContextPanel shipId={1} context={context} runtimeSystems={systems} onUpdate={onUpdate} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Sektor .* scannen/ }));
    const analyze = await screen.findByRole('button', {
      name: 'Analysieren · 100 EPS',
    });
    fireEvent.click(analyze);
    fireEvent.click(analyze);
    expect(apiMocks.post).toHaveBeenCalledTimes(2);

    rerender(
      <MemoryRouter>
        <FieldContextPanel shipId={2} context={context} runtimeSystems={systems} onUpdate={onUpdate} />
      </MemoryRouter>,
    );
    await act(async () => resolveAnalysis({
      signatureId: 71,
      spacecraftId: 9,
      spacecraftName: 'Tantive IV',
      energy: 899,
    }));
    expect(screen.queryByRole('dialog', { name: 'Sektor-Scan' })).toBeNull();
    expect(onUpdate).toHaveBeenCalledTimes(1);
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
            wormholePassages: [],
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
            wormholePassages: [],
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
            wormholePassages: [],
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

  it('hides system exit without a hyperdrive like STU (hasWarpdrive)', () => {
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            wormholePassages: [],
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

    expect(screen.queryByRole('button', { name: 'System verlassen' })).toBeNull();
    expect(screen.getByRole('link', { name: '✦ Testsystem' })).toBeTruthy();
  });

  it('lands from the ship colony controls after both transfer buttons', async () => {
    apiMocks.post.mockResolvedValue({});
    const onLanded = vi.fn();
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          context={{
            wormholePassages: [],
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
            wormholePassages: [],
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
            wormholePassages: [],
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

  it('offers only authoritative local wormhole passages and submits the selected exit', async () => {
    apiMocks.post.mockResolvedValue({
      wormholeId: 22,
      direction: 'ENTRY',
      shipIds: [7],
      locationId: 901,
    });
    apiMocks.get.mockResolvedValue({
      location: { scope: 'GALAXY', layerId: 8, x: 20, y: 30 },
    });
    const onUpdate = vi.fn();
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          context={{
            coordinates: { x: 1, y: 4 },
            starSystem: null,
            colony: null,
            wormholePassages: [
              { id: 21, name: 'Nordtor', targetLayer: { id: 3, name: 'Kernraum' } },
              { id: 22, name: 'Südtor', targetLayer: { id: 8, name: 'Outer Rim' } },
            ],
            information: { canSectorScan: false, cartographyKnown: true },
          }}
          onUpdate={onUpdate}
        />
      </MemoryRouter>,
    );

    const selector = screen.getByRole('combobox', { name: 'Wurmlochpassage' });
    expect(
      within(selector)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Nordtor — Kernraum', 'Südtor — Outer Rim']);
    fireEvent.change(selector, { target: { value: '22' } });
    fireEvent.click(screen.getByRole('button', { name: 'Wurmloch betreten' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/7/wormhole/enter', {
        wormholeId: 22,
      }),
    );
    expect(onUpdate).toHaveBeenCalledOnce();
    expect(apiMocks.get).toHaveBeenCalledWith('/spacecraft/7', { cache: 'no-store' });
  });

  it('does not refresh ship or map when the authoritative passage request fails', async () => {
    apiMocks.post.mockRejectedValue(new Error('Wurmloch ist nicht mehr aktiv'));
    const onUpdate = vi.fn();
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          context={{
            coordinates: { x: 1, y: 4 },
            starSystem: null,
            colony: null,
            wormholePassages: [
              { id: 22, name: 'Südtor', targetLayer: { id: 8, name: 'Outer Rim' } },
            ],
            information: { canSectorScan: false, cartographyKnown: true },
          }}
          onUpdate={onUpdate}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Wurmloch betreten' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Wurmloch ist nicht mehr aktiv',
    );
    expect(onUpdate).not.toHaveBeenCalled();
    expect(apiMocks.get).not.toHaveBeenCalled();
  });

  it('hides wormhole entry when the current field has no available passages', () => {
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          context={{
            wormholePassages: [],
            coordinates: { x: 1, y: 4 },
            starSystem: null,
            colony: null,
            information: { canSectorScan: false, cartographyKnown: true },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: 'Wurmloch betreten' })).toBeNull();
  });

  it('shows the STU-style colonization action for an uncolonized target', () => {
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          canColonize
          context={{
            wormholePassages: [],
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
                isColonizable: true,
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

  it('shows the planet box without colonization for a non-colonizer or uncolonizable body', () => {
    const target = {
      celestialObjectId: 9,
      name: 'Duro II',
      classId: 701,
      className: 'Klasse M',
      isColonizable: true,
      isAbandoned: false,
    };
    const ctx = (colonizationTarget: typeof target) => ({
      wormholePassages: [],
      coordinates: { x: 1, y: 4 },
      starSystem: null,
      colony: null,
      information: {
        canSectorScan: false,
        cartographyKnown: true,
        colonizationTarget,
      },
    });
    const { unmount } = render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          context={ctx(target)}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Klasse M')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: /Kolonie gründen/ }),
    ).toBeNull();
    unmount();
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          canColonize
          context={ctx({ ...target, isColonizable: false })}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Klasse M')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: /Kolonie gründen/ }),
    ).toBeNull();
  });

  it('does not show a colonization action for an occupied colony', () => {
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          canColonize
          context={{
            wormholePassages: [],
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
    expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0);
  });

  it('labels abandoned colonies as a takeover target', () => {
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          canColonize
          context={{
            wormholePassages: [],
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
                isColonizable: true,
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

  it('opens the colony surface for an enemy and attacks the selected building', async () => {
    const onUpdate = vi.fn();
    apiMocks.post
      .mockResolvedValueOnce({
        colony: { name: 'Alpha', owner: { username: 'Enemy' } },
        surface: {
          width: 2,
          deposits: [],
          fields: [
            {
              fieldIndex: 3,
              fieldType: 111,
              buildingName: 'Schildgenerator',
              hasBuilding: true,
              isConstruction: false,
              isActive: true,
              integrityPercent: 100,
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        rounds: [],
        outcome: {
          winner: 'attacker',
          attackerDestroyed: false,
          defenderDestroyed: false,
        },
      });

    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            wormholePassages: [],
            coordinates: { x: 5, y: 23 },
            starSystem: { id: 8, name: 'Testsystem', canLeave: true, leaveReason: null },
            colony: {
              id: 9,
              name: 'Alpha',
              planetName: 'Alpha Prime',
              isOwn: false,
              canLand: false,
              canSurfaceScan: true,
              canAttack: true,
              attackReason: null,
            },
            information: { canSectorScan: false, cartographyKnown: false },
          }}
          onUpdate={onUpdate}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Kolonie angreifen' }));
    await screen.findByRole('dialog', { name: 'Kolonie-Oberflächenscan' });
    fireEvent.click(screen.getByRole('button', { name: /Schildgenerator angreifen/ }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenLastCalledWith('/combat/attack-colony', {
        attackerId: 1,
        colonyId: 9,
        fieldIndex: 3,
      }),
    );
    expect(await screen.findByRole('dialog', { name: 'Kampfbericht' })).toBeTruthy();
    expect(onUpdate).toHaveBeenCalled();
  });

  it('disables colony attacks outside an enemy stance with the server reason', () => {
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            wormholePassages: [],
            coordinates: { x: 5, y: 23 },
            starSystem: { id: 8, name: 'Testsystem', canLeave: true, leaveReason: null },
            colony: {
              id: 9,
              name: 'Alpha',
              planetName: 'Alpha Prime',
              isOwn: false,
              canLand: false,
              canSurfaceScan: true,
              canAttack: false,
              attackReason: 'Kolonie ist nicht feindlich',
            },
            information: { canSectorScan: false, cartographyKnown: false },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    const button = screen.getByRole('button', { name: 'Kolonie angreifen' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute('title')).toBe('Kolonie ist nicht feindlich');
  });


  describe('region cartography (tmw-K8b3)', () => {
    const regionContext = (x = 4) => ({
      wormholePassages: [],
      coordinates: { x, y: 9 },
      region: { id: 3, name: 'Hutt-Raum', description: null } as { id: number; name: string; description: string | null } | null,
      starSystem: null,
      colony: null,
      information: { canSectorScan: false, cartographyKnown: false },
    });
    const regionPlan = (overrides: object) => ({
      id: 6,
      targetType: 'REGION',
      starSystemId: null,
      mapRegionId: 3,
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
      ...overrides,
    });
    const labOn = { ASTROMETRY_LAB: { active: true, integrity: 100, cooldown: 0 } };
    const renderRegion = (context = regionContext(), runtimeSystems: object = labOn) =>
      render(
        <MemoryRouter>
          <FieldContextPanel shipId={1} context={context} runtimeSystems={runtimeSystems as never} onUpdate={vi.fn()} />
        </MemoryRouter>,
      );

    it('offers "Region kartographieren" on a region field and plans after confirmation', async () => {
      apiMocks.get.mockResolvedValue(regionPlan({ id: null }));
      apiMocks.post.mockResolvedValue(regionPlan({ status: 'PLANNED', remainingFieldIds: [11, 12] }));
      renderRegion();

      fireEvent.click(await screen.findByRole('button', { name: 'Region kartographieren' }));
      expect(screen.getByText('Kartographie für diese Region planen?')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Bestätigen' }));

      await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/1/cartography', {}));
      expect(await screen.findByText('Verbleibende Messpunkte: 2')).toBeTruthy();
    });

    it('offers the action with an active laboratory and reports a server rejection on click (STU)', async () => {
      apiMocks.get.mockResolvedValue(
        regionPlan({
          id: null,
          actions: {
            plan: { available: false, reason: 'Nicht genug Crew für die Kartographie' },
            finalize: { available: false, reason: null },
          },
        }),
      );
      apiMocks.post.mockRejectedValue(new Error('Nicht genug Crew für die Kartographie'));
      renderRegion();

      fireEvent.click(await screen.findByRole('button', { name: 'Region kartographieren' }));
      fireEvent.click(screen.getByRole('button', { name: 'Bestätigen' }));
      expect(await screen.findByText('Nicht genug Crew für die Kartographie')).toBeTruthy();
    });

    it('shows nothing for a plannable region without an active laboratory (STU)', async () => {
      apiMocks.get.mockResolvedValue(regionPlan({ id: null }));
      renderRegion(regionContext(), {});

      await waitFor(() => expect(apiMocks.get).toHaveBeenCalledWith('/spacecraft/1/cartography', expect.anything()));
      expect(screen.queryByText(/kartograph/i)).toBeNull();
    });

    it('hides cartography outside of systems and regions', async () => {
      renderRegion({ ...regionContext(), region: null });

      await waitFor(() => expect(apiMocks.get).not.toHaveBeenCalledWith('/spacecraft/1/cartography', expect.anything()));
      expect(screen.queryByText(/kartograph/i)).toBeNull();
    });

    it('starts the finalization and shows progress and completion', async () => {
      apiMocks.get.mockResolvedValue(
        regionPlan({ status: 'MEASURED', actions: { plan: { available: false, reason: null }, finalize: { available: true, reason: null } } }),
      );
      apiMocks.post.mockResolvedValue(regionPlan({ status: 'FINISHING', finalizationTick: 1 }));
      const view = renderRegion();

      fireEvent.click(await screen.findByRole('button', { name: 'Kartographierung finalisieren (Region)' }));
      fireEvent.click(screen.getByRole('button', { name: 'Bestätigen' }));
      await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/1/cartography/finalize', {}));
      expect(await screen.findByText('Kartographierung wird finalisiert (noch 2 Ticks)')).toBeTruthy();

      // A field change reloads the status without a manual reload.
      apiMocks.get.mockResolvedValue(regionPlan({ status: 'DONE', completionOutcome: 'SUCCESS' }));
      view.rerender(
        <MemoryRouter>
          <FieldContextPanel shipId={1} context={regionContext(5)} onUpdate={vi.fn()} />
        </MemoryRouter>,
      );
      expect(await screen.findByText('Region ist kartographiert')).toBeTruthy();
    });
  });
});


describe('Seasonal anomaly opening in the ship field context', () => {
  it('offers opening on the current anomaly field and refreshes the ship after delivery', async () => {
    apiMocks.get.mockReset().mockResolvedValue(null);
    apiMocks.post.mockReset().mockResolvedValue({ message: '1 Lebenstag-Marke erhalten.' });
    const update = vi.fn();
    render(<MemoryRouter><FieldContextPanel shipId={7} onUpdate={update} context={{
      wormholePassages: [], coordinates: { x: 1, y: 2 }, starSystem: null, colony: null,
      construction: { station: null, canBuild: false }, information: { canSectorScan: false, cartographyKnown: false },
      anomalies: [{ id: 15, type: 'LIFE_DAY_GIFT', name: 'Lebenstag-Geschenk', remainingTicks: 10, canOpen: true }],
    }} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Lebenstag-Geschenk öffnen' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/7/anomaly/15/open', {}));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('status').textContent).toBe('1 Lebenstag-Marke erhalten.');
  });
  it('does not offer opening for a non-actionable anomaly or an empty field', () => {
    apiMocks.get.mockReset().mockResolvedValue(null);
    render(<MemoryRouter><FieldContextPanel shipId={7} onUpdate={vi.fn()} context={{
      wormholePassages: [], coordinates: { x: 1, y: 2 }, starSystem: null, colony: null,
      construction: { station: null, canBuild: false }, information: { canSectorScan: false, cartographyKnown: false },
      anomalies: [{ type: 'ION_STORM', name: 'Ionensturm', remainingTicks: 3 }],
    }} /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: /öffnen/i })).toBeNull();
  });

  describe('buoys', () => {
    beforeEach(() => {
      apiMocks.get.mockReset();
      apiMocks.post.mockReset();
      apiMocks.get.mockResolvedValue(null);
    });
    const buoy = { id: 9, text: 'Vorsicht Minen', ownerId: 4, ownerName: 'Fremder', createdAt: '2026-11-20T10:00:00Z' };
    const base = {
      wormholePassages: [],
      coordinates: { x: 5, y: 6 },
      starSystem: null,
      colony: null,
      information: { canSectorScan: true, cartographyKnown: false },
    };
    const renderPanel = (buoys: (typeof buoy)[], onUpdate = vi.fn()) =>
      render(
        <MemoryRouter>
          <FieldContextPanel shipId={7} context={{ ...base, buoys } as any} onUpdate={onUpdate} />
        </MemoryRouter>,
      );

    it('offers no buoy drop without a stored buoy like STU', () => {
      render(
        <MemoryRouter>
          <FieldContextPanel shipId={7} context={{ ...base, buoys: [] } as any} onUpdate={vi.fn()} canDropBuoy={false} />
        </MemoryRouter>,
      );
      expect(screen.queryByRole('button', { name: 'Boje setzen' })).toBeNull();
    });

    it('drops a buoy with the entered text and shows the new buoy', async () => {
      const onUpdate = vi.fn();
      apiMocks.post.mockResolvedValue({});
      apiMocks.get.mockImplementation((path: string) =>
        Promise.resolve(path === '/spacecraft/7/field-context' ? { ...base, buoys: [buoy] } : null),
      );
      renderPanel([], onUpdate);

      fireEvent.click(screen.getByRole('button', { name: 'Boje setzen' }));
      const dialog = screen.getByRole('dialog', { name: 'Boje setzen' });
      fireEvent.change(within(dialog).getByLabelText(/Botschaft/), { target: { value: ' Vorsicht Minen ' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Setzen' }));

      await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/7/buoys', { text: 'Vorsicht Minen' }));
      expect(await screen.findByText('Vorsicht Minen')).toBeTruthy();
      expect(screen.queryByRole('dialog', { name: 'Boje setzen' })).toBeNull();
      expect(onUpdate).toHaveBeenCalled();
    });

    it('shows the backend reason when a buoy cannot be dropped', async () => {
      apiMocks.post.mockRejectedValue(new Error('Maximal 16 aktive Bojen erlaubt'));
      renderPanel([]);

      fireEvent.click(screen.getByRole('button', { name: 'Boje setzen' }));
      const dialog = screen.getByRole('dialog', { name: 'Boje setzen' });
      fireEvent.change(within(dialog).getByLabelText(/Botschaft/), { target: { value: 'x' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Setzen' }));

      expect((await within(dialog).findByRole('alert')).textContent).toBe('Maximal 16 aktive Bojen erlaubt');
    });

    it('lists buoys in the sector scan and picks one up there', async () => {
      const onUpdate = vi.fn();
      apiMocks.get.mockImplementation((path: string) =>
        Promise.resolve(path === '/spacecraft/7/field-context' ? { ...base, buoys: [] } : null),
      );
      apiMocks.post.mockImplementation((path: string) =>
        Promise.resolve(
          path === '/spacecraft/7/sector-scan'
            ? {
                energyCost: 1,
                result: {
                  field: { x: 5, y: 6, fieldType: { id: 1, name: 'Leerraum' }, movementEnergyCost: 1, damage: 0, specialDamage: 0, effects: [], celestialObject: null },
                  signatures: [],
                  fadedSignatures: { uncloaked: 0, cloaked: 0 },
                  buoys: [buoy],
                },
              }
            : { pickedUp: true },
        ),
      );
      renderPanel([buoy], onUpdate);

      fireEvent.click(screen.getByRole('button', { name: /Sektor .* scannen/ }));
      const scan = await screen.findByRole('dialog', { name: 'Sektor-Scan' });
      const row = within(scan).getByText('Vorsicht Minen').closest('tr')!;
      expect(within(row).getByText('Fremder')).toBeTruthy();
      fireEvent.click(within(row).getByRole('button', { name: 'Boje aufbringen · 1 EPS' }));

      await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/7/buoys/9/pick-up', {}));
      await waitFor(() => expect(screen.queryByText('Vorsicht Minen')).toBeNull());
      expect(onUpdate).toHaveBeenCalled();
    });

    it('analyses a buoy without leaving the field', () => {
      renderPanel([buoy]);

      fireEvent.click(screen.getByRole('button', { name: 'Analysieren' }));

      const dialog = screen.getByRole('dialog', { name: 'Bojenanalyse' });
      expect(within(dialog).getByText('Vorsicht Minen')).toBeTruthy();
      expect(within(dialog).getByText('Fremder')).toBeTruthy();
      expect(apiMocks.post).not.toHaveBeenCalled();
    });
  });
});
