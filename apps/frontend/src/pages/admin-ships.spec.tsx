import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminShipsPage } from './admin-ships';
import type * as ApiModule from '../services/api';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, api: apiMocks };
});

describe('AdminShipsPage', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.patch.mockReset();
    apiMocks.delete.mockReset();
    apiMocks.get.mockImplementation((path: string) => {
      if (path === '/spacecraft/admin/users')
        return Promise.resolve([
          { id: 1, username: 'Admin', email: 'admin@test' },
        ]);
      if (path === '/spacecraft/classes')
        return Promise.resolve([
          {
            id: 2,
            key: 'corvette',
            name: 'Korvette',
            category: 'CORVETTE',
            role: 'TEST',
            factionId: null,
          },
        ]);
      if (path === '/starmap/layers')
        return Promise.resolve([
          { id: 3, name: 'Milchstraße', width: 20, height: 20 },
        ]);
      if (path === '/spacecraft/admin/buildplans')
        return Promise.resolve([
          {
            id: 9,
            name: 'Korvettenplan',
            shipClassId: 2,
            moduleSelections: [{ slotId: 'core', commodityId: 7 }],
          },
        ]);
      if (path === '/spacecraft/admin/spawn-options/2')
        return Promise.resolve({
          torpedoes: { capacity: 0, compatible: [] },
          slots: [
            {
              slotId: 'core',
              label: 'Kern',
              category: 'REACTOR',
              options: [{ commodityId: 7, name: 'Fusionsreaktor', level: 1 }],
            },
          ],
        });
      return Promise.reject(new Error(`Unexpected ${path}`));
    });
  });

  it('loads legal slot choices and posts the selected test preset', async () => {
    apiMocks.post.mockResolvedValue({
      id: 42,
      name: 'Korvette',
      userId: 1,
      shipClassId: 2,
      posX: 1,
      posY: 1,
      currentLayerId: 3,
      status: 'IDLE',
      crew: 2,
    });
    render(
      <MemoryRouter>
        <AdminShipsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Kern (REACTOR)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Spawn' }));
    fireEvent.change(screen.getByLabelText('UI-Testzustand'), {
      target: { value: 'critical' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Schiff spawnen' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/spacecraft/admin/spawn',
        expect.objectContaining({
          preset: 'critical',
          buildplanId: 9,
        }),
      ),
    );
    expect(
      (
        await screen.findByRole('link', { name: 'Schiff #42 öffnen' })
      ).getAttribute('href'),
    ).toBe('/spacecraft/42');
  });
});
