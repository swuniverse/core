import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TransferDialog } from './TransferDialog';
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: mocks }));
vi.mock('../../lib/assets', () => ({ commodityImage: () => '/commodity.png' }));

it('offers crew admission separately from blocked cargo and caps submission to the uplink slot limit', async () => {
  mocks.get.mockResolvedValue({
    available: false,
    reason: 'Transfer nur zwischen Freunden erlaubt',
    sourceCargo: [],
    targetCargo: [],
    sourceUsed: 0,
    sourceMax: 10,
    targetUsed: 0,
    targetMax: 10,
    sourceCrew: 5,
    sourceCrewMax: 10,
    targetCrew: 2,
    targetCrewMax: 10,
    crewTransferAvailable: true,
    crewTransferReason: null,
    crewTransferMaximum: 1,
    sourceTorpedoes: null,
    targetTorpedoes: null,
    torpedoTransferAvailable: false,
    torpedoTransferReason: 'Transfer nur zwischen Freunden erlaubt',
  });
  mocks.post.mockResolvedValue({});
  const update = vi.fn();
  render(
    <TransferDialog
      shipId={1}
      targetShipId={2}
      targetName="Sensorphalanx"
      direction="TO_TARGET"
      onClose={vi.fn()}
      onTransfer={update}
    />,
  );
  await waitFor(() => expect(mocks.get).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'Crew' }));
  const input = await screen.findByLabelText('Crewmenge');
  expect((input as HTMLInputElement).max).toBe('1');
  fireEvent.change(input, { target: { value: '5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Entladen' }));
  await waitFor(() => expect(update).toHaveBeenCalled());
  expect(mocks.post).toHaveBeenCalledWith('/spacecraft/1/crew/ship-transfer', {
    targetShipId: 2,
    amount: 1,
    direction: 'TO_TARGET',
  });
});

it('quotes a foreign orbit ship as the colony without crew transfer and shows the block reason', async () => {
  mocks.get.mockResolvedValue({
    available: false,
    reason: 'Schilde müssen deaktiviert sein',
    colonyId: 3,
    cargo: { shipUsed: 0, shipMax: 0, colonyFree: 0 },
    shipCargo: [],
    colonyCargo: [],
    crew: { shipCurrent: 0, shipMinimum: 0, shipMax: 0, colonyAvailable: 0, maxLoad: 0, maxUnload: 0 },
    energyPerCapacity: 5,
  });
  render(
    <TransferDialog
      shipId={8}
      colonyId={3}
      direction="TO_COLONY"
      initiator="COLONY"
      crewTransfer={false}
      onClose={vi.fn()}
      onTransfer={vi.fn()}
    />,
  );
  await waitFor(() =>
    expect(mocks.get).toHaveBeenCalledWith(
      '/spacecraft/8/transfer-quote?colonyId=3&initiator=COLONY&direction=TO_COLONY',
    ),
  );
  expect(await screen.findByText(/Schilde müssen deaktiviert sein/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Crew' })).toBeNull();
});
