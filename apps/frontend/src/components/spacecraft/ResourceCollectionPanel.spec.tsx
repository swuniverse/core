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
  state: 'IDLE',
  selectedCommodityId: null,
  options: [
    {
      commodityId: 3,
      name: 'Tibanna-Gas',
      rate: 100,
      stock: 10000,
      maxStock: 10000,
    },
    {
      commodityId: 9,
      name: 'Phrik-Erz',
      rate: 60,
      stock: 340,
      maxStock: 10000,
    },
  ],
  freeCargo: 150,
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
it('chooses a field resource through ship control, starts and stops collection', async () => {
  const update = vi.fn();
  mocks.post.mockResolvedValue({
    ...data,
    state: 'GATHER_RESOURCES',
    selectedCommodityId: 9,
  });
  mocks.delete.mockResolvedValue(data);
  render(
    <ShipControlCenter
      shipId={2}
      systems={{ RESOURCE_COLLECTOR: state }}
      onUpdate={update}
    />,
  );
  await screen.findByRole('option', { name: 'Phrik-Erz · Vorrat 340/10000' });
  fireEvent.change(screen.getByLabelText('Ressource'), {
    target: { value: '9' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Sammeln' }));
  expect(await screen.findByText(/Sammelt Phrik-Erz/)).toBeTruthy();
  expect(mocks.post).toHaveBeenCalledWith('/spacecraft/2/resource-collection', {
    commodityId: 9,
  });
  fireEvent.click(screen.getByRole('button', { name: 'Sammeln beenden' }));
  await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
  expect(mocks.delete).toHaveBeenCalledWith(
    '/spacecraft/2/resource-collection',
  );
  expect(screen.getByText(/Sammeln inaktiv/)).toBeTruthy();
});
it('explains blocked collection and rejects submission', async () => {
  mocks.get.mockResolvedValue({
    ...data,
    blockReason: 'Schilde müssen deaktiviert sein',
  });
  render(
    <ShipControlCenter
      shipId={2}
      systems={{ RESOURCE_COLLECTOR: state }}
      onUpdate={vi.fn()}
    />,
  );
  expect(
    await screen.findByText('Schilde müssen deaktiviert sein'),
  ).toBeTruthy();
  expect(
    (
      screen.getByRole('button', {
        name: 'Sammeln',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
it('does not expose resource collection without an installed collector', () => {
  render(<ShipControlCenter shipId={2} systems={{}} onUpdate={vi.fn()} />);
  expect(screen.queryByText('Ressourcen-Kollektor')).toBeNull();
});
it('keeps API errors visible without reporting success', async () => {
  mocks.post.mockRejectedValue(new Error('Sammelzustand ist gesperrt'));
  const update = vi.fn();
  render(
    <ShipControlCenter
      shipId={2}
      systems={{ RESOURCE_COLLECTOR: state }}
      onUpdate={update}
    />,
  );
  await screen.findByRole('option', { name: /Tibanna/ });
  fireEvent.click(screen.getByRole('button', { name: 'Sammeln' }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(update).not.toHaveBeenCalled();
});
