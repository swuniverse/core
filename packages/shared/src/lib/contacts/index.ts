export enum ContactMode {
  FRIEND = 'FRIEND',
  ENEMY = 'ENEMY',
  NEUTRAL = 'NEUTRAL',
}

export interface ContactDto {
  id: number;
  userId: number;
  contactUserId: number;
  contactUsername: string;
  mode: ContactMode;
  comment: string;
  createdAt: string;
}

export interface ReceivedContactDto {
  id: number;
  ownerId: number;
  ownerUsername: string;
  mode: ContactMode;
  createdAt: string;
}

export interface CreateContactDto {
  playerId: number;
  mode: ContactMode;
}

export interface UpdateContactModeDto {
  mode: ContactMode;
}

export interface UpdateContactCommentDto {
  comment: string;
}

export interface DeleteContactsDto {
  ids: number[];
}

export interface IgnoreListEntryDto {
  id: number;
  ignoredUserId: number;
  ignoredUsername: string;
  createdAt: string;
}

export interface IgnoredByEntryDto {
  id: number;
  ownerId: number;
  ownerUsername: string;
  createdAt: string;
}

export interface CreateIgnoreListEntryDto {
  playerId: number;
}

export interface DeleteIgnoreListEntriesDto {
  ids: number[];
}
