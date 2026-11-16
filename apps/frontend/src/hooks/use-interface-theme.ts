import { useEffect } from 'react';
import {
  INTERFACE_COLOR_SCHEMES,
  type Faction,
  type InterfaceColorScheme,
} from '@swuniverse/shared';
import { api } from '../services/api';
let revision = 0;
export function applyInterfaceTheme(
  value: string,
  faction?: Faction | null,
): void {
  revision++;
  const scheme: InterfaceColorScheme =
    INTERFACE_COLOR_SCHEMES.find((s) => s === value) ?? 'default';
  document.documentElement.dataset.theme = scheme;
  document.documentElement.dataset.faction = faction ?? '';
}

export function useInterfaceTheme(
  userId: number | undefined,
  faction?: Faction | null,
): void {
  useEffect(() => {
    let active = true;
    applyInterfaceTheme('default', faction);
    const requestedRevision = revision;
    if (userId !== undefined)
      void api
        .get<Record<string, string>>('/user/settings')
        .then((settings) => {
          // A late settings load must not undo a newer, immediate palette selection.
          if (active && requestedRevision === revision)
            applyInterfaceTheme(settings.css_color_sheet, faction);
        })
        .catch(() => undefined);
    return () => {
      active = false;
      applyInterfaceTheme('default');
    };
  }, [userId, faction]);
}
