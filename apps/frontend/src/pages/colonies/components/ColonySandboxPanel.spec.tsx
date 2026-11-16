import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ColonySandboxDto } from '@swuniverse/shared';
import { ColonySandboxPanel } from './ColonySandboxPanel';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('../../../services/api', () => ({ api: mocks }));
vi.mock('./ColonySandboxPreview', () => ({ ColonySandboxPreview: () => <div>Sandbox-Bilanz</div> }));

const sandbox = {
  id: 7,
  name: 'Plan A',
  sourceColonyId: 1,
  sourceColonyName: 'Naboo',
  createdAt: '2026-11-16T00:00:00Z',
  snapshot: {
    surfaceWidth: 6,
    fields: [
      {
        id: 1,
        fieldIndex: 20,
        fieldType: 101,
        layer: 'SURFACE',
        buildingId: 7,
        isActive: false,
        isBuilding: false,
        buildProgress: 0,
        buildFinishesAt: null,
        terrainTileId: null,
      },
    ],
  },
} as ColonySandboxDto;

const buildingMap = {
  7: {
    id: 7,
    name: 'Wohnanlage',
    nameShort: 'Wohnanlage',
    costs: { buildTime: 60 },
    allowedFieldTypes: [101],
    production: [],
    bonuses: { storage: 0, energy: 0 },
    bmCol: 1,
  },
};

