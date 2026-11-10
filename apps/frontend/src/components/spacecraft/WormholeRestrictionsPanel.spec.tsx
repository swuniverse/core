import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { StationWormholeRestrictionsDto } from '@swuniverse/shared';
import { WormholeRestrictionsPanel } from './WormholeRestrictionsPanel';
import { ApiError } from '../../services/api';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('../../services/api', () => ({
  api: mocks,
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));
const empty: StationWormholeRestrictionsDto = {
  wormholes: [{ id: 8, name: 'Tor', restrictions: [] }],
};
const configured: StationWormholeRestrictionsDto = {
  wormholes: [
    {
      id: 8,
      name: 'Tor',
      restrictions: [
        { id: 3, targetType: 'FACTION', targetId: 1234, mode: 'DENY' },
      ],
    },
  ],
};

describe('station wormhole rule controls', () => {
  beforeEach(() => {
    mocks.get.mockReset().mockResolvedValue(empty);
    mocks.post.mockReset();
    mocks.delete.mockReset();
  });

  it('creates the selected rule, renders the returned list, and clears the successful input', async () => {
    mocks.post.mockResolvedValue(configured);
    render(<WormholeRestrictionsPanel stationId={9} />);
    await screen.findByText('Keine Regeln: Einflug erlaubt.');
    fireEvent.change(screen.getByLabelText('Wurmloch-Zieltyp'), {
      target: { value: 'FACTION' },
    });
    fireEvent.change(screen.getByLabelText('Wurmloch-Ziel-ID'), {
      target: { value: '1234' },
    });
    fireEvent.change(screen.getByLabelText('Wurmloch-Modus'), {
      target: { value: 'DENY' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Wurmlochregel hinzufügen' }),
    );
    expect(await screen.findByText('Fraktions-ID 1.234')).toBeTruthy();
    expect(screen.getByText('Verboten')).toBeTruthy();
    expect(mocks.post).toHaveBeenCalledWith(
      '/spacecraft/9/wormhole-restrictions',
      { wormholeId: 8, targetType: 'FACTION', targetId: 1234, mode: 'DENY' },
    );
    expect(
      (screen.getByLabelText('Wurmloch-Ziel-ID') as HTMLInputElement).value,
    ).toBe('');
  });

  it('deletes the selected rule and renders the unrestricted state', async () => {
    mocks.get.mockResolvedValue(configured);
    mocks.delete.mockResolvedValue(empty);
    render(<WormholeRestrictionsPanel stationId={9} />);
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Regel für Fraktions-ID 1.234 löschen',
      }),
    );
    expect(
      await screen.findByText('Keine Regeln: Einflug erlaubt.'),
    ).toBeTruthy();
    expect(screen.queryByText('Verboten')).toBeNull();
    expect(mocks.delete).toHaveBeenCalledWith(
      '/spacecraft/9/wormhole-restrictions/3',
    );
  });

  it('does not show management controls when the server denies station access', async () => {
    mocks.get.mockRejectedValue(
      new ApiError(403, 'Wurmlochverwaltung nicht erlaubt'),
    );
    render(<WormholeRestrictionsPanel stationId={9} />);
    await waitFor(() =>
      expect(mocks.get).toHaveBeenCalledWith(
        '/spacecraft/9/wormhole-restrictions',
      ),
    );
    expect(
      screen.queryByRole('heading', { name: 'Wurmloch-Zugangsregeln' }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Wurmlochregel hinzufügen' }),
    ).toBeNull();
  });

  it('reports failed creation without discarding input or the existing list', async () => {
    mocks.post.mockRejectedValue(new Error('Das Ziel existiert nicht'));
    render(<WormholeRestrictionsPanel stationId={9} />);
    await screen.findByText('Keine Regeln: Einflug erlaubt.');
    fireEvent.change(screen.getByLabelText('Wurmloch-Ziel-ID'), {
      target: { value: '42' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Wurmlochregel hinzufügen' }),
    );
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Das Ziel existiert nicht',
    );
    expect(
      (screen.getByLabelText('Wurmloch-Ziel-ID') as HTMLInputElement).value,
    ).toBe('42');
    expect(screen.getByText('Keine Regeln: Einflug erlaubt.')).toBeTruthy();
    await waitFor(() =>
      expect(
        (
          screen.getByRole('button', {
            name: 'Wurmlochregel hinzufügen',
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
  });
});
