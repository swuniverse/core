import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Faction } from '@swuniverse/shared';
import { mergeBroadcasts, OrderBroadcastOverlay } from './OrderBroadcastOverlay';

const get = vi.fn();
const post = vi.fn();
vi.mock('../services/api', () => ({
  api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
}));
vi.mock('../hooks/use-socket', () => ({ useSocket: () => undefined }));
vi.mock('../stores/auth.store', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ user: { username: 'Leia', faction: Faction.REBEL_ALLIANCE } }),
}));

const msg = (id: number) => ({ id, message: `m${id}`, createdAt: '2026-11-06' });

describe('OrderBroadcastOverlay', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset().mockResolvedValue({ ok: true });
  });

  it('merges newest first without duplicates', () => {
    expect(mergeBroadcasts([msg(1), msg(2)], [msg(2), msg(3)]).map((m) => m.id)).toEqual([3, 2, 1]);
  });

  it('shows "Bestätigen" for a single message and closes after confirming', async () => {
    get.mockResolvedValue([msg(1)]);
    render(<OrderBroadcastOverlay />);
    fireEvent.click(await screen.findByRole('button', { name: 'Bestätigen' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(post).toHaveBeenCalledWith('/order-broadcasts/acknowledge', { ids: [1] });
  });

  it('shows the newest first with "Weiter" when several exist', async () => {
    get.mockResolvedValue([msg(2), msg(1)]);
    render(<OrderBroadcastOverlay />);
    expect(await screen.findByText('m2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(await screen.findByRole('button', { name: 'Bestätigen' })).toBeTruthy();
    expect(screen.getByText('m1')).toBeTruthy();
  });
});
