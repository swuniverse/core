import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StationUplinkPanel } from './StationUplinkPanel';
const mocks = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('../../services/api', () => ({ api: mocks }));
const data = {
  system: { active: false, cooldown: 0, integrity: 100 },
  ownCrew: 2,
  crewRequired: 2,
  capacity: 3,
  activationEps: 0,
  epsPerTick: 5,
  activationReason: null,
  guests: [{ id: 3, name: 'Gast', ownerId: 4, ownerName: 'Pilot' }],
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockResolvedValue(data);
  mocks.patch.mockResolvedValue({});
});

it('shows owner crew, foreign player slots and tick EPS and permits manual activation', async () => {
  const update = vi.fn();
  render(
    <StationUplinkPanel shipId={2} refreshKey="first" onUpdate={update} />,
  );
  expect(await screen.findByText((_, element) => element?.tagName === 'DIV' && element.textContent === 'Gast · Pilot')).toBeTruthy();
  expect(
    screen.getByText(/Eigene Crew: 2\/2 · Fremdspielerplätze: 1\/3/),
  ).toBeTruthy();
  expect(screen.getByText(/5 EPS\/Tick/)).toBeTruthy();
  fireEvent.click(
    screen.getByRole('button', { name: 'Kooperationsuplink aktivieren' }),
  );
  await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  expect(mocks.patch).toHaveBeenCalledWith('/spacecraft/2/systems/UPLINK', {
    active: true,
  });
});

it('explains insufficient owner crew and blocks activation', async () => {
  mocks.get.mockResolvedValue({
    ...data,
    ownCrew: 1,
    activationReason: 'Nicht genug Crew des Stationsbesitzers',
  });
  render(
    <StationUplinkPanel shipId={2} refreshKey="first" onUpdate={vi.fn()} />,
  );
  expect(
    await screen.findByText('Nicht genug Crew des Stationsbesitzers'),
  ).toBeTruthy();
  expect(
    (
      screen.getByRole('button', {
        name: 'Kooperationsuplink aktivieren',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
