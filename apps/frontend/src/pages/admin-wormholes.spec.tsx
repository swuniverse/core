import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AdminWormholeRestrictionsDto } from '@swuniverse/shared';
import { AdminWormholesPage } from './admin-wormholes';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, api: apiMocks };
});

const hole = {
  isActive: true,
  isBidirectional: false,
  entry: { layerId: 1, x: 2, y: 3 },
  exit: { layerId: 2, x: 8, y: 9 },
};
const data: AdminWormholeRestrictionsDto = {
  wormholes: [
    { ...hole, id: 3, name: 'Passage', restrictions: [] },
    {
      ...hole,
      id: 4,
      name: null,
      restrictions: [{ id: 5, targetType: 'ALLIANCE', targetId: 1234, mode: 'DENY' }],
    },
  ],
};

function renderPage() {
  render(
    <MemoryRouter>
      <AdminWormholesPage />
    </MemoryRouter>,
  );
}

describe('AdminWormholesPage', () => {
  beforeEach(() => {
    apiMocks.get.mockReset().mockResolvedValue(data);
    apiMocks.post.mockReset();
    apiMocks.delete.mockReset();
  });

  it('lists rules per wormhole and marks wormholes without rules as closed', async () => {
    renderPage();
    const passage = await screen.findByRole('article', { name: 'Passage' });
    expect(apiMocks.get).toHaveBeenCalledWith('/starmap/admin/wormhole-restrictions');
    expect(within(passage).getByText('Keine Regeln: Wurmloch gesperrt.')).toBeTruthy();
    const other = screen.getByRole('article', { name: 'Wurmloch 4' });
    expect(within(other).getByText('Verboten')).toBeTruthy();
    expect(within(other).getByText(/Allianz 1.234/)).toBeTruthy();
  });

  it('creates and deletes rules through the admin endpoints', async () => {
    const updated: AdminWormholeRestrictionsDto = {
      wormholes: [
        {
          ...data.wormholes[0],
          restrictions: [{ id: 9, targetType: 'USER', targetId: 7, mode: 'ALLOW' }],
        },
        data.wormholes[1],
      ],
    };
    apiMocks.post.mockResolvedValue(updated);
    apiMocks.delete.mockResolvedValue(data);
    renderPage();
    const passage = await screen.findByRole('article', { name: 'Passage' });
    fireEvent.change(within(passage).getByLabelText('Ziel-ID Passage'), {
      target: { value: '7' },
    });
    fireEvent.click(within(passage).getByRole('button', { name: 'Regel hinzufügen' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/starmap/admin/wormholes/3/restrictions', {
        targetType: 'USER',
        targetId: 7,
        mode: 'ALLOW',
      }),
    );
    expect(await within(passage).findByText('Erlaubt')).toBeTruthy();

    fireEvent.click(
      within(screen.getByRole('article', { name: 'Wurmloch 4' })).getByRole('button', {
        name: 'Regel für Allianz 1.234 löschen',
      }),
    );
    await waitFor(() =>
      expect(apiMocks.delete).toHaveBeenCalledWith('/starmap/admin/wormholes/4/restrictions/5'),
    );
  });

  it('shows server errors such as a rejected duplicate', async () => {
    apiMocks.post.mockRejectedValue(new Error('Für dieses Ziel existiert bereits eine Regel'));
    renderPage();
    const passage = await screen.findByRole('article', { name: 'Passage' });
    fireEvent.change(within(passage).getByLabelText('Ziel-ID Passage'), {
      target: { value: '7' },
    });
    fireEvent.click(within(passage).getByRole('button', { name: 'Regel hinzufügen' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Für dieses Ziel existiert bereits eine Regel',
    );
  });
});
