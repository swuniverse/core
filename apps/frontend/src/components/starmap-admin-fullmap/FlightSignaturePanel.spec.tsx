import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { FlightSignaturePanel } from './FlightSignaturePanel';
import { useAdminSignatureStore } from '../../stores/admin-signature.store';

const mocks = vi.hoisted(() => ({ get: vi.fn(), isAdmin: true }));
vi.mock('../../services/api', () => ({ api: { get: mocks.get } }));
vi.mock('../../stores/auth.store', () => ({
  useAuthStore: (select: (state: { user: { isAdmin: boolean } }) => unknown) =>
    select({ user: { isAdmin: mocks.isAdmin } }),
}));
const field = {
  fieldId: 9,
  cx: 2,
  cy: 3,
  directions: { NORTH: 0, EAST: 1, SOUTH: 0, WEST: 0 },
};

describe('FlightSignaturePanel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.isAdmin = true;
    useAdminSignatureStore.setState({
      enabled: false,
      filter: 'ALL',
      targetId: '',
      fields: [],
      viewport: { layerId: 5, xStart: 1, xEnd: 10, yStart: 2, yEnd: 8 },
    });
  });

  it('loads the visible window and switches between all, ship, player and alliance filters', async () => {
    mocks.get.mockResolvedValue([field]);
    render(<FlightSignaturePanel />);
    expect(mocks.get).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Flugsignaturen'));
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1));
    expect(mocks.get.mock.calls[0][0]).toBe(
      '/starmap/admin/layers/5/flight-signatures?xStart=1&xEnd=10&yStart=2&yEnd=8&filter=ALL',
    );
    await waitFor(() =>
      expect(useAdminSignatureStore.getState().fields).toEqual([field]),
    );
    for (const [filter, label, id] of [
      ['SPACECRAFT', 'Schiffs-ID', '12'],
      ['USER', 'Spieler-ID', '34'],
      ['ALLIANCE', 'Allianz-ID', '56'],
    ]) {
      fireEvent.change(screen.getByLabelText('Signaturfilter'), {
        target: { value: filter },
      });
      expect(useAdminSignatureStore.getState().fields).toEqual([]);
      fireEvent.change(screen.getByLabelText(label), { target: { value: id } });
      await waitFor(() =>
        expect(mocks.get).toHaveBeenLastCalledWith(
          expect.stringContaining(`filter=${filter}&targetId=${id}`),
        ),
      );
    }
    fireEvent.change(screen.getByLabelText('Signaturfilter'), {
      target: { value: 'ALL' },
    });
    await waitFor(() =>
      expect(mocks.get).toHaveBeenLastCalledWith(
        expect.stringMatching(/filter=ALL$/),
      ),
    );
  });

  it('ignores stale filter responses and clears the overlay when disabled', async () => {
    let resolveOld!: (fields: (typeof field)[]) => void;
    mocks.get
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve;
          }),
      )
      .mockResolvedValue([field]);
    render(<FlightSignaturePanel />);
    fireEvent.click(screen.getByLabelText('Flugsignaturen'));
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText('Signaturfilter'), {
      target: { value: 'USER' },
    });
    fireEvent.change(screen.getByLabelText('Spieler-ID'), {
      target: { value: '34' },
    });
    await waitFor(() =>
      expect(useAdminSignatureStore.getState().fields).toEqual([field]),
    );
    await act(async () => resolveOld([{ ...field, fieldId: 99 }]));
    expect(useAdminSignatureStore.getState().fields).toEqual([field]);
    fireEvent.click(screen.getByLabelText('Flugsignaturen'));
    expect(useAdminSignatureStore.getState().fields).toEqual([]);
  });

  it('refreshes the window after panning and exposes failures with an empty overlay', async () => {
    mocks.get
      .mockResolvedValueOnce([field])
      .mockRejectedValue(new Error('Admin access required'));
    render(<FlightSignaturePanel />);
    fireEvent.click(screen.getByLabelText('Flugsignaturen'));
    await waitFor(() =>
      expect(useAdminSignatureStore.getState().fields).toEqual([field]),
    );
    act(() =>
      useAdminSignatureStore
        .getState()
        .setViewport({ layerId: 5, xStart: 11, xEnd: 20, yStart: 2, yEnd: 8 }),
    );
    expect(useAdminSignatureStore.getState().fields).toEqual([]);
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Admin access required',
    );
    expect(mocks.get).toHaveBeenLastCalledWith(
      expect.stringContaining('xStart=11&xEnd=20'),
    );
  });

  it('hides controls and sends no signature requests for map editors', () => {
    mocks.isAdmin = false;
    useAdminSignatureStore.setState({ enabled: true, fields: [field] });
    render(<FlightSignaturePanel />);
    expect(screen.queryByLabelText('Flugsignaturen')).toBeNull();
    expect(mocks.get).not.toHaveBeenCalled();
    expect(useAdminSignatureStore.getState().fields).toEqual([]);
  });
});
