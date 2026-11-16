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

describe('SettingsPage RPG behavior', () => {
  beforeEach(() => {
    apiMocks.get.mockReset().mockResolvedValue({ rpg_behavior: '0' });
    apiMocks.post.mockReset().mockResolvedValue({});
    apiMocks.patch.mockReset().mockResolvedValue({});
  });

  it('offers all four behaviors and saves a selection', async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Gameplay' }));

    const selector = await screen.findByLabelText('RPG-Verhalten') as HTMLSelectElement;
    expect(Array.from(selector.options).map((option) => [option.value, option.textContent])).toEqual([
      ['0', 'Nicht gesetzt'],
      ['1', 'Betreibt gerne Rollenspiel'],
      ['2', 'Betreibt gelegentlich Rollenspiel'],
      ['3', 'Betreibt ungern Rollenspiel'],
    ]);
    fireEvent.change(selector, { target: { value: '2' } });
    await waitFor(() => expect(apiMocks.patch).toHaveBeenCalledWith('/user/settings', { rpg_behavior: '2' }));
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


describe('Public online-status privacy', () => {
  it('shows the default and saves opting out', async () => {
    apiMocks.get.mockReset().mockResolvedValue({ show_online_status: '1' });
    apiMocks.patch.mockReset().mockResolvedValue({});
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Gameplay' }));
    const toggle = await screen.findByRole('switch', { name: 'Online-Status öffentlich anzeigen' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    await waitFor(() => expect(apiMocks.patch).toHaveBeenCalledWith('/user/settings', { show_online_status: '0' }));
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });
});
