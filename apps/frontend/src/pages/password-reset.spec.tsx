import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ApiError, api } from '../services/api';
import { LostPasswordPage, ResetPasswordPage } from './password-reset';

vi.mock('../services/api', () => ({
  api: { post: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message);
    }
  },
}));

vi.mock('../components/auth/StarField', () => ({
  StarField: () => null,
}));

describe('password reset pages', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requests a reset link for the submitted login', async () => {
    vi.mocked(api.post).mockResolvedValue({ message: 'ok' });

    render(
      <MemoryRouter>
        <LostPasswordPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Login-Name oder E-Mail-Adresse'), {
      target: { value: 'commander@example.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset-Link senden' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/lost-password', {
        login: 'commander@example.test',
      }),
    );
    expect(screen.getByRole('status').textContent).toContain('E-Mail');
  });

  it('sends the query token and displays an invalid-link error', async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError(400, 'Ungültiger Link'));

    render(
      <MemoryRouter initialEntries={['/reset-password?token=reset-token']}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Neues Passwort'), {
      target: { value: 'new-password' },
    });
    fireEvent.change(screen.getByLabelText('Passwort bestätigen'), {
      target: { value: 'new-password' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Passwort zurücksetzen' }),
    );

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'reset-token',
        password: 'new-password',
      }),
    );
    expect(screen.getByRole('alert').textContent).toBe('Ungültiger Link');
  });
});
