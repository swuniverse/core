import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from './settings';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock('../services/api', () => ({ api: apiMocks }));

describe('SettingsPage tutorial controls', () => {
  beforeEach(() => {
    apiMocks.get.mockReset().mockResolvedValue({ default_view: 'maindesk' });
    apiMocks.post.mockReset().mockResolvedValue({});
    apiMocks.patch.mockReset().mockResolvedValue({});
  });

  it('resets to enable, disables, and restarts tutorials from Gameplay', async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Gameplay' }));
    expect(await screen.findByRole('heading', { name: 'Tutorial' })).toBeTruthy();

    const toggle = screen.getByRole('switch', { name: 'Tutorials anzeigen' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(toggle);
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/tutorial/reset', {}));
    expect(toggle.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(toggle);
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/tutorial/disable', {}));

    fireEvent.click(screen.getByRole('button', { name: 'Tutorials neu starten' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenLastCalledWith('/tutorial/reset', {}));
  });
});
