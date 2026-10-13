/** Stable mailbox categories exposed by the messages REST contract. */
export enum MessageFolder {
  PERSONAL = 'PERSONAL',
  SHIP = 'SHIP',
  COLONY = 'COLONY',
  TRADE = 'TRADE',
  SYSTEM = 'SYSTEM',
  OUTBOX = 'OUTBOX',
  STATION = 'STATION',
}

/** Order in which folders are shown in summaries. */
export const MESSAGE_FOLDERS = [
  MessageFolder.PERSONAL,
  MessageFolder.SHIP,
  MessageFolder.COLONY,
  MessageFolder.TRADE,
  MessageFolder.SYSTEM,
  MessageFolder.OUTBOX,
  MessageFolder.STATION,
] as const;

export type IncomingMessageFolder = Exclude<MessageFolder, MessageFolder.OUTBOX>;
