import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NavicomputerJumpPanel } from './NavicomputerJumpPanel';
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: mocks }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockResolvedValue([
    { id: 1, name: 'Kernwelten', width: 100, height: 100 },
    { id: 7, name: 'Äußerer Rand', width: 200, height: 200 },
  ]);
  mocks.post.mockResolvedValue({
    shipIds: [2, 3],
    locationId: 51,
    cooldownUntil: Date.now() + 300000,
  });
});

async function chooseTarget() {
  await screen.findByRole('option', { name: 'Äußerer Rand' });
  fireEvent.change(screen.getByLabelText('Ebene'), { target: { value: '7' } });
  fireEvent.change(screen.getByLabelText('X'), { target: { value: '120' } });
  fireEvent.change(screen.getByLabelText('Y'), { target: { value: '95' } });
}

it('sends the selected known layer and coordinates, refreshes and immediately blocks another jump', async () => {
  const update = vi.fn().mockResolvedValue(undefined);
  render(<NavicomputerJumpPanel shipId={2} onJump={update} />);
  await chooseTarget();
  fireEvent.click(screen.getByRole('button', { name: 'Springen' }));
  await waitFor(() => expect(update).toHaveBeenCalledOnce());
  expect(mocks.post).toHaveBeenCalledWith('/spacecraft/2/navicomputer-jump', {
    layerId: 7,
    x: 120,
    y: 95,
  });
  expect(
    (screen.getByRole('button', { name: 'Springen' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(screen.getByText(/2 Schiff/)).toBeTruthy();
});

it('shows fleet rejection and permits correcting the target', async () => {
  mocks.post.mockRejectedValue(
    new Error('Wingman: Mindestens 55 EPS erforderlich'),
  );
  const update = vi.fn();
  render(<NavicomputerJumpPanel shipId={2} onJump={update} />);
  await chooseTarget();
  fireEvent.click(screen.getByRole('button', { name: 'Springen' }));
  expect(await screen.findByText(/Wingman/)).toBeTruthy();
  expect(update).not.toHaveBeenCalled();
  expect(
    (screen.getByRole('button', { name: 'Springen' }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
});

it('blocks out-of-bounds coordinates and a persisted cooldown', async () => {
  render(
    <NavicomputerJumpPanel
      shipId={2}
      cooldown={Date.now() + 60000}
      onJump={vi.fn()}
    />,
  );
  await chooseTarget();
  expect(
    (screen.getByRole('button', { name: 'Springen' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(screen.getByText(/Spule kühlt ab/)).toBeTruthy();
});

it('blocks coordinates outside the selected layer', async () => {
  render(<NavicomputerJumpPanel shipId={2} onJump={vi.fn()} />);
  await chooseTarget();
  fireEvent.change(screen.getByLabelText('X'), { target: { value: '201' } });
  expect(
    (screen.getByRole('button', { name: 'Springen' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});
