import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { SignatureMaskRow } from './SignatureMaskRow';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('../../services/api', () => ({ api: mocks }));

const menu = {
  energy: 100,
  blockReason: null,
  active: null,
  choices: [
    { shipClassId: 4, name: 'Jäger', driveLevel: 1, epsCost: 25 },
    { shipClassId: 8, name: 'Korvette', driveLevel: 3, epsCost: 75 },
  ],
};
const active = {
  shipClassId: 8,
  name: 'Korvette',
  expiresAt: new Date(Date.now() + 300000).toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockResolvedValue(menu);
});

it('fakes the warp signature of the selected hull like STU', async () => {
  const refresh = vi.fn();
  mocks.post.mockResolvedValue({ ...menu, energy: 25, active });
  render(<SignatureMaskRow shipId={12} onRefresh={refresh} />);

  await screen.findByRole('option', { name: 'Korvette – 75 EPS' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Signaturrumpf' }), {
    target: { value: '8' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Warp-Signatur fälschen' }),
  );

  await waitFor(() =>
    expect(mocks.post).toHaveBeenCalledWith('/spacecraft/12/signature-mask', {
      shipClassId: 8,
    }),
  );
  expect((await screen.findByRole('status')).textContent).toMatch(
    /Aktive Warpsignatur: Korvette/,
  );
  expect(refresh).toHaveBeenCalledOnce();
});

it('shows the server reason and keeps the selection', async () => {
  mocks.post.mockRejectedValue(new Error('Es werden 25 EPS benötigt'));
  render(<SignatureMaskRow shipId={12} onRefresh={vi.fn()} />);

  fireEvent.click(
    await screen.findByRole('button', { name: 'Warp-Signatur fälschen' }),
  );

  expect((await screen.findByRole('alert')).textContent).toBe(
    'Es werden 25 EPS benötigt',
  );
  expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('4');
});

it('ends an active signature', async () => {
  mocks.get.mockResolvedValue({ ...menu, active });
  mocks.delete.mockResolvedValue(menu);
  render(<SignatureMaskRow shipId={12} onRefresh={vi.fn()} />);

  fireEvent.click(await screen.findByRole('button', { name: 'beenden' }));

  await waitFor(() =>
    expect(mocks.delete).toHaveBeenCalledWith('/spacecraft/12/signature-mask'),
  );
  await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
});
