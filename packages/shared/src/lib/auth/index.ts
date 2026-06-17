export interface RegisterDto {
  username: string;
  email: string;
  password: string;
  factionId: number;
  inviteKey?: string;
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
  faction?: Faction | null;
  prestige: number;
  onboardingCompleted?: boolean;
  starterColonyId?: number | null;
  starterShipId?: number | null;
  isAdmin?: boolean;
  permissions?: string[];
  createdAt: string;
}

export interface JwtPayload {
  sub: number;
  username: string;
  faction?: Faction | null;
  permissions?: string[];
  iat?: number;
  exp?: number;
}

export enum Faction {
  REBEL_ALLIANCE = 'REBEL_ALLIANCE',
  GALACTIC_EMPIRE = 'GALACTIC_EMPIRE',
}
