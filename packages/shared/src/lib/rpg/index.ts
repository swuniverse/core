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
