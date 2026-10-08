import { DiplomacyCapabilityService } from './diplomacy-capability.service';

describe('DiplomacyCapabilityService', () => {
  it('is disabled until the explicit rollout capability is enabled', () => {
    expect(new DiplomacyCapabilityService({ get: () => undefined } as never).enabled).toBe(
      false,
    );
    expect(
      new DiplomacyCapabilityService({ get: () => 'true' } as never).enabled,
    ).toBe(true);
  });

  it('only accepts the explicit true value', () => {
    expect(
      new DiplomacyCapabilityService({ get: () => 'TRUE' } as never).enabled,
    ).toBe(false);
    expect(
      new DiplomacyCapabilityService({ get: () => '1' } as never).enabled,
    ).toBe(false);
  });
});
