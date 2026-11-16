import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { SignatureMaskButton } from './SignatureMaskButton';
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
beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockResolvedValue(menu);
});
it('loads only when opened and activates the selected hull with its displayed EPS cost', async () => {
  const refresh = vi.fn();
  mocks.post.mockResolvedValue({
    ...menu,
    energy: 25,
    active: {
      shipClassId: 8,
      name: 'Korvette',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    },
  });
  render(<SignatureMaskButton shipId={12} available onRefresh={refresh} />);
  expect(mocks.get).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Signaturmaskierung öffnen' }),
  );
  await screen.findByRole('option', { name: 'Korvette – 75 EPS' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Signaturrumpf' }), {
    target: { value: '8' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Aktivieren (75 EPS)' }));
  await waitFor(() =>
    expect(mocks.post).toHaveBeenCalledWith('/spacecraft/12/signature-mask', {
      shipClassId: 8,
    }),
  );
  await screen.findByText(/Korvette ·/);
  expect(refresh).toHaveBeenCalledOnce();
});
it('shows a server rejection without discarding the current selection', async () => {
  mocks.post.mockRejectedValue(new Error('Es werden 25 EPS benötigt'));
  render(<SignatureMaskButton shipId={12} available onRefresh={vi.fn()} />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Signaturmaskierung öffnen' }),
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Aktivieren (25 EPS)' }),
  );
  expect((await screen.findByRole('alert')).textContent).toBe(
    'Es werden 25 EPS benötigt',
  );
  expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('4');
});
it('allows free deactivation even when activation is blocked', async () => {
  mocks.get.mockResolvedValue({
    ...menu,
    blockReason: 'Hyperantrieb offline',
    active: {
      shipClassId: 8,
      name: 'Korvette',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    },
  });
  mocks.delete.mockResolvedValue({
    ...menu,
    blockReason: 'Hyperantrieb offline',
  });
  render(<SignatureMaskButton shipId={12} available onRefresh={vi.fn()} />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Signaturmaskierung öffnen' }),
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Deaktivieren' }));
  await waitFor(() =>
    expect(mocks.delete).toHaveBeenCalledWith('/spacecraft/12/signature-mask'),
  );
  expect(
    (
      screen.getByRole('button', {
        name: 'Aktivieren (25 EPS)',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
it('is absent without a hyperdrive', () => {
  render(
    <SignatureMaskButton shipId={12} available={false} onRefresh={vi.fn()} />,
  );
  expect(screen.queryByRole('button')).toBeNull();
});
