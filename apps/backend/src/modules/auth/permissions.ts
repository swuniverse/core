export const Permission = {
  MAP_EDITOR: 'MAP_EDITOR',
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];
