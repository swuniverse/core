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
  canTransferReactorCharge: true,
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
    expect(
      screen.getByRole('heading', { name: /Reaktor \+ Antrieb/ }),
    ).toBeTruthy();
    expect(
      document.querySelector('[src="/assets/buttons/fusrkt.png"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[src="/assets/buttons/battp2.png"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[src="/assets/buttons/transfer.png"]'),
    ).toBeTruthy();
    await waitFor(() => expect(screen.getByText('2')).toBeTruthy());
    expect(screen.getByText('+8')).toBeTruthy();
    expect(
      screen.getByRole('checkbox', {
        name: 'Überschüssige Energie übertragen',
      }),
    ).toBeTruthy();

    expect(screen.getByText('Hyperantrieb 5/20')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'deaktivieren' })).toBeTruthy();
  });

  it('distinguishes reserve charge, capacity, damaged output and its exact recipe', async () => {
    apiMocks.get.mockResolvedValue({
      epsProduction: 10,
      warpProduction: 0,
      reactorOutput: 11,
      reactorTheoreticalOutput: 21,
      reactorProfile: {
        key: 'RESERVE_HYPERMATTER',
        label: 'Hypermaterie-Reservekern',
        loadUnits: 85,
        costs: [
          { commodityId: 8, amount: 2 },
          { commodityId: 6, amount: 3 },
          { commodityId: 7, amount: 2 },
        ],
      },
    });
    render(<ReactorPanel {...props} reactorFuel={85} reactorFuelMax={420} />);
    await waitFor(() =>
      expect(
        screen.getByText(/Hypermaterie-Reservekern · Ladung 85\/420/),
      ).toBeTruthy(),
    );
    expect(screen.getByText(/Leistung: 11\/21/).textContent).toContain(
      '+85 aus 2 Kyber-Kristalle + 3 Antimaterie + 2 Plasma',
    );
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
      (
        screen.getByLabelText(
          'Reaktorverteilung EPS-Anteil',
        ) as HTMLInputElement
      ).value,
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
      (
        screen.getByLabelText(
          'Reaktorverteilung EPS-Anteil',
        ) as HTMLInputElement
      ).value,
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

  it('loads transfer targets and sends selected reactor charges together', async () => {
    apiMocks.get.mockImplementation(async (path: string) =>
      path.endsWith('/reactor-transfer-targets')
        ? [
            { shipId: 3, name: 'Gamma', reactorFuel: 2, reactorFuelMax: 10 },
            { shipId: 4, name: 'Delta', reactorFuel: 0, reactorFuelMax: 5 },
          ]
        : {
            epsProduction: 8,
            warpProduction: 2,
            effectiveEpsProduction: 8,
            effectiveWarpProduction: 2,
          },
    );
    apiMocks.post.mockResolvedValue({ transferred: 9 });
    render(<ReactorPanel {...props} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Reaktorladung übertragen' }),
    );
    fireEvent.change(await screen.findByLabelText('Gamma Transfermenge'), {
      target: { value: '4' },
    });
    fireEvent.change(screen.getByLabelText('Delta Transfermenge'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Transfer ausführen' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/spacecraft/2/reactor-charge/transfer',
        {
          transfers: [
            { targetShipId: 3, amount: 4 },
            { targetShipId: 4, amount: 5 },
          ],
        },
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
