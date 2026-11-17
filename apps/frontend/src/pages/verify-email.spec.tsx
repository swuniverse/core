import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { VerifyEmailPage } from './verify-email';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  ApiError: class ApiError extends Error {},
}));

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <VerifyEmailPage />
    </MemoryRouter>,
  );
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
  });

  it('confirms the token and shows the success state', async () => {
    vi.mocked(api.post).mockResolvedValue({ message: 'ok' });

    renderAt('/verify-email?token=abc123');

    await waitFor(() => expect(screen.getByText('Konto aktiviert.')).toBeTruthy());
    expect(api.post).toHaveBeenCalledWith('/auth/verify-email', {
      token: 'abc123',
    });
    expect(screen.getByRole('link', { name: 'Zum Login' })).toBeTruthy();
  });

  it('shows the server message when the token is rejected', async () => {
    vi.mocked(api.post).mockRejectedValue(
      new Error('Verification link has expired'),
    );

    renderAt('/verify-email?token=abc123');

    await waitFor(() =>
      expect(screen.getByText('Bestätigung fehlgeschlagen.')).toBeTruthy(),
    );
  });

  it('fails without calling the API when no token is present', () => {
    renderAt('/verify-email');

    expect(screen.getByText('Bestätigung fehlgeschlagen.')).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
  });
});
