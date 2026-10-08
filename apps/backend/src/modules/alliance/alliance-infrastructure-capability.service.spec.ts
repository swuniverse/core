import { AllianceInfrastructureCapabilityService } from './alliance-infrastructure-capability.service';

const capability = (value: string | undefined) =>
  new AllianceInfrastructureCapabilityService({ get: () => value } as never);

describe('AllianceInfrastructureCapabilityService', () => {
  it('is disabled until the explicit rollout capability is enabled', () => {
    expect(capability(undefined).enabled).toBe(false);
    expect(capability('true').enabled).toBe(true);
  });

  it('only accepts the explicit true value', () => {
    expect(capability('TRUE').enabled).toBe(false);
    expect(capability('1').enabled).toBe(false);
  });
});
