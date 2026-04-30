export interface RegisterDto {
  username: string;
  email: string;
  password: string;
  faction: Faction;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  faction: Faction;
  prestige: number;
  createdAt: string;
}

export interface JwtPayload {
  sub: number;
  username: string;
  faction: Faction;
  iat?: number;
  exp?: number;
}

export enum Faction {
  REBEL_ALLIANCE = 'REBEL_ALLIANCE',
  GALACTIC_EMPIRE = 'GALACTIC_EMPIRE',
}
