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
  7: { id: 7, name: 'Wohnanlage', nameShort: 'Wohnanlage' },
};

describe('ColonySandboxPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockImplementation((url: string) =>
      Promise.resolve(
        url === '/colonies/sandboxes'
          ? { limit: 3, sandboxes: [sandbox] }
          : sandbox,
      ),
    );
    mocks.post.mockResolvedValue({ ...sandbox, id: 8, name: 'Plan B' });
    mocks.patch.mockResolvedValue({ ...sandbox, name: 'Umbenannt' });
    mocks.delete.mockResolvedValue(undefined);
  });

  it('lists planning copies and renders the selected copied map without live colony actions', async () => {
    render(
      <ColonySandboxPanel colonyId={1} buildingMap={buildingMap as never} />,
    );
    fireEvent.click(await screen.findByRole('button', { name: /Plan A/ }));
    const field = await screen.findByRole('button', {
      name: 'Feld 20: Wohnanlage (deaktiviert)',
    });
    expect((field as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(field);
    expect(
      screen.queryByRole('button', { name: /Bauen|Abreißen|Schalten/ }),
    ).toBeNull();
    expect(screen.queryByText('Energie')).toBeNull();
    expect(mocks.post).not.toHaveBeenCalled();
    expect(screen.getByText(/Schreibgeschützte Planungskopie/)).toBeTruthy();
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