describe('ColonySandboxPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockImplementation((url: string) =>
      Promise.resolve(
        url === '/colonies/sandboxes'
          ? { limit: 3, sandboxes: [sandbox] }
          : url.endsWith('/options')
            ? { buildingIds: [7], upgrades: [], terraformingIds: [] }
            : sandbox,
      ),
    );
    mocks.post.mockResolvedValue({ ...sandbox, id: 8, name: 'Plan B' });
    mocks.patch.mockResolvedValue({ ...sandbox, name: 'Umbenannt' });
    mocks.delete.mockResolvedValue(undefined);
  });

  it('edits only the selected planning copy and exposes free sandbox actions', async () => {
    mocks.post.mockResolvedValue({
      ...sandbox,
      snapshot: {
        ...sandbox.snapshot,
        fields: [{ ...sandbox.snapshot.fields[0], isActive: true }],
      },
    });
    render(
      <ColonySandboxPanel colonyId={1} buildingMap={buildingMap as never} />,
    );
    fireEvent.click(await screen.findByRole('button', { name: /Plan A/ }));
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Feld 20: Wohnanlage (deaktiviert)',
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Aktivieren' }));
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith('/colonies/sandboxes/7/actions', {
        action: 'toggle',
        fieldIndex: 20,
      }),
    );
    expect(screen.queryByText('Akademie')).toBeNull();
    expect(screen.getByText(/Sofort und kostenlos/)).toBeTruthy();
    expect(
      mocks.post.mock.calls.every(([url]) => url.includes('/sandboxes/')),
    ).toBe(true);
  });

  it('builds in the selected sandbox field and sends selected mass switches', async () => {
    const empty = {
      ...sandbox,
      snapshot: {
        ...sandbox.snapshot,
        fields: [{ ...sandbox.snapshot.fields[0], buildingId: null }],
      },
    };
    mocks.get.mockImplementation((url: string) =>
      Promise.resolve(
        url === '/colonies/sandboxes'
          ? { limit: 3, sandboxes: [empty] }
          : url.endsWith('/options')
            ? { buildingIds: [7], upgrades: [], terraformingIds: [] }
            : empty,
      ),
    );
    mocks.post.mockResolvedValue(sandbox);
    render(
      <ColonySandboxPanel colonyId={1} buildingMap={buildingMap as never} />,
    );
    fireEvent.click(await screen.findByRole('button', { name: /Plan A/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Feld 20' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Wohnanlage' }));
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith('/colonies/sandboxes/7/actions', {
        action: 'build',
        fieldIndex: 20,
        buildingId: 7,
        activate: true,
      }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Dialog schließen' }),
    );
    fireEvent.click(screen.getByLabelText('Feld 20 auswählen'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Auswahl deaktivieren' }),
    );
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith('/colonies/sandboxes/7/actions', {
        action: 'mass-toggle',
        mode: 2,
        fieldIndexes: [20],
        activate: false,
      }),
    );
  });

  it('runs free upgrades and shows activation errors inside the planning dialog', async () => {
    const map = {
      ...buildingMap,
      8: { ...buildingMap[7], id: 8, name: 'Große Wohnanlage' },
    };
    mocks.get.mockImplementation((url: string) =>
      Promise.resolve(
        url === '/colonies/sandboxes'
          ? { limit: 3, sandboxes: [sandbox] }
          : url.endsWith('/options')
            ? {
                buildingIds: [],
                upgrades: [
                  {
                    id: 3,
                    fromBuildingId: 7,
                    toBuildingId: 8,
                    description: 'Erweitern',
                    energyCost: 999,
                    costs: [],
                  },
                ],
                terraformingIds: [],
              }
            : sandbox,
      ),
    );
    mocks.post.mockResolvedValue(sandbox);
    render(<ColonySandboxPanel colonyId={1} buildingMap={map as never} />);
    fireEvent.click(await screen.findByRole('button', { name: /Plan A/ }));
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Feld 20: Wohnanlage (deaktiviert)',
      }),
    );
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Upgrade auf Große Wohnanlage',
      }),
    );
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith('/colonies/sandboxes/7/actions', {
        action: 'upgrade',
        fieldIndex: 20,
        upgradeId: 3,
      }),
    );
    mocks.post.mockRejectedValue(new Error('Nicht genug Energie'));
    fireEvent.click(await screen.findByRole('button', { name: 'Aktivieren' }));
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Nicht genug Energie',
    );
    expect(screen.queryByText('999')).toBeNull();
  });

  it('terraforms the selected planning field immediately without displaying costs', async () => {
    const empty = {
      ...sandbox,
      snapshot: {
        ...sandbox.snapshot,
        fields: [{ ...sandbox.snapshot.fields[0], buildingId: null }],
      },
    };
    mocks.get.mockImplementation((url: string) =>
      Promise.resolve(
        url === '/colonies/sandboxes'
          ? { limit: 3, sandboxes: [empty] }
          : url.endsWith('/options')
            ? { buildingIds: [], upgrades: [], terraformingIds: ['land'] }
            : empty,
      ),
    );
    mocks.post.mockResolvedValue(empty);
    render(
      <ColonySandboxPanel
        colonyId={1}
        buildingMap={buildingMap as never}
        terraformingDefs={[
          {
            id: 'land',
            fromFieldType: '101',
            toFieldType: '102',
            description: 'Ebnen',
            duration: 999,
            energyCost: 999,
            costs: [{ commodityId: 1, amount: 999 }],
            researchId: null,
          },
        ]}
      />,
    );
    fireEvent.click(await screen.findByRole('button', { name: /Plan A/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Feld 20' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ebnen' }));
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith('/colonies/sandboxes/7/actions', {
        action: 'terraform',
        fieldIndex: 20,
        terraformingId: 'land',
      }),
    );
    expect(screen.queryByText('Kosten')).toBeNull();
    expect(screen.queryByText('999')).toBeNull();
  });

  it('creates a named copy from the current colony and selects it', async () => {
    render(
      <ColonySandboxPanel colonyId={1} buildingMap={buildingMap as never} />,
    );
    await screen.findByRole('button', { name: /Plan A/ });
    fireEvent.change(screen.getByLabelText('Neue Sandbox'), {
      target: { value: 'Plan B' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sandbox erstellen' }));
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith('/colonies/1/sandboxes', {
        name: 'Plan B',
      }),
    );
  });

  it('renames and deletes an own sandbox after confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <ColonySandboxPanel colonyId={1} buildingMap={buildingMap as never} />,
    );
    fireEvent.click(await screen.findByRole('button', { name: /Plan A/ }));
    const name = await screen.findByLabelText('Sandbox-Name');
    fireEvent.change(name, { target: { value: 'Umbenannt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Umbenennen' }));
    await waitFor(() =>
      expect(mocks.patch).toHaveBeenCalledWith('/colonies/sandboxes/7', {
        name: 'Umbenannt',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sandbox löschen' }));
    await waitFor(() =>
      expect(mocks.delete).toHaveBeenCalledWith('/colonies/sandboxes/7'),
    );
    confirm.mockRestore();
  });

  it('disables creation at the configured limit and displays API errors', async () => {
    mocks.get.mockResolvedValue({ limit: 1, sandboxes: [sandbox] });
    render(
      <ColonySandboxPanel colonyId={1} buildingMap={buildingMap as never} />,
    );
    expect(await screen.findByText('1 / 1 Sandboxen')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Neue Sandbox'), {
      target: { value: 'Extra' },
    });
    expect(
      (
        screen.getByRole('button', {
          name: 'Sandbox erstellen',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('shows a failed creation without changing the colony or clearing the chosen name', async () => {
    mocks.post.mockRejectedValue(
      new Error('Maximal 3 Sandboxen je Spieler erlaubt.'),
    );
    render(
      <ColonySandboxPanel colonyId={1} buildingMap={buildingMap as never} />,
    );
    await screen.findByRole('button', { name: /Plan A/ });
    fireEvent.change(screen.getByLabelText('Neue Sandbox'), {
      target: { value: 'Plan B' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sandbox erstellen' }));
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Maximal 3 Sandboxen je Spieler erlaubt.',
    );
    expect(
      (screen.getByLabelText('Neue Sandbox') as HTMLInputElement).value,
    ).toBe('Plan B');
  });
});
