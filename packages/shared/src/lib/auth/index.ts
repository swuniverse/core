export const VACATION_DELAY_MS = 48 * 60 * 60 * 1000;

export interface VacationState {
  vacationMode: boolean;
  vacationStartedAt: Date | string | null;
}

export function isVacationEffective(
  user: VacationState,
  now: Date = new Date(),
): boolean {
  if (!user.vacationMode || !user.vacationStartedAt) return false;
  return now.getTime() - new Date(user.vacationStartedAt).getTime() > VACATION_DELAY_MS;
}

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

export interface LostPasswordDto {
  login: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface AuthFeaturesDto {
  passwordReset: boolean;
}

export interface AuthMessageDto {
  message: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
  vacationEnded?: boolean;
}

export interface UserProfile {
  id: number;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  email: string;
  faction?: Faction | null;
  prestige: number;
  onboardingCompleted?: boolean;
  starterColonyId?: number | null;
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
