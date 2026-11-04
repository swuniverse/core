import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from './settings';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock('../services/api', () => ({ api: apiMocks }));

describe('SettingsPage territorial color', () => {
  beforeEach(() => {
    apiMocks.get.mockReset().mockResolvedValue({ default_view: 'maindesk', rgb_code: '#123456' });
    apiMocks.post.mockReset().mockResolvedValue({});
    apiMocks.patch.mockReset().mockResolvedValue({});
  });

  it('shows the saved color, saves a selection, and resets it', async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Gameplay' }));

    const picker = await screen.findByLabelText('Territorialfarbe') as HTMLInputElement;
    expect(picker.value).toBe('#123456');
    expect(screen.getByText('#123456')).toBeTruthy();
    expect(picker.type).toBe('color');
    fireEvent.change(picker, { target: { value: '#abcdef' } });
    await waitFor(() => expect(apiMocks.patch).toHaveBeenCalledWith('/user/settings', { rgb_code: '#abcdef' }));
    expect(screen.getByText('#abcdef')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Territorialfarbe zurücksetzen' }));
    await waitFor(() => expect(apiMocks.patch).toHaveBeenLastCalledWith('/user/settings', { rgb_code: '' }));
    expect(screen.getByText('Keine Territorialfarbe')).toBeTruthy();
  });

  it('shows the error and retains the previous color when saving fails', async () => {
    apiMocks.patch.mockRejectedValueOnce(new Error('Speichern fehlgeschlagen'));
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Gameplay' }));

    const picker = await screen.findByLabelText('Territorialfarbe') as HTMLInputElement;
    fireEvent.change(picker, { target: { value: '#abcdef' } });
    expect((await screen.findByRole('alert')).textContent).toContain('Speichern fehlgeschlagen');
    expect(picker.value).toBe('#123456');
  });
});

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
