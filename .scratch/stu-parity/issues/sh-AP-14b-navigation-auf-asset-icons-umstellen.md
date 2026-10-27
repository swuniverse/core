# Sidebar und Bottom-Nav auf Asset-Icons umstellen

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** sh-AP-14a

## Abgrenzung

Dieses Issue ändert nur Produktionscode und Tests im Core-Repository, nachdem sh-AP-14a aufgelöst ist. Es erzeugt, kopiert oder verändert keine Asset-Datei und keinen Submodul-Zeiger.

## Ziel

Sidebar und mobile Bottom-Nav nutzen statt eigener SVGs bzw. Unicode-Glyphen die Navigations-Icons aus `assets/navigation/` mit STU-typischem Hover-Tausch (`…0.png` / `…1.png`). Damit gilt die Asset-Konvention aus Abschnitt 3.6 der UI-Konventionen auch für die Navigation.

## STU-Quellen

- `src/html/macros.twig#navigation_item` (Bildpaar, `cp()`-Tausch)
- `src/html/game/component/navigationComponent.twig`

## SWU-Pfade

- `apps/frontend/src/components/layout/sidebar.tsx` (`NavIcon*`-SVGs, `navItems`, `adminNavItem`)
- `apps/frontend/src/components/layout/bottom-nav.tsx` (Unicode ◉ △ ◫ ✦ ⚗ …)
- `apps/frontend/src/lib/assets.ts` (`VITE_ASSET_BASE_URL`)
- `apps/frontend/src/components/layout/navigation.spec.tsx`

## Akzeptanzkriterien

- [ ] Eine Hilfsfunktion `navigationIcon(name, hover)` in `lib/assets.ts` liefert `<ASSET_BASE>/navigation/menu_<name><0|1>.png`.
- [ ] Jeder Sidebar-Eintrag rendert das Bildpaar mit `group-hover:hidden` / `group-hover:block`; der aktive Eintrag zeigt dauerhaft das `1`-Bild; `alt=""` am Bild und `aria-label`/`title` am Link.
- [ ] Bottom-Nav nutzt dieselben Icons in kleiner Größe; keine Unicode-Glyphen oder Emoji mehr in der Navigation.
- [ ] Die nicht mehr benötigten `NavIcon*`-SVG-Komponenten sind entfernt.
- [ ] Frontend-Tests: Bildquellen je Eintrag, aktiver Zustand, Admin-Eintrag nur für Admins (bestehende Tests angepasst).

## Comments
