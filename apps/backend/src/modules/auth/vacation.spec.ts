import { isVacationEffective, VACATION_DELAY_MS } from '@swuniverse/shared';

describe('isVacationEffective', () => {
  const now = new Date('2026-10-23T12:00:00.000Z');

  it('requires active vacation mode and a start time older than 48 hours', () => {
    expect(isVacationEffective({ vacationMode: true, vacationStartedAt: new Date(now.getTime() - VACATION_DELAY_MS - 1) }, now)).toBe(true);
    expect(isVacationEffective({ vacationMode: true, vacationStartedAt: new Date(now.getTime() - VACATION_DELAY_MS) }, now)).toBe(false);
    expect(isVacationEffective({ vacationMode: false, vacationStartedAt: new Date(now.getTime() - VACATION_DELAY_MS - 1) }, now)).toBe(false);
    expect(isVacationEffective({ vacationMode: true, vacationStartedAt: null }, now)).toBe(false);
  });
});
