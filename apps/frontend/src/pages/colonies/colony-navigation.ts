export type ColonyMainView =
  | 'information'
  | 'build'
  | 'social'
  | 'building-control'
  | 'settings';

export type ColonyContextView =
  | 'orbit-management'
  | 'hangar'
  | 'shipyard'
  | 'fabrication'
  | 'defense'
  | 'waste'
  | null;

export const COLONY_MAIN_VIEWS = [
  { key: 'information', label: 'Informationen' },
  { key: 'build', label: 'Baumenü' },
  { key: 'social', label: 'Soziales' },
  { key: 'building-control', label: 'Gebäudeschaltung' },
  { key: 'settings', label: 'Einstellungen' },
] as const;

export type BuildingContextAction = {
  view: Exclude<ColonyContextView, null>;
  label: string;
  enabled: boolean;
  reason?: string;
};

const BUILDING_CONTEXT_DEFINITIONS: Array<{
  view: BuildingContextAction['view'];
  label: string;
  functionIds: readonly number[];
  requiresActiveField?: boolean;
}> = [
  { view: 'hangar', label: 'Hangar öffnen', functionIds: [4] },
  {
    view: 'shipyard',
    label: 'Werft öffnen',
    functionIds: [5, 6, 7, 8, 21],
  },
  {
    view: 'waste',
    label: 'Müllverbrennung',
    functionIds: [23],
    requiresActiveField: false,
  },
  {
    view: 'fabrication',
    label: 'Fabrikation öffnen',
    functionIds: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 29, 30],
  },
  {
    view: 'defense',
    label: 'Verteidigung öffnen',
    functionIds: [24, 25, 26, 27, 28],
  },
];

export type BuildingContextAvailability = Partial<
  Record<
    Exclude<ColonyContextView, null>,
    { enabled: boolean; reason?: string }
  >
>;

export function getBuildingContextActions(
  functionIds: number[],
  isFieldActive: boolean,
  availability?: BuildingContextAvailability,
): BuildingContextAction[] {
  return BUILDING_CONTEXT_DEFINITIONS.filter((definition) =>
    definition.functionIds.some((functionId) =>
      functionIds.includes(functionId),
    ),
  ).map(({ view, label, requiresActiveField = true }) => {
    const contextAvailability = availability?.[view];
    const enabled =
      (!requiresActiveField || isFieldActive) &&
      (contextAvailability?.enabled ?? true);
    const reason = !enabled
      ? requiresActiveField && !isFieldActive
        ? 'Gebäude ist deaktiviert'
        : contextAvailability?.reason
      : undefined;
    return { view, label, enabled, ...(reason ? { reason } : {}) };
  });
}
