import { validate } from 'class-validator';
import { MessagingController, SendMessageDto } from './messaging.controller';

describe('MessagingController', () => {
  const service = {
    send: jest.fn(),
    getCorrespondence: jest.fn(),
    getConversations: jest.fn(),
  };
  const controller = new MessagingController(service as never, {} as never);

  it.each([
    [
      { recipientId: 0, body: 'Lange Nachricht' },
      'Empfänger',
    ],
    [{ recipientId: 2, body: 'kurz' }, 'Nachricht'],
    [
      { recipientId: 2, body: 'x'.repeat(10_001) },
      'Nachricht',
    ],
  ])('validates rejected send input %#', async (input, expectedMessage) => {
    const dto = Object.assign(new SendMessageDto(), input);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(JSON.stringify(errors)).toContain(expectedMessage);
  });

  it('delegates sending a validated DTO', () => {
    const dto = Object.assign(new SendMessageDto(), {
      recipientId: 2,
      body: ' Lange Nachricht ',
    });

    controller.send({ user: { sub: 1 } }, dto);

    expect(service.send).toHaveBeenCalledWith(
      1,
      2,
      ' Lange Nachricht ',
    );
  });

  it('limits correspondence requests to ten messages', () => {
    controller.correspondence(2, { user: { sub: 1 } });
    expect(service.getCorrespondence).toHaveBeenCalledWith(1, 2, 10);
  });

  it('delegates paginated conversation requests', () => {
    controller.conversations({ user: { sub: 1 } }, '2');
    expect(service.getConversations).toHaveBeenCalledWith(1, 2);
  });
});
