import 'reflect-metadata';
jest.mock('./admin-flight-signature.service', () => ({
  AdminFlightSignatureService: class AdminFlightSignatureService {},
}));
import {
  INestApplication,
  ValidationPipe,
  type ExecutionContext,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { AdminFlightSignatureController } from './admin-flight-signature.controller';
import { AdminFlightSignatureService } from './admin-flight-signature.service';

describe('Admin flight signature endpoint', () => {
  let app: INestApplication;
  const signatures = { getFields: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminFlightSignatureController],
      providers: [
        { provide: AdminFlightSignatureService, useValue: signatures },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = {
            isAdmin: request.headers['x-test-role'] === 'admin',
            permissions:
              request.headers['x-test-role'] === 'editor' ? ['MAP_EDITOR'] : [],
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.listen(0, '127.0.0.1');
  });
  afterAll(async () => app?.close());
  beforeEach(() => signatures.getFields.mockReset());
  async function request(query: string, role = 'admin') {
    return fetch(
      `${await app.getUrl()}/starmap/admin/layers/3/flight-signatures?${query}`,
      { headers: { 'x-test-role': role } },
    );
  }
  const bounds = 'xStart=1&xEnd=10&yStart=2&yEnd=8';

  it.each(['player', 'editor'])(
    'returns 403 for %s even with map editor permission',
    async (role) => {
      expect((await request(bounds, role)).status).toBe(403);
      expect(signatures.getFields).not.toHaveBeenCalled();
    },
  );

  it('returns aggregated fields to admins and transforms query numbers', async () => {
    const fields = [
      {
        fieldId: 8,
        cx: 3,
        cy: 4,
        directions: { NORTH: 0, EAST: 2, SOUTH: 1, WEST: 0 },
      },
    ];
    signatures.getFields.mockResolvedValue(fields);
    const response = await request(`${bounds}&filter=USER&targetId=7`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(fields);
    expect(signatures.getFields).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        xStart: 1,
        xEnd: 10,
        yStart: 2,
        yEnd: 8,
        filter: 'USER',
        targetId: 7,
      }),
    );
  });

  it.each([
    'filter=UNKNOWN',
    'filter=USER',
    'filter=USER&targetId=0',
    'filter=USER&targetId=1.5',
    'filter=USER&targetId=2147483648',
  ])('rejects invalid filters: %s', async (filter) => {
    expect((await request(`${bounds}&${filter}`)).status).toBe(400);
    expect(signatures.getFields).not.toHaveBeenCalled();
  });

  it('rejects missing or fractional coordinates', async () => {
    expect((await request('xStart=1&yStart=1&yEnd=2')).status).toBe(400);
    expect((await request('xStart=1.5&xEnd=2&yStart=1&yEnd=2')).status).toBe(
      400,
    );
  });
});
