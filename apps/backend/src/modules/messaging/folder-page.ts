import { EntityManager, In } from 'typeorm';
import type { User } from '../auth/user.entity';
import { withDeletedAuthor } from '../account-deletion/deleted-player';
import { Contact } from '../contacts/entities/contact.entity';
import { Message } from './entities/message.entity';

/** STU ClassicStyleProvider::PMLIMITER: messages shown in full per folder page. */
export const FOLDER_PAGE_SIZE = 6;

/** Only fields another player may see; the entity also carries email and password hash. */
export function publicUser(user: User | null | undefined) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    avatar: user.avatar ?? null,
    faction: user.faction ?? null,
    isNpc: user.isNpc ?? false,
  };
}

export function publicMessage<T extends Partial<Message>>(message: T) {
  return {
    ...message,
    ...('sender' in message ? { sender: publicUser(message.sender) } : {}),
    ...('recipient' in message
      ? { recipient: publicUser(message.recipient) }
      : {}),
  };
}

/**
 * Received folder page like STU: shown messages are marked read on display
 * (the response keeps the previous `isRead` so new ones can be highlighted),
 * and each sender carries the reader's contact entry in one batched query.
 */
export async function presentReceivedPage(
  manager: EntityManager,
  userId: number,
  messages: Message[],
) {
  const unreadIds = messages.filter((m) => !m.isRead).map((m) => m.id);
  if (unreadIds.length > 0) {
    await manager.update(
      Message,
      { id: In(unreadIds), recipientId: userId },
      { isRead: true },
    );
  }
  const senderIds = [
    ...new Set(
      messages.flatMap((m) =>
        !m.isSystem && m.senderId !== null && m.senderId !== userId
          ? [m.senderId]
          : [],
      ),
    ),
  ];
  const contacts = senderIds.length
    ? await manager.find(Contact, {
        where: { userId, contactUserId: In(senderIds) },
        select: { id: true, contactUserId: true, mode: true },
      })
    : [];
  const bySender = new Map(
    contacts.map((c) => [c.contactUserId, { id: c.id, mode: c.mode }]),
  );
  return withDeletedAuthor(messages, 'sender', 'senderId').map((m) => ({
    ...publicMessage(m),
    senderContact:
      m.senderId === null ? null : (bySender.get(m.senderId) ?? null),
  }));
}

/** Query-string page → positive integer; anything else is page 1. */
export function parsePage(page: string | undefined): number {
  return Math.max(1, Math.trunc(Number(page)) || 1);
}
