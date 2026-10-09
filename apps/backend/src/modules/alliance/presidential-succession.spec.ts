import { AllianceRole } from '@swuniverse/shared';
import {
  chooseSuccessor,
  SuccessionCandidate,
} from './presidential-succession';

const { NONE, VICE, DIPLOMAT } = AllianceRole;

const at = (day: number) => new Date(Date.UTC(2026, 9, day));

function candidate(
  userId: number,
  role: AllianceRole,
  lastActiveAt: Date | null,
  joinedAt: Date = at(1),
): SuccessionCandidate {
  return { userId, role, lastActiveAt, joinedAt };
}

describe('chooseSuccessor', () => {
  it('returns null without candidates', () => {
    expect(chooseSuccessor([])).toBeNull();
  });

  it('prefers the most recently active vice over everyone else', () => {
    expect(
      chooseSuccessor([
        candidate(1, NONE, at(9)),
        candidate(2, DIPLOMAT, at(9)),
        candidate(3, VICE, at(2)),
        candidate(4, VICE, at(5)),
      ]),
    ).toBe(4);
  });

  it('prefers a diplomat over plain members when there is no vice', () => {
    expect(
      chooseSuccessor([
        candidate(1, NONE, at(9)),
        candidate(2, DIPLOMAT, at(2)),
        candidate(3, DIPLOMAT, at(3)),
      ]),
    ).toBe(3);
  });

  it('falls back to the most recently active plain member', () => {
    expect(
      chooseSuccessor([candidate(1, NONE, at(2)), candidate(2, NONE, at(7))]),
    ).toBe(2);
  });

  it('breaks an activity tie by the longest membership', () => {
    expect(
      chooseSuccessor([
        candidate(1, VICE, at(5), at(3)),
        candidate(2, VICE, at(5), at(2)),
      ]),
    ).toBe(2);
  });

  it('breaks a remaining tie by the lowest user id', () => {
    expect(
      chooseSuccessor([
        candidate(8, NONE, at(5), at(2)),
        candidate(3, NONE, at(5), at(2)),
      ]),
    ).toBe(3);
  });

  it('still elects someone when all activity is empty', () => {
    expect(
      chooseSuccessor([
        candidate(5, NONE, null, at(4)),
        candidate(6, NONE, null, at(2)),
      ]),
    ).toBe(6);
  });

  it('treats empty activity as older than any recorded value', () => {
    expect(
      chooseSuccessor([
        candidate(1, VICE, null, at(1)),
        candidate(2, VICE, at(1), at(9)),
      ]),
    ).toBe(2);
  });

  it('lets a vice with empty activity beat an active diplomat', () => {
    expect(
      chooseSuccessor([
        candidate(1, DIPLOMAT, at(9)),
        candidate(2, VICE, null),
      ]),
    ).toBe(2);
  });
});
