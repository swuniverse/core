import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ReactorPanel } from './ReactorPanel';

const apiMocks = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

const props = {
  shipId: 2,
  energy: 40,
  energyMax: 100,
  reactorOutput: 12,
  warpdrive: 5,
  warpdriveMax: 20,
  battery: 3,
  batteryMax: 10,
  reactorFuel: 4,
  reactorFuelMax: 12,
  reactorWarpSplit: 30,
  hyperdriveActive: true,
  inSystem: false,
  onUpdate: vi.fn(),
};

describe('ReactorPanel', () => {
  beforeEach(() => {
    apiMocks.post.mockReset();
    apiMocks.patch.mockReset();
    props.onUpdate.mockReset();
  });

  it('shows authoritative compact reactor controls', async () => {
    render(<ReactorPanel {...props} />);
    expect(screen.getByText(/EPS 40\/100/)).toBeTruthy();
    expect(screen.getByText(/Reaktorleistung: 12/)).toBeTruthy();
    expect(screen.queryByText(/EPS \+/)).toBeNull();

    expect(screen.getByText('Hyperantriebsenergie 5/20')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Hyperantrieb deaktivieren' }),
    ).toBeTruthy();
  });

  it('hides hyperdrive controls inside a star system', () => {
    render(<ReactorPanel {...props} inSystem />);
    expect(screen.queryByText('Hyperantriebsenergie 5/20')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Hyperantrieb deaktivieren' }),
    ).toBeNull();
  });

  it('sends clamped split changes and rolls back after failure', async () => {
    vi.useFakeTimers();
    apiMocks.patch.mockImplementation(async () => {
      throw new Error('Verteilung blockiert');
    });
    render(<ReactorPanel {...props} />);
    fireEvent.click(
      screen.getByRole('button', { name: /Hyperantriebsaufladung erhöhen/i }),
    );
    expect(screen.getByText('EPS-Anteil 25%')).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(apiMocks.patch).toHaveBeenCalledWith(
      '/spacecraft/2/reactor-distribution',
      { warpSplit: 25 },
    );
    expect(screen.getByRole('alert').textContent).toContain(
      'Verteilung blockiert',
    );
    expect(screen.getByText('EPS-Anteil 30%')).toBeTruthy();
    vi.useRealTimers();
  });

  it('uses explicit amount and MAX engineering endpoints', async () => {
    apiMocks.post.mockResolvedValue({ transferred: 2 });
    render(<ReactorPanel {...props} />);
    fireEvent.change(screen.getByLabelText('Reaktor laden Menge'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reaktor laden' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/reactor/load', {
        amount: 2,
      }),
    );
    const maxButtons = screen.getAllByRole('button', { name: 'max' });
    fireEvent.click(maxButtons[1]);
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/spacecraft/2/battery/discharge',
        { amount: 'MAX' },
      ),
    );
  });

  it('reports reactor loading failures and clears pending state', async () => {
    apiMocks.post.mockImplementation(async () => {
      throw new Error('Reaktor offline');
    });
    render(<ReactorPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reaktor laden' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Reaktor offline',
    );
    expect(
      (
        screen.getByRole('button', {
          name: 'Reaktor laden',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
});
