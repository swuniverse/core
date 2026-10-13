import { AlignGameEventHistoryTypes20261013130000 } from '../migrations/20261013130000-align-game-event-history-types';

describe('AlignGameEventHistoryTypes20261013130000', () => {
  it('maps legacy ship events and removes legacy system entries', async () => {
    const query = jest.fn().mockResolvedValue(undefined);

    await new AlignGameEventHistoryTypes20261013130000().up({ query } as never);

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("SET \"type\" = 'SHIP'"),
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("WHERE \"type\" = 'SYSTEM_ENTERED'"),
    );
  });
});
