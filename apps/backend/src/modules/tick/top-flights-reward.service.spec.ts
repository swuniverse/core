jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { TopFlightsRewardService } from './top-flights-reward.service';

describe('TopFlightsRewardService', () => {
  it('awards the STU prestige scale with the placement in each log entry', async () => {
    const ranking = Array.from({ length: 10 }, (_, index) => ({
      userId: index + 1,
      faction: 'REBELLION',
      score: 100 - index,
      shipCount: 1,
    }));
    const rankingService = {
      getFlightRankingForRewards: jest.fn().mockResolvedValue(ranking),
    };
    const prestige = { change: jest.fn().mockResolvedValue(undefined) };
    const service = new TopFlightsRewardService(
      rankingService as never,
      prestige as never,
    );

    await service.run(new Date('2026-10-27T03:00:00Z'));

    expect(prestige.change.mock.calls).toEqual(
      [20, 15, 10, 7, 6, 5, 4, 3, 2, 1].map((amount, index) => [
        index + 1,
        amount,
        `${amount} Prestige erhalten für Platz ${index + 1} unter den Vielfliegern`,
      ]),
    );
  });
});
