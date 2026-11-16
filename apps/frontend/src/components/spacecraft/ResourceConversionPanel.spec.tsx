import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ShipControlCenter } from './ShipControlCenter';
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('../../services/api', () => ({ api: mocks }));
vi.mock('../../lib/assets', () => ({ commodityImage: () => '/commodity.png' }));
const state = { active: false, cooldown: 0, integrity: 100 };
const data = {
  active: false,
  selectedCommodityId: null,
  options: [
    {
      sourceCommodityId: 63,
      targetCommodityId: 5,
      sourceName: 'Rohgas',
      targetName: 'Hypermaterie',
      inputAmount: 100,
      outputAmount: 10,
      mode: 'COMPRESSOR',
      producible: true,
    },
    {
      sourceCommodityId: 68,
      targetCommodityId: 16,
      sourceName: 'Mineralgas',
      targetName: 'Erz',
      inputAmount: 100,
      outputAmount: 8,
      mode: 'SUBLIMATOR',
      producible: true,
    },
    {
      sourceCommodityId: 64,
      targetCommodityId: 6,
      sourceName: 'Partikel',
      targetName: 'Brennstoff',
      inputAmount: 150,
      outputAmount: 3,
      mode: 'COMPRESSOR',
      producible: false,
    },
  ],
  activationEps: 15,
  epsPerTick: 10,
  blockReason: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockImplementation((path: string) =>
    Promise.resolve(
      path.endsWith('torpedoes')
        ? { fireable: [], transport: [], capacity: 0 }
        : data,
    ),
  );
});
it('chooses a conversion with batch sizes through shared ship/station control and starts/stops it', async () => {
  const update = vi.fn();
  mocks.post.mockResolvedValue({
    ...data,
    active: true,
    selectedCommodityId: 68,
  });
  mocks.delete.mockResolvedValue(data);
  render(
    <ShipControlCenter
      shipId={2}
      systems={{ RESOURCE_CONVERTER: state }}
      onUpdate={update}
    />,
  );
  await screen.findByRole('option', { name: '100 Mineralgas → 8 Erz' });
  fireEvent.change(screen.getByLabelText('Umwandlung'), {
    target: { value: '68' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Umwandeln' }));
  expect(await screen.findByText(/Umwandlung aktiv: Erz/)).toBeTruthy();
  expect(mocks.post).toHaveBeenCalledWith('/spacecraft/2/resource-conversion', {
    commodityId: 68,
  });
  fireEvent.click(screen.getByRole('button', { name: 'Umwandlung beenden' }));
  await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
  expect(mocks.delete).toHaveBeenCalledWith(
    '/spacecraft/2/resource-conversion',
  );
  expect(screen.getByText(/Umwandlung inaktiv/)).toBeTruthy();
});
it('explains blocked conversion and rejects submission', async () => {
  mocks.get.mockResolvedValue({
    ...data,
    blockReason: 'Mindestens 15 EPS erforderlich',
  });
  render(
    <ShipControlCenter
      shipId={2}
      systems={{ RESOURCE_CONVERTER: state }}
      onUpdate={vi.fn()}
    />,
  );
  expect(
    await screen.findByText('Mindestens 15 EPS erforderlich'),
  ).toBeTruthy();
  expect(
    (
      screen.getByRole('button', {
        name: 'Umwandeln',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
it('does not expose conversion without an installed refinery', () => {
  render(<ShipControlCenter shipId={2} systems={{}} onUpdate={vi.fn()} />);
  expect(screen.queryByText('Molekular-Raffinerie')).toBeNull();
});
it('keeps API errors visible without reporting success', async () => {
  mocks.post.mockRejectedValue(new Error('Raffineriezustand ist gesperrt'));
  const update = vi.fn();
  render(
    <ShipControlCenter
      shipId={2}
      systems={{ RESOURCE_CONVERTER: state }}
      onUpdate={update}
    />,
  );
  await screen.findByRole('option', { name: /Rohgas/ });
  fireEvent.click(screen.getByRole('button', { name: 'Umwandeln' }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(update).not.toHaveBeenCalled();
});

it('disables unresearched target commodities and refuses their submission', async () => {
  render(
    <ShipControlCenter
      shipId={2}
      systems={{ RESOURCE_CONVERTER: state }}
      onUpdate={vi.fn()}
    />,
  );
  const option = await screen.findByRole('option', {
    name: '150 Partikel → 3 Brennstoff (Forschung fehlt)',
  });
  expect((option as HTMLOptionElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Umwandlung'), {
    target: { value: '64' },
  });
  expect(
    (screen.getByRole('button', { name: 'Umwandeln' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(
    screen.getByRole('group', { name: 'Partikelkompressor' }),
  ).toBeTruthy();
  expect(screen.getByRole('group', { name: 'Sublimator' })).toBeTruthy();
});
