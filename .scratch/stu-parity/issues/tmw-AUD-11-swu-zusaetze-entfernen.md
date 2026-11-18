# SWU-Zusätze im Handel, auf der Karte und in der Datenbank entfernen

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Der PO hat entschieden, vier SWU-Zusätze zu entfernen, damit SWU STU gleicht. Die Fortschrittsbox in der Datenbank bleibt.

1. **Tab „Handelsposten“** (Liste aller Posten auf der Handelsseite). STU kennt Posten nur über Karte, Datenbank und Lizenzen. Die **Posteninfo** eines einzelnen Postens bleibt erreichbar (STU `tradePostInfo.twig` als Popup): bestehende Links `/trade?tab=posts&post=…` aus `TradePostEntry`, `StationTradePostPanel` und der Kontobox werden auf eine Posteninfo-Ansicht ohne Listentab umgestellt (z. B. `/trade?post=…`).
2. **Kartenexport als Bild und JSON** (tmw-K6): Knöpfe und Logik auf der Sternenkarte, `starmap-export.ts`, Endpunkt `GET starmap/layers/:layerId/export.json`, `StarmapExportDto`. Der Admin-Export des Karteneditors (`GET starmap/admin/layers/:id/export`) bleibt, weil er nicht Teil des Spielerzusatzes ist.
3. **Hyperraumrouten-Overlay** auf der Sternenkarte: Overlay, Routenfilter, Legendeneintrag, Tutorialtext. Der Spielerendpunkt `GET starmap/layers/:layerId/hyperspace-routes` entfällt, wenn ihn danach niemand mehr nutzt. Die Routendaten/-tabellen und ihre Admin-Pflege (Karteneditor, Landmarken-Presets) bleiben unangetastet, solange sie dort genutzt werden; das wird vor dem Entfernen geprüft und im Kommentar festgehalten.
4. **Rangliste „Höchstes Prestige“** in der Datenbank: Hub-Eintrag, `RankingKey 'prestige'`, Zweig in `getRanking`. `getPrestigeRanking` und das Feld `prestige` in `getRankings()` entfallen nur, wenn keine andere Stelle sie nutzt.

## STU-Quellen

- `src/html/view/trade.twig` (kein Postenlisten-Tab), `src/html/trade/tradePostInfo.twig`, `src/Module/Trade/View/ShowTradePostInfo/`
- `src/html/view/map.twig`, `src/Public/static/js/userStarmap.js` (kein Export, keine Hyperraumrouten)
- `src/html/view/database.twig`, `src/html/database/highscores/` (keine Prestige-Rangliste)

## SWU-Pfade

- Handel: `apps/frontend/src/pages/trade.tsx` (`TradeTab` Z. 24, Tabs Z. 30, `PostsTab` Z. 381, Routing Z. 73/147/181/197/207), `apps/frontend/src/components/trade/TradePostEntry.tsx` (Z. 52), `apps/frontend/src/components/spacecraft/StationTradePostPanel.tsx` (Z. 54), Specs `trade.spec.tsx`, `TradePostEntry.spec.tsx`, `StationTradePostPanel.spec.tsx`. Backend `GET trade/posts` bleibt (wird für Posteninfo und Konten genutzt).
- Export: `apps/frontend/src/pages/starmap.tsx` (Z. 29, 87–90, 318–330), `apps/frontend/src/lib/starmap-export.ts` (+ `.spec.ts`), `apps/backend/src/modules/starmap/starmap.controller.ts` (Z. 167 `export.json`), `starmap-query.service.ts` (`exportExploredLayer` Z. 370), `starmap-export.int-spec.ts`, `packages/shared/src/lib/starmap/index.ts` (`StarmapExportDto`), `apps/frontend/src/pages/starmap.spec.tsx` (Z. ~249)
- Hyperraumrouten: `apps/frontend/src/components/starmap/HyperspaceRouteOverlay.tsx`, `StarmapCanvas.tsx`, `apps/frontend/src/pages/starmap.tsx` (Z. 80, 117, 147, 345, 357), `apps/backend/src/modules/starmap/starmap.controller.ts` (Z. 136–149), `starmap-query.service.ts` (`getVisibleHyperspaceRoutes` Z. 257, `getHyperspaceRoutes` Z. 283), `apps/backend/src/modules/tutorial/tutorial-definitions.ts` (Z. 214 Legendentext), `apps/frontend/src/pages/tutorial-targets.spec.tsx` (Z. 99)
- Prestige-Rangliste: `apps/frontend/src/pages/database.tsx` (Z. 52, 230), `apps/backend/src/modules/database/database.controller.ts` (Z. 259), `database.service.ts` (Z. 76, 968–972, `getRankings` Z. 1130, `getPrestigeRanking` Z. 1173), `database-ranking.spec.ts`, `database.service.spec.ts`
- Bleibt: `apps/frontend/src/components/database/DatabaseProgress.tsx`

## Akzeptanzkriterien

- [ ] Die Handelsseite hat keinen Tab „Handelsposten“ mehr; die Posteninfo ist über alle bisherigen Einstiege weiter erreichbar (Links angepasst, Tests aktualisiert).
- [ ] Die Sternenkarte hat keine Exportknöpfe; `export.json`-Endpunkt, `StarmapExportDto` und `starmap-export.ts` sind entfernt; der Admin-Export bleibt funktionsfähig.
- [ ] Die Sternenkarte zeigt keine Hyperraumrouten mehr, die Legende und das Tutorial erwähnen sie nicht mehr; der Spielerendpunkt ist entfernt, falls ungenutzt (Prüfergebnis im Kommentar).
- [ ] Die Rangliste „Höchstes Prestige“ ist aus Hub, Route und Backend entfernt; `GET database/rankings/prestige` liefert 404.
- [ ] Die Fortschrittsbox in der Datenbank bleibt unverändert.
- [ ] Vor jedem Entfernen eines Endpunkts wird per Suche geprüft, dass ihn keine andere Seite nutzt; das Ergebnis steht im Kommentar.
- [ ] Tutorialziele/Validierung (`validateTutorialDefinitions`) bleiben grün; tote Tests werden entfernt, betroffene Tests angepasst. Backend- und Frontend-Suite grün.

## Herkunft

- Audit: [README.md](../audit-2026-11-17/README.md) Abschnitt L4 „SWU-Zusätze – PO: alle entfernen außer der Fortschrittsbox“, N1 „Fortschrittsbox bleibt“, N2 „SWU-Zusätze … entfernen“; [trade-map-world.md](../audit-2026-11-17/trade-map-world.md) „Bewusste/entschiedene Abweichungen – SWU-Zusätze“.
- PO-Entscheidung L4 vom 2026-11-17.
- Nimmt tmw-K6 (Sternenkarte als Bild exportieren) zurück; der `map.md`-Eintrag zu tmw-K6 und zum Hyperraumrouten-Overlay wird bei Umsetzung als zurückgenommen markiert.

## Comments
