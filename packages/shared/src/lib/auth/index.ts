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
}

export interface RegisterResponse {
  message: string;
  email: string;
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

export interface VerifyEmailDto {
  token: string;
}

export interface UpdateVerificationEmailDto {
  email: string;
}

export enum AccountDeletionMark {
  None = 0,
  Requested = 1,
  Confirmed = 2,
  Forbidden = 3,
  Executed = 4,
}

export interface AuthFeaturesDto {
  passwordReset: boolean;
  emailVerification: boolean;
  accountDeletion: boolean;
}

export interface AuthMessageDto {
  message: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
  vacationEnded?: boolean;
  defaultView?: string;
}

export interface UserProfile {
  id: number;
  username: string;
  displayName?: string | null;
  displayNameMarkup?: string | null;
  avatar?: string | null;
  email: string;
  emailVerifiedAt?: string | null;
  faction?: Faction | null;
  prestige: number;
  onboardingCompleted?: boolean;
  starterColonyId?: number | null;
  isAdmin?: boolean;
  permissions?: string[];
  createdAt: string;
  deletionMark?: AccountDeletionMark;
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

/** Supported interface token palettes. */
export const INTERFACE_COLOR_SCHEMES = ['default', 'contrast', 'faction'] as const;
export type InterfaceColorScheme = typeof INTERFACE_COLOR_SCHEMES[number];

export * from './player-name.js';
