import { fireEvent, render, screen } from '@testing-library/react';
import { ShipModulesPanel } from './ShipModulesPanel';
import { ApiError } from '../../services/api';
import type * as ApiModule from '../../services/api';

const apiMocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, api: apiMocks };
});

describe('ShipModulesPanel', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.get.mockResolvedValue([]);
  });

  it('renders installed modules read-only and opens details', async () => {
    apiMocks.get.mockResolvedValue([
      {
        id: 7,
        moduleType: 'Fusionsreaktor',
        category: 'REACTOR',
        slotId: 'core',
        level: 2,
        integrity: 93,
        cooldown: 0,
        isActive: true,
        effects: [{ label: 'Output', value: '+4' }],
      },
    ]);
    render(<ShipModulesPanel shipId={2} />);
    const moduleButton = await screen.findByRole('button', {
      name: /Fusionsreaktor, Klasse 2, 93% Integrität, aktiv/i,
    });
    expect(
      screen.queryByRole('button', { name: /installieren|entfernen|upgrade/i }),
    ).toBeNull();
    expect(moduleButton.querySelector('img')?.getAttribute('src')).toBe(
      '/assets/buttons/modul_screen_1.png',
    );
    expect(moduleButton.className).toContain('border-emerald-400');
    fireEvent.click(moduleButton);
    expect(screen.getByRole('dialog', { name: 'Moduldetails' })).toBeTruthy();
    expect(screen.getByText('Output: +4')).toBeTruthy();
  });

  it('distinguishes empty modules from a load error', async () => {
    apiMocks.get.mockResolvedValue([]);
    const { unmount } = render(<ShipModulesPanel shipId={2} />);
    expect(await screen.findByText('Keine Module verbaut.')).toBeTruthy();
    unmount();

    apiMocks.get.mockRejectedValueOnce(new ApiError(503, 'Module offline'));
    render(<ShipModulesPanel shipId={3} />);
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Module offline',
    );
  });
});
