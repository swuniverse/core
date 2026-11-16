import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ShipControlCenter } from './ShipControlCenter';
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: mocks }));
vi.mock('../../lib/assets', () => ({ commodityImage: () => '/commodity.png' }));
const data = {
  isShuttle: false,
  capacity: 2,
  storedCount: 1,
  blockReason: null,
  stored: [
    {
      commodityId: 21401,
      name: 'LAAT Shuttle',
      amount: 1,
      energyCost: 85,
      crewRequired: 5,
      blockReason: null,
    },
  ],
  nearby: [{ id: 3, name: 'U-Wing', blockReason: null }],
  colonies: [],
};
const state = { active: false, integrity: 100, cooldown: 0 };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockImplementation((path: string) =>
    Promise.resolve(
      path.endsWith('torpedoes')
        ? { fireable: [], transport: [], capacity: 0 }
        : data,
    ),
  );
  mocks.post.mockResolvedValue({ shipId: 3 });
});
it('launches and takes back shuttles through the shared ship/station control with costs and capacity', async () => {
  const update = vi.fn();
  render(
    <ShipControlCenter
      shipId={2}
      systems={{ SHUTTLE_RAMP: state }}
      onUpdate={update}
    />,
  );
  expect(await screen.findByText(/1 \/ 2 Shuttleplätze/)).toBeTruthy();
  expect(screen.getByText(/85 EPS · 5 freie Crew/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'LAAT Shuttle starten' }));
  await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  expect(mocks.post).toHaveBeenCalledWith('/spacecraft/2/shuttles/launch', {
    commodityId: 21401,
  });
  fireEvent.click(screen.getByRole('button', { name: 'U-Wing aufnehmen' }));
  await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
  expect(mocks.post).toHaveBeenCalledWith('/spacecraft/2/shuttles/store', {
    targetId: 3,
  });
});
it('lands a shuttle without a ramp and leaves the deleted ship through the completion callback', async () => {
  mocks.get.mockImplementation((path: string) =>
    Promise.resolve(
      path.endsWith('torpedoes')
        ? { fireable: [], transport: [], capacity: 0 }
        : {
            ...data,
            isShuttle: true,
            capacity: 0,
            stored: [],
            nearby: [],
            colonies: [{ id: 7, name: 'Yavin', blockReason: null }],
          },
    ),
  );
  const landed = vi.fn();
  const update = vi.fn();
  render(
    <ShipControlCenter
      shipId={2}
      systems={{}}
      isShuttle
      onUpdate={update}
      onLanded={landed}
    />,
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Auf Yavin landen' }),
  );
  await waitFor(() => expect(landed).toHaveBeenCalledTimes(1));
  expect(mocks.post).toHaveBeenCalledWith('/spacecraft/2/shuttles/land', {
    colonyId: 7,
  });
  expect(update).not.toHaveBeenCalled();
});
it('displays blocked slots, crew and landing capacity and prevents actions', async () => {
  mocks.get.mockImplementation((path: string) =>
    Promise.resolve(
      path.endsWith('torpedoes')
        ? { fireable: [], transport: [], capacity: 0 }
        : {
            ...data,
            isShuttle: true,
            stored: [
              { ...data.stored[0], blockReason: 'Nicht genug freie Crew' },
            ],
            nearby: [
              { ...data.nearby[0], blockReason: 'Shuttlerampe ist belegt' },
            ],
            colonies: [
              {
                id: 7,
                name: 'Yavin',
                blockReason: 'Nicht genug Kolonielager frei',
              },
            ],
          },
    ),
  );
  render(
    <ShipControlCenter
      shipId={2}
      systems={{ SHUTTLE_RAMP: state }}
      onUpdate={vi.fn()}
    />,
  );
  await screen.findByText('Nicht genug freie Crew');
  for (const name of [
    'LAAT Shuttle starten',
    'U-Wing aufnehmen',
    'Auf Yavin landen',
  ])
    expect(
      (screen.getByRole('button', { name }) as HTMLButtonElement).disabled,
    ).toBe(true);
  expect(screen.getByText('Shuttlerampe ist belegt')).toBeTruthy();
  expect(screen.getByText('Nicht genug Kolonielager frei')).toBeTruthy();
  expect(mocks.post).not.toHaveBeenCalled();
});
it('keeps API failures visible and does not report success', async () => {
  mocks.post.mockRejectedValue(new Error('Shuttle-Zustand ist gesperrt'));
  const update = vi.fn();
  render(
    <ShipControlCenter
      shipId={2}
      systems={{ SHUTTLE_RAMP: state }}
      onUpdate={update}
    />,
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'LAAT Shuttle starten' }),
  );
  expect((await screen.findByRole('alert')).textContent).toBe(
    'Shuttle-Zustand ist gesperrt',
  );
  expect(update).not.toHaveBeenCalled();
});
it('hides shuttle management without a ramp or a shuttle and does not load its data', () => {
  render(<ShipControlCenter shipId={2} systems={{}} onUpdate={vi.fn()} />);
  expect(screen.queryByText('Shuttle-Management')).toBeNull();
  expect(mocks.get).not.toHaveBeenCalledWith('/spacecraft/2/shuttles');
});
it('explains the lack of an own landing colony at the current location', async () => {
  mocks.get.mockImplementation((path: string) =>
    Promise.resolve(
      path.endsWith('torpedoes')
        ? { fireable: [], transport: [], capacity: 0 }
        : { ...data, isShuttle: true, colonies: [] },
    ),
  );
  render(
    <ShipControlCenter shipId={2} systems={{}} isShuttle onUpdate={vi.fn()} />,
  );
  expect(
    await screen.findByText('Keine eigene Kolonie am aktuellen Feld.'),
  ).toBeTruthy();
});
