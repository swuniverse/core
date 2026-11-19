import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { OnboardingSelection } from './entities/onboarding-selection.entity';
import { OnboardingService } from './onboarding.service';

describe('onboarding selection (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = await connectIntegrationDatabase();
  });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  it('creates one selection when the first visit requests it in parallel', async () => {
    const user = await createUser(source);
    const repo = source.getRepository(OnboardingSelection);
    const service = Object.assign(Object.create(OnboardingService.prototype), {
      onboardingRepo: repo,
    }) as OnboardingService;

    // Both requests pass the existence check before either inserts (the race of the first visit).
    jest
      .spyOn(repo, 'findOne')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const results = await Promise.all([
      service.getOrCreateSelection(user.id),
      service.getOrCreateSelection(user.id),
    ]);

    expect(new Set(results.map((selection) => selection.id)).size).toBe(1);
    expect(await repo.countBy({ userId: user.id })).toBe(1);
  });
});
