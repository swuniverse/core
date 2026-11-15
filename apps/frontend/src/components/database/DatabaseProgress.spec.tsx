import { act, render, screen, waitFor, within } from '@testing-library/react';
import { WsEventType } from '@swuniverse/shared';
import { ToastProvider } from '../Toast';
import { DatabaseNotices } from './DatabaseNotices';
import { DatabaseProgress } from './DatabaseProgress';

// Like the real hook: one current handler per subscribed event.
const handlers = vi.hoisted(() => new Map<string, (payload: unknown) => void>());
vi.mock('../../hooks/use-socket', () => ({
  useSocket: (event: string, handler: (payload: unknown) => void) => {
    handlers.set(event, handler);
  },
}));
const apiMocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

const emit = (event: string, payload: unknown = {}) =>
  act(() => {
    handlers.get(event)?.(payload);
  });

const row = (overrides: Record<string, unknown>) => ({
  layerId: null,
  layerName: null,
  completed: false,
  awardKey: null,
  awarded: false,
  ...overrides,
});

describe('DatabaseProgress', () => {
  beforeEach(() => {
    handlers.clear();
    apiMocks.get.mockReset();
  });

  it('shows backend progress per category with the layer only for star systems and reloads on events', async () => {
    apiMocks.get.mockResolvedValueOnce([
      row({ category: 'SHIP_HULLS', discovered: 3, total: 7 }),
      row({ category: 'SYSTEM_TYPES', discovered: 12, total: 12, completed: true, awarded: true }),
      row({ category: 'SYSTEMS', layerId: 1, layerName: 'Kern', discovered: 4, total: 9 }),
    ]);
    render(<DatabaseProgress />);

    const box = await screen.findByRole('region', { name: 'Entdeckungsfortschritt' });
    expect(within(box).getByText('Schiffsrümpfe')).toBeTruthy();
    expect(within(box).getByText('3 / 7 entdeckt')).toBeTruthy();
    expect(within(box).getByText('Sternensysteme · Kern')).toBeTruthy();
    expect(within(box).getByTitle('Award erhalten')).toBeTruthy();
    expect(within(box).queryByText(/Schiffsrümpfe ·/)).toBeNull();
    expect(apiMocks.get).toHaveBeenCalledWith('/database/category-progress');

    apiMocks.get.mockResolvedValueOnce([row({ category: 'SHIP_HULLS', discovered: 4, total: 7 })]);
    emit(WsEventType.DATABASE_ENTRY_DISCOVERED);
    expect(await within(box).findByText('4 / 7 entdeckt')).toBeTruthy();
    expect(apiMocks.get).toHaveBeenCalledTimes(2);
  });

  it('shows nothing without progress rows', async () => {
    apiMocks.get.mockResolvedValueOnce([]);
    const { container } = render(<DatabaseProgress />);
    await waitFor(() => expect(apiMocks.get).toHaveBeenCalled());
    expect(container.innerHTML).toBe('');
  });
});

describe('DatabaseNotices', () => {
  beforeEach(() => handlers.clear());

  it('shows new database entries and awards as separate notices', async () => {
    render(
      <ToastProvider>
        <DatabaseNotices />
      </ToastProvider>,
    );

    emit(WsEventType.DATABASE_ENTRY_DISCOVERED, {
      category: 'SHIP_HULLS',
      name: 'X-Wing',
      prestige: 5,
      text: 'Neuer Datenbankeintrag: X-Wing (+5 Prestige)',
    });
    emit(WsEventType.AWARD_GRANTED, {
      awardKey: 'DATABASE_SHIP_HULLS',
      description: 'Der Spieler hat die Raumfahrt gemeistert',
    });

    expect(await screen.findByText('Neuer Datenbankeintrag: X-Wing (+5 Prestige)')).toBeTruthy();
    expect(screen.getByText('Award erhalten: Der Spieler hat die Raumfahrt gemeistert')).toBeTruthy();
  });
});
