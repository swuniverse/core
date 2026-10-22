import { FlightSignatureService } from './flight-signature.service';

describe('FlightSignatureService', () => {
  const repo = {
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn((v) => v),
    delete: jest.fn(),
  };
  const classes = {
    findById: jest.fn().mockResolvedValue({ id: 4, name: 'Korvette' }),
  };
  const service = new FlightSignatureService(repo as any, classes as any);

  beforeEach(() => jest.clearAllMocks());

  it('creates departure and arrival signatures with opposite directions', async () => {
    await service.createMovement(
      { id: 9, userId: 2, name: 'Nova', shipClassId: 4 } as any,
      { id: 10 } as any,
      { id: 11 } as any,
      'EAST',
    );
    expect(repo.save).toHaveBeenCalledWith([
      expect.objectContaining({
        locationId: 10,
        toDirection: 'EAST',
        fromDirection: null,
      }),
      expect.objectContaining({
        locationId: 11,
        fromDirection: 'WEST',
        toDirection: null,
      }),
    ]);
  });

  it('applies STU visibility windows and keeps only the latest signature per ship', async () => {
    const now = new Date('2026-10-22T12:00:00Z');
    repo.find.mockResolvedValue([
      row(1, 2, false, 13, now),
      row(1, 2, false, 2, now),
      row(2, 3, false, 25, now),
      row(3, 4, true, 13, now),
      row(4, 5, true, 19, now),
      row(5, 1, false, 1, now),
    ]);
    const result = await service.getVisibleAt(8, 1, now);
    expect(result.signatures).toEqual([
      expect.objectContaining({
        spacecraftId: 1,
        spacecraftName: null,
        shipClassName: 'Korvette',
      }),
    ]);
    expect(result.fadedSignatures).toEqual({ uncloaked: 1, cloaked: 1 });
  });

  it('deletes signatures older than 48 hours', async () => {
    const now = new Date('2026-10-22T12:00:00Z');
    await service.deleteExpired(now);
    expect(repo.delete).toHaveBeenCalledWith(
      expect.objectContaining({ createdAt: expect.anything() }),
    );
  });
});

function row(
  id: number,
  userId: number,
  isCloaked: boolean,
  ageHours: number,
  now: Date,
) {
  return {
    id,
    spacecraftId: id,
    userId,
    isCloaked,
    shipClassId: 4,
    shipClassName: 'Korvette',
    spacecraftName: 'Nova',
    fromDirection: 'WEST',
    toDirection: null,
    createdAt: new Date(now.getTime() - ageHours * 60 * 60 * 1000),
  };
}
