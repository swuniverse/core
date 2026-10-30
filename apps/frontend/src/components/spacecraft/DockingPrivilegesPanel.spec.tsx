import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DockingPrivilegesPanel } from './DockingPrivilegesPanel';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

const withRule = {
  autoRead: false,
  privileges: [
    { id: 4, targetType: 'ALLIANCE', targetId: 7, targetName: 'Rebellen', mode: 'DENY' },
  ],
};

describe('DockingPrivilegesPanel', () => {
  beforeEach(() => {
    apiMocks.get.mockReset().mockResolvedValue(withRule);
    apiMocks.post.mockReset();
    apiMocks.delete.mockReset();
  });

  it('lists rules with their mode', async () => {
    render(<DockingPrivilegesPanel stationId={9} />);
    expect(await screen.findByText('Verboten')).toBeTruthy();
    expect(screen.getByText(/Rebellen/)).toBeTruthy();
    expect(apiMocks.get).toHaveBeenCalledWith('/spacecraft/9/docking-privileges');
  });

  it('adds a rule for the chosen target', async () => {
    apiMocks.post.mockResolvedValue({ autoRead: false, privileges: [] });
    render(<DockingPrivilegesPanel stationId={9} />);
    await screen.findByText('Verboten');
    fireEvent.change(screen.getByLabelText('Zieltyp'), { target: { value: 'FACTION' } });
    fireEvent.change(screen.getByLabelText('Ziel-ID'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Modus'), { target: { value: 'DENY' } });
    fireEvent.click(screen.getByRole('button', { name: 'Regel hinzufügen' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/9/docking-privileges', {
        targetType: 'FACTION',
        targetId: 3,
        mode: 'DENY',
      }),
    );
  });

  it('deletes a rule and toggles auto-read', async () => {
    apiMocks.delete.mockResolvedValue({ autoRead: false, privileges: [] });
    apiMocks.post.mockResolvedValue({ autoRead: true, privileges: [] });
    render(<DockingPrivilegesPanel stationId={9} />);
    fireEvent.click(await screen.findByRole('button', { name: /Rebellen löschen/ }));
    await waitFor(() =>
      expect(apiMocks.delete).toHaveBeenCalledWith('/spacecraft/9/docking-privileges/4'),
    );
    fireEvent.click(screen.getByRole('checkbox'));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/9/docking-privileges/auto-read', {
        enabled: true,
      }),
    );
  });

  it('shows the backend error', async () => {
    apiMocks.post.mockImplementation(() => Promise.reject(new Error('Das Ziel existiert nicht')));
    render(<DockingPrivilegesPanel stationId={9} />);
    await screen.findByText('Verboten');
    fireEvent.change(screen.getByLabelText('Ziel-ID'), { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: 'Regel hinzufügen' }));
    expect((await screen.findByRole('alert')).textContent).toContain('existiert nicht');
  });
});
