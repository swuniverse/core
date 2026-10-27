# Kolonien-Navlet mit Tooltips und laufende Serverzeit

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** sh-AP-11

## Ziel

Der Header zeigt wie STU alle Kolonien als Planetenbilder (Größe nach Typ) mit Tooltip „Kolonieinformationen“ (Koordinaten, System, Energie, Lager) statt nur vier Kolonien mit Warnpunkt. Der Sidebar-Fuß zeigt zusätzlich die laufende Serverzeit wie STU.

## STU-Quellen

- `src/html/game/component/coloniesComponent.twig` (Tooltip-Tabelle, Bildgrößen Planet 50, Mond 30, Asteroid 40 px)
- `src/Module/Game/Component/ColoniesComponent.php`
- `src/html/game/component/serverTimeAndVersionComponent.twig`, `src/Module/Game/Component/ServertimeComponent.php`, `src/Public/static/js/default.js#startServerTimer`

## SWU-Pfade

- `apps/frontend/src/components/layout/header.tsx` (Z. ~245: `.slice(0, 4)`, Warnpunkt)
- `apps/backend/src/modules/dashboard/dashboard.service.ts#getHeader`, `packages/shared/src/lib/common/index.ts` (`GlobalHeaderStatusDto.colonies`)
- `apps/frontend/src/components/Tooltip.tsx` (aus sh-AP-11)
- `apps/frontend/src/components/layout/sidebar.tsx` (`TickRing`), `apps/frontend/src/hooks/use-status-bar.ts` (`serverTime`, Offset)

## Akzeptanzkriterien

- [ ] Header-DTO je Kolonie zusätzlich: Koordinaten im System (x|y) und Systemname mit Sektorkoordinaten.
- [ ] Alle Kolonien werden angezeigt; bei Platzmangel horizontal scrollbar; Bildgrößen nach Objekttyp (Planet groß, Asteroid mittel, Mond klein); der Warnpunkt bleibt als zusätzlicher Statuspunkt.
- [ ] Hover zeigt per `<Tooltip>` die Tabelle „Kolonieinformationen: <Name>“ mit Koordinaten, System, Energie `x/y` und Lager `x/y` (Zahlen mit `formatNumber`, falls sh-AP-13a umgesetzt).
- [ ] Sidebar-Fuß zeigt unter dem Tick-Ring die laufende Serverzeit `HH:MM:SS` (aus `useStatusBar`, sekündlich aktualisiert) mit `title="Serverzeit"`.
- [ ] Frontend-Tests: mehr als vier Kolonien sichtbar, Tooltip-Inhalt, Serverzeit tickt (Fake-Timer).

## Comments
