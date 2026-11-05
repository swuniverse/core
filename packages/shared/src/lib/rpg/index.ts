export * from './plots.js';

export enum RpgBehavior {
  NOT_SET = 0,
  ACTIVE = 1,
  OPEN = 2,
  NONE = 3,
}

export interface UserCharacterDto {
  id: number;
  userId: number;
  name: string;
  description: string;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveUserCharacterDto {
  name: string;
  description: string;
  avatar?: string | null;
}
