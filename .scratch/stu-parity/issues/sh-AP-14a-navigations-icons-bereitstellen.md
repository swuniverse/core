# Navigations-Icons im Asset-Repository bereitstellen

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Die Sidebar soll wie STU Bildpaare `navigation/menu_<name>0.png` (normal) und `menu_<name>1.png` (Hover) nutzen. Im Submodul `assets/` (`swuniverse/assets`) fehlen dafür die meisten Icons. Die Dateien müssen im separaten Repository `swuniverse/assets` ergänzt und der Submodul-Zeiger hier aktualisiert werden; das kann die Ralph-Schleife nicht (eigenes Repo, Push nötig), daher `ready-for-human`.

Lizenz geklärt: `st-universe/assets/LICENSE` ist MIT; `swuniverse/assets` basiert laut README bereits darauf, und die vorhandenen `menu_doku`, `menu_ships`, `menu_option` sind byte-identisch mit STU. Gemäß Leitplanke 2 werden Star-Trek-Motive durch Star-Wars-Äquivalente ersetzt.

## STU-Quellen

- `st-universe/assets/navigation/*` (`menu_planets`, `menu_comm`, `menu_msg`, `menu_forsch`, `menu_ally`, `menu_data`, `menu_history`, `menu_map`, `menu_scripts`, `menu_ticks`, `menu_station`, `menu_trade`, je `0`/`1`)
- `src/html/macros.twig#navigation_item`, `src/html/game/component/navigationComponent.twig`

## SWU-Pfade

- Submodul `assets/navigation/` (heute nur `menu_doku`, `menu_logout`, `menu_option`, `menu_ships`)
- `.gitmodules`

## Abgrenzung

Dieses Issue umfasst ausschließlich das separate Asset-Repository und die spätere Aktualisierung des Submodul-Zeigers durch einen Menschen. Es bleibt offen, bis Asset-Commit und Zeiger tatsächlich vorliegen; diese Tracker-Klärung löst 14a ausdrücklich nicht.

## Akzeptanzkriterien

- [x] In `swuniverse/assets/navigation/` liegen je `0`/`1`-Paar (40×40 px wie STU): `menu_maindesk`, `menu_planets` (Kolonien), `menu_comm` (HoloNet), `menu_msg` (Nachrichten), `menu_forsch` (Forschung), `menu_ally` (Allianzen), `menu_data` (Datenbank), `menu_history` (Ereignisse), `menu_map` (Karte), `menu_admin` (Admin), `menu_mapeditor` (Karteneditor); für spätere Bereiche zusätzlich `menu_station` und `menu_trade`.
- [x] Neutrale STU-Motive (Planet, Datenbank, Forschung, Ereignisse, Karte, Nachrichten, Funk) wurden übernommen; Star-Trek-Motive wurden durch Star-Wars-neutrale Motive ersetzt und die Auswahl dokumentiert.
- [x] Submodul-Zeiger in diesem Repo zeigt auf einen Nachfolgecommit, der den Icon-Commit enthält.

## Answer

Die neutralen MIT-lizenzierten STU-Paare wurden übernommen und die Star-Wars-neutralen Paare für Maindesk, Allianzen, Admin, Karteneditor und den mobilen Mehr-Schalter ergänzt. Alle Paare sind 40×40-PNGs; Normal- und Hoverzustand sind unterscheidbar. Der Asset-Commit `5c7b0e7c31` ist auf `swuniverse/assets` `main` veröffentlicht und der Submodul-Zeiger dieses Arbeitsbaums verweist darauf.

## Comments

- 2026-11-03 Audit: Asset-Commit `5c7b0e7c31` ist Vorfahr des aktuellen Submodul-HEAD `38aa9340e4a2d553b02d9331dab37176729c6a56`; der Root-Gitlink zeigt auf dieses HEAD. Alle 13 geforderten `0`/`1`-Paare sind vorhanden und als 40×40-PNGs verifiziert.
