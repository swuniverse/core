# Galaxiekarte: Feldvertrag um Besitzer, Handelsposten und Region erweitern

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

STU liefert je Kartenfeld `tooltip`, `icon`, `databaseId`, `territoryOwnerText/Html`, `effects` und `isImpassable`. Der SWU-Vertrag `StarmapGalaxyFieldDto` hat nur `regionId`, Effektschlüssel und `factionZone`; `StarmapInfluenceAreaDto` hat keinen Namen. Handelsposten kennt das Starmap-Backend gar nicht. Dieses Ticket liefert die Daten, die tmw-AUD-02b für Tooltip, Feldpanel und Handelsposten-Icon braucht.

Je erkundetem Feld (gleiche Sichtbarkeitsregeln wie heute, Admin-Bypass unverändert):

- `territoryOwner`: Spieler- und ggf. Allianzname des Eigentümers der Einflussstation, wie STU „Gebiet: Allianz (Spieler)“. Kein Wert bei Admin-Regionen oder ohne Stationseinfluss (STU `getTerritoryOwnerTitle`). Fraktionszonen bleiben als bisherige Information.
- `tradePost`: Id, Name, Lizenzbedingung (Tage, Menge, Ware) oder `null`, nur für Posten auf dem Feld. Posten innerhalb eines Systems erscheinen am Systemfeld der Galaxiekarte.
- `region`: Id, Name und Beschreibung (bisher nur `regionId`); gemäß ADR-0009 nur, wenn die Region für den Spieler bekannt ist.
- `effectTexts`: deutsche Beschreibungstexte der Feldeffekte (STU zeigt Texte, nicht Schlüssel).
- `isImpassable`: abgeleitet aus Feldtyp/`passableOverride`.
- Datenbankverweis für Systemfelder (System-Id für `/database/systems/:id`), wenn der Spieler das System kennt.

## STU-Quellen

- `src/Module/Starmap/View/ShowUserStarmapData/ShowUserStarmapData.php` (Z. 192–213 `normalizeField`)
- `src/Module/Starmap/Lib/ExplorableStarMapItem.php` (`getTooltip`/`getTitle` Z. 60–126, `getIcon` Z. 128–146)
- `src/Module/Starmap/Lib/ExplorableStarMapItemTitleTrait.php` (Handelspostentitel Z. 10–25, Gebietsbesitzer Z. 27–57)

## SWU-Pfade

- `packages/shared/src/lib/starmap/index.ts` (`StarmapGalaxyFieldDto` Z. 113–128, `StarmapInfluenceAreaDto` Z. 552–560, `StarmapFieldContextDto.regionName`)
- `apps/backend/src/modules/starmap/starmap-query.service.ts` (`getExploredLayerFields` Z. 457, `getAllLayerFields` Z. 184, `getExploredRegion` Z. 75)
- `apps/backend/src/modules/starmap/starmap.controller.ts` (`GET layers/:layerId/fields` Z. 151–165)
- `apps/backend/src/modules/starmap/influence.service.ts`, `entities/influence-area.entity.ts`
- `apps/backend/src/modules/starmap/field-effect-query.ts`, `region-discovery.service.ts`
- `apps/backend/src/modules/trade/entities/trade-post.entity.ts`, `trade-license-condition.entity.ts`
- Tests: `apps/backend/src/modules/starmap/starmap-query.service.spec.ts`, `starmap.controller.spec.ts`

## Akzeptanzkriterien

- [ ] `StarmapGalaxyFieldDto` ist um `territoryOwner`, `tradePost`, `region`, `effectTexts`, `isImpassable` und einen optionalen Datenbankverweis erweitert (Namen frei wählbar, im Ticket-Kommentar dokumentieren).
- [ ] Gebietsbesitzer nur aus Stationseinfluss, nicht für Admin-Regionen; Format der Daten erlaubt die Anzeige „Gebiet: Allianz (Spieler)“ bzw. „Gebiet: Spieler“.
- [ ] Handelsposten mit aktueller Lizenzbedingung; ohne Bedingung nur Name. Verlassene Posten erscheinen mit ihrem Namen.
- [ ] Unerkundete Felder liefern keine dieser Zusatzdaten; Regionsdaten nur bei bekannter Region (ADR-0009).
- [ ] Keine N+1-Abfragen: Besitzer, Posten, Regionen und Bedingungen werden je Ebene gebündelt geladen.
- [ ] Backend-Tests: Feld mit Allianz-/Spielerbesitz, Admin-Region ohne Besitzer, Posten mit/ohne Bedingung, unerkundetes Feld ohne Zusatzdaten, unbekannte Region ohne Namen.

## Herkunft

- Audit: [README.md](../audit-2026-11-17/README.md) Abschnitt C „Sternenkarte – Feldinfo“, H „Sternenkarte: Handelsposten fehlen auf der Galaxiekarte ganz“; [trade-map-world.md](../audit-2026-11-17/trade-map-world.md) „Große Abweichungen 2“ und „Gegenprüfung Große Abweichung 2“.
- tmw-K4 ist `resolved`, Gebietsbesitzer und Handelspostentitel waren nicht Teil seiner Akzeptanz; tmw-K8a deckt nur LSS und Feldkontext ab.

## Comments
