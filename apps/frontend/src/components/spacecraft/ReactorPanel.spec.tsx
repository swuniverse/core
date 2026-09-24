import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ReactorPanel } from './ReactorPanel';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));
vi.mock('../../services/api', () => ({ api: apiMocks }));

const props = {
  shipId: 2,
  warpdrive: 5,
  warpdriveMax: 20,
  battery: 3,
  batteryMax: 10,
  reactorFuel: 4,
  reactorFuelMax: 12,
  reactorWarpSplit: 30,
  reactorAutoCarryOver: false,
  hyperdriveActive: true,
  inSystem: false,
  onUpdate: vi.fn(),
};

describe('ReactorPanel', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.patch.mockReset();
    apiMocks.get.mockResolvedValue({
      epsProduction: 8,
      warpProduction: 2,
      effectiveEpsProduction: 8,
      effectiveWarpProduction: 2,
    });
    props.onUpdate.mockReset();
  });

  it('shows authoritative compact reactor controls', async () => {
    render(<ReactorPanel {...props} />);
    expect(screen.getByRole('heading', { name: /Reaktor \+ Antrieb/ })).toBeTruthy();
    expect(document.querySelector('[src="/assets/system/3.png"]')).toBeTruthy();
    expect(document.querySelector('[src="/assets/buttons/warpsys.png"]')).toBeTruthy();
    expect(document.querySelector('[src="/assets/buttons/eps.png"]')).toBeTruthy();
    expect(document.querySelector('[src="/assets/buttons/e_trans2.png"]')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Antrieb +2')).toBeTruthy());
    expect(screen.getByText('EPS +8')).toBeTruthy();
    expect(
      screen.getByRole('checkbox', {
        name: 'Überschüssige Energie übertragen',
      }),
    ).toBeTruthy();

    expect(screen.getByText('Hyperantrieb 5/20')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'deaktivieren' })).toBeTruthy();
  });

  it('hides hyperdrive controls inside a star system', () => {
    render(<ReactorPanel {...props} inSystem />);
    expect(screen.queryByText('Hyperantrieb 5/20')).toBeNull();
    expect(screen.queryByRole('button', { name: 'deaktivieren' })).toBeNull();
  });

  it('sends clamped split changes and rolls back after failure', async () => {
    vi.useFakeTimers();
    apiMocks.patch.mockImplementation(async () => {
      throw new Error('Verteilung blockiert');
    });
    render(<ReactorPanel {...props} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Hyperantriebsaufladung erhöhen' }),
    );
    expect(
      (screen.getByLabelText('Reaktorverteilung EPS-Anteil') as HTMLInputElement)
        .value,
    ).toBe('25');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(apiMocks.patch).toHaveBeenCalledWith(
      '/spacecraft/2/reactor-distribution',
      { warpSplit: 25, autoCarryOver: false },
    );
    expect(screen.getByRole('alert').textContent).toContain(
      'Verteilung blockiert',
    );
    expect(
      (screen.getByLabelText('Reaktorverteilung EPS-Anteil') as HTMLInputElement)
        .value,
    ).toBe('30');
    vi.useRealTimers();
  });

  it('persists automatic energy transfer with the current split', async () => {
    apiMocks.patch.mockResolvedValue({
      reactorWarpSplit: 30,
      reactorAutoCarryOver: true,
    });
    render(<ReactorPanel {...props} />);

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Überschüssige Energie übertragen',
      }),
    );

    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith(
        '/spacecraft/2/reactor-distribution',
        { warpSplit: 30, autoCarryOver: true },
      ),
    );
  });

  it('uses explicit amount and MAX engineering endpoints', async () => {
    apiMocks.post.mockResolvedValue({ transferred: 2 });
    render(<ReactorPanel {...props} />);
    fireEvent.change(screen.getByLabelText('Reaktor laden Menge'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'aufladen' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'aufladen' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Reaktor offline',
    );
    expect(
      (
        screen.getByRole('button', {
          name: 'aufladen',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
});
