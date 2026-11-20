export const Permission = {
  MAP_EDITOR: 'MAP_EDITOR',
  COLONY_SANDBOX: 'COLONY_SANDBOX',
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];
