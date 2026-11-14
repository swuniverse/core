import type { Faction } from '../auth/index.js';

/** Everyone or all players of one faction; NPC accounts never receive it. */
export type AdminBroadcastTarget = 'ALL' | Faction;

export interface AdminBroadcastDto {
  /** Client-generated id; repeating a request with it never duplicates. */
  broadcastId: string;
  subject: string;
  body: string;
  target: AdminBroadcastTarget;
  alsoEmail: boolean;
}

export interface AdminBroadcastAudienceDto {
  recipients: number;
  emailRecipients: number;
  emailEnabled: boolean;
}

export interface AdminBroadcastResultDto {
  /** Players of the target group holding the message. */
  recipients: number;
  emailsSent: number;
}
