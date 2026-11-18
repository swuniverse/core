# Galaxiekarte: Tooltip, Feldpanel und Handelsposten-Icon wie STU

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** tmw-AUD-02a

## Ziel

Die Galaxiekarte wird zum Nachschlagewerk wie in STU. Tooltip und Feldpanel zeigen die Daten aus tmw-AUD-02a, und Handelsposten sind auf der Karte als Symbol sichtbar.

- **Tooltip** (immer, nicht nur bei aktivem Overlay): Feldname/-typ, Effekttexte, „Unpassierbar“, „Gebiet: Allianz (Spieler)“, Handelsposten „Name (Lizenz für n Tage: x Ware)“, System „über X-System“, Regionsname.
- **Feldpanel** (`StarmapControlPanel`): zusätzlich zu Koordinaten/Sektor/Feldtyp die gleichen Angaben plus Regionsbeschreibung und einen Knopf „Datenbank“ zum Systemeintrag (STU „Systemkarte“), wo bekannt. „Systemfelder laden“ bleibt.
- **Handelsposten-Icon** auf Feldern mit Posten (STU `tradepost`), in der Legende erklärt.

## STU-Quellen

- `src/Public/static/js/userStarmap.js` (`updateFieldDetails`; Icon-Zeichnung Z. 437–439 und 1208–1215)
- `src/Module/Starmap/Lib/ExplorableStarMapItem.php` (`getTooltip`, `getTitle`, `getIcon`)
- `src/Module/Starmap/Lib/ExplorableStarMapItemTitleTrait.php`
- `src/html/view/map.twig`

## SWU-Pfade

- `apps/frontend/src/components/starmap/StarmapCanvas.tsx` (Tooltip Z. ~684–687; Zeichnen der Feldsymbole)
- `apps/frontend/src/components/starmap/StarmapControlPanel.tsx` (Feldpanel Z. ~163–175, „Gebiet“ aus `factionZone`)
- `apps/frontend/src/pages/starmap.tsx` (Legende `data-tutorial="map-legend"`, Z. ~492)
- `apps/frontend/src/lib/assets.ts` (Icon-Pfad)
- Tests: `apps/frontend/src/components/starmap/StarmapCanvas.spec.tsx`, `apps/frontend/src/pages/starmap.spec.tsx`

## Akzeptanzkriterien

- [ ] Tooltip zeigt alle vorhandenen Angaben des Feldes in STU-Reihenfolge, unabhängig von Overlays; „Unpassierbar“ zusätzlich zum bestehenden Overlay.
- [ ] Feldpanel zeigt Gebietsbesitzer (Spieler/Allianz), Handelsposten mit Lizenzbedingung (Name verlinkt auf die Posteninfo im Handel), Region mit Beschreibung, Effekttexte, „Unpassierbar“ und den Datenbank-Knopf für bekannte Systeme.
- [ ] Felder mit Handelsposten tragen ein eigenes Icon; die Legende erklärt es.
- [ ] Keine Zusatzangaben für unerkundete Felder.
- [ ] Frontend-Tests: Tooltiptext mit Posten und Besitzer, Feldpanel mit Region und DB-Link, Icon wird für Postenfeld gezeichnet, Legende enthält Handelsposten.

## Herkunft

- Audit: [README.md](../audit-2026-11-17/README.md) Abschnitt C „Sternenkarte – Feldinfo“, H „Sternenkarte“; [trade-map-world.md](../audit-2026-11-17/trade-map-world.md) „Große Abweichungen 2“, Kleine Abweichungen „Kartenlegende“ und „Gebietsanzeige auf der Karte“.
- tmw-K4 (`resolved`) und tmw-K8a decken diese Anzeige nicht ab.

## Comments
