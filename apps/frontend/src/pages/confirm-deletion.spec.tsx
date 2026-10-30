import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConfirmDeletionPage } from './confirm-deletion';
import type * as ApiModule from '../services/api';

const apiMocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, api: apiMocks };
});

describe('ConfirmDeletionPage', () => {
  it('confirms the token and shows success', async () => {
    apiMocks.post.mockResolvedValue({ message: 'ok' });
    render(<MemoryRouter initialEntries={['/confirm-deletion?token=secret']}><ConfirmDeletionPage /></MemoryRouter>);

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/auth/confirm-deletion', { token: 'secret' }));
    expect(await screen.findByText('Deine Kontolöschung wurde bestätigt.')).toBeTruthy();
  });

  it('shows a visible error without a token', async () => {
    render(<MemoryRouter initialEntries={['/confirm-deletion']}><ConfirmDeletionPage /></MemoryRouter>);
    expect(await screen.findByText('Der Link ist ungültig oder abgelaufen')).toBeTruthy();
  });
});
