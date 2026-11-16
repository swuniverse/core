import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import type { ColonySandboxPreviewDto } from '@swuniverse/shared';
import { ColonySandboxPreview } from './ColonySandboxPreview';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../../services/api', () => ({ api: mocks }));
const metrics = {
  energyBalance: 3,
  energyProduction: 5,
  energyConsumption: 2,
  energyMax: 100,
  population: 10,
  housing: 20,
  housingFree: 10,
  workers: 4,
  freeWorkers: 6,
  lifeStandard: 5,
  lifeStandardPercent: 50,
};
const preview: ColonySandboxPreviewDto = {
  sourceColonyName: 'Naboo',
  sandbox: {
    ...metrics,
    energyBalance: -2,
    workers: 6,
    housing: 30,
    lifeStandardPercent: 70,
  },
  colony: metrics,
  difference: {
    energyBalance: -5,
    energyProduction: 0,
    energyConsumption: 0,
    energyMax: 0,
    population: 0,
    housing: 10,
    housingFree: 0,
    workers: 2,
    freeWorkers: 0,
    lifeStandard: 0,
    lifeStandardPercent: 20,
  },
  production: [
    {
      commodityId: 1,
      name: 'Nahrung',
      kind: 'WARE',
      sandbox: 7,
      colony: 3,
      difference: 4,
    },
    {
      commodityId: 2,
      name: 'Duranium',
      kind: 'WARE',
      sandbox: -1,
      colony: 0,
      difference: -1,
    },
  ],
};

describe('sandbox preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue(preview);
  });
  it('shows balances and signed colony vs sandbox differences, including percentage points and each commodity', async () => {
    render(<ColonySandboxPreview sandboxId={8} revision={{}} />);
    const row = await screen.findByRole('row', { name: /Energiebilanz/ });
    expect(within(row).getByText('3')).toBeTruthy();
    expect(within(row).getByText('-2')).toBeTruthy();
    expect(within(row).getByText('-5')).toBeTruthy();
    expect(
      within(screen.getByRole('row', { name: /Wohnraum gesamt/ })).getByText(
        '+10',
      ),
    ).toBeTruthy();
    expect(
      within(screen.getByRole('row', { name: /Lebensstandard.*%/ })).getByText(
        '+20 PP',
      ),
    ).toBeTruthy();
    expect(
      within(screen.getByRole('row', { name: /Nahrung/ })).getByText('+4'),
    ).toBeTruthy();
    expect(mocks.get).toHaveBeenCalledWith('/colonies/sandboxes/8/preview');
  });
  it('refreshes after plan changes and ignores a late response for an old selection', async () => {
    let resolveOld!: (value: ColonySandboxPreviewDto) => void;
    mocks.get
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve;
          }),
      )
      .mockResolvedValue({ ...preview, sourceColonyName: 'Coruscant' });
    const { rerender } = render(
      <ColonySandboxPreview sandboxId={8} revision={{}} />,
    );
    rerender(<ColonySandboxPreview sandboxId={9} revision={{}} />);
    expect(await screen.findByText(/Coruscant/)).toBeTruthy();
    resolveOld(preview);
    await waitFor(() => expect(screen.queryByText(/Naboo/)).toBeNull());
    rerender(<ColonySandboxPreview sandboxId={9} revision={{}} />);
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(3));
    fireEvent.click(
      screen.getByRole('button', { name: 'Vergleich aktualisieren' }),
    );
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(4));
  });
  it('keeps the planning balance when the source is unavailable and displays loading errors', async () => {
    mocks.get.mockResolvedValue({
      ...preview,
      colony: null,
      difference: null,
      sourceColonyName: null,
      production: preview.production.map((row) => ({
        ...row,
        colony: null,
        difference: null,
      })),
    });
    const { rerender } = render(
      <ColonySandboxPreview sandboxId={8} revision={{}} />,
    );
    expect(
      await screen.findByText(/Quellkolonie.*nicht verfügbar/),
    ).toBeTruthy();
    expect(
      within(screen.getByRole('row', { name: /Energiebilanz/ })).getByText(
        '-2',
      ),
    ).toBeTruthy();
    mocks.get.mockRejectedValue(new Error('Vorschau fehlgeschlagen'));
    rerender(<ColonySandboxPreview sandboxId={8} revision={{}} />);
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Vorschau fehlgeschlagen',
    );
  });
});
