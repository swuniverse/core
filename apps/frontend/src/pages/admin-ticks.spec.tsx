import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { TickRunDto } from '@swuniverse/shared';
import { api } from '../services/api';
import { AdminTicksPage } from './admin-ticks';

vi.mock('../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

const run: TickRunDto = {
  type: 'MAIN',
  tickNumber: 42,
  scheduledFor: '2026-10-27T12:00:00.000Z',
  startedAt: '2026-10-27T12:00:01.000Z',
  completedAt: '2026-10-27T12:00:04.000Z',
  durationMs: 3000,
  status: 'COMPLETED',
  error: null,
};

describe('AdminTicksPage', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue([run]);
    vi.mocked(api.post).mockResolvedValue({ status: 'COMPLETED' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('shows runs and triggers a confirmed job', async () => {
    render(<MemoryRouter><AdminTicksPage /></MemoryRouter>);

    expect(await screen.findByText('Haupttick')).toBeTruthy();
    expect(screen.getByText('3,0 s')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Haupttick starten' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/admin/ticks/MAIN/run', {}),
    );
    expect(window.confirm).toHaveBeenCalled();
  });
});
