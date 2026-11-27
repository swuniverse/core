import { ColonyTickProcessorService } from './colony-tick-processor.service';

function processor(exploration: { discoverSystem: jest.Mock }) {
  const colonyRepo = { increment: jest.fn(async () => ({ affected: 1 })) };
  const service = new ColonyTickProcessorService(
    colonyRepo as never, {} as never, {} as never, {} as never, {} as never,
    {} as never, {} as never, {} as never, {} as never, {} as never, {} as never,
    {} as never, {} as never, {} as never, {} as never, {} as never,
    exploration as never,
  );
  return { service, colonyRepo };
}
const count = (service: ColonyTickProcessorService, colony: object) =>
  (service as unknown as { countActiveTick(c: object): Promise<void> }).countActiveTick(colony);

describe('colony exploration ticks', () => {
  it('enters the system only when the 35th active tick is reached', async () => {
    const exploration = { discoverSystem: jest.fn(async () => undefined) };
    const { service, colonyRepo } = processor(exploration);
    const colony = { id: 1, userId: 9, starSystemId: 7, activeTicks: 33 };

    await count(service, colony);
    expect(exploration.discoverSystem).not.toHaveBeenCalled();
    await count(service, colony);
    expect(colony.activeTicks).toBe(35);
    expect(exploration.discoverSystem).toHaveBeenCalledWith({
      userId: 9, starSystemId: 7, source: 'COLONY_ACTIVE',
    });
    await count(service, colony);
    expect(exploration.discoverSystem).toHaveBeenCalledTimes(1);
    expect(colonyRepo.increment).toHaveBeenCalledTimes(2);
  });
});
