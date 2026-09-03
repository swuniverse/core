import type { DetailTab } from '../types';

export type ColonyWorkModeKey =
  | 'overview'
  | 'construction'
  | 'production'
  | 'fleet'
  | 'security'
  | 'administration';

export type ColonyTabNavItem = {
  key: DetailTab;
  label: string;
  show: boolean;
};

export const WORK_MODE_DEFINITIONS: Array<{
  key: ColonyWorkModeKey;
  label: string;
  tabs: DetailTab[];
}> = [
  { key: 'overview', label: 'Übersicht', tabs: ['info', 'events'] },
  {
    key: 'construction',
    label: 'Bauen',
    tabs: ['build', 'buildingManagement'],
  },
  { key: 'production', label: 'Produktion', tabs: ['fabrication', 'waste'] },
  {
    key: 'fleet',
    label: 'Flotte',
    tabs: ['orbit', 'shipyard', 'hangar', 'crew'],
  },
  { key: 'security', label: 'Sicherheit', tabs: ['defense'] },
  { key: 'administration', label: 'Verwaltung', tabs: ['settings'] },
];

export function getWorkModeForTab(tab: DetailTab): ColonyWorkModeKey {
  return (
    WORK_MODE_DEFINITIONS.find((mode) => mode.tabs.includes(tab))?.key ??
    'overview'
  );
}

export function WorkModeNav({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: ColonyTabNavItem[];
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
}) {
  const visibleTabs = tabs.filter((tab) => tab.show);
  const activeMode = getWorkModeForTab(activeTab);
  const visibleModes = WORK_MODE_DEFINITIONS.map((mode) => ({
    ...mode,
    tabs: mode.tabs
      .map((tabKey) => visibleTabs.find((tab) => tab.key === tabKey))
      .filter((tab): tab is ColonyTabNavItem => Boolean(tab)),
  })).filter((mode) => mode.tabs.length > 0);
  const activeModeTabs =
    visibleModes.find((mode) => mode.key === activeMode)?.tabs ?? visibleTabs;

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {visibleModes.map((mode) => {
            const firstTab = mode.tabs[0];
            return (
              <button
                key={mode.key}
                onClick={() => onTabChange(firstTab.key)}
                className={`rounded border px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                  mode.key === activeMode
                    ? 'border-swu-accent bg-swu-accent/12 text-swu-accent'
                    : 'border-swu-border/60 bg-swu-surface text-swu-muted hover:text-swu-primary'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-swu-bg to-transparent pointer-events-none md:hidden" />
      </div>

      {activeModeTabs.length > 1 && (
        <div className="flex gap-0 overflow-x-auto border-b border-swu-border scrollbar-none">
          {activeModeTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`px-3 py-1.5 text-[11px] whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-swu-accent text-swu-accent'
                  : 'border-transparent text-swu-muted hover:text-swu-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
