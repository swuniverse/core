# Kolonieliste: Warenverbrauch, Terraforming, Modulproduktion, Aktivierungshinweis

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Unter der Kolonieliste zeigt STU Waren mit negativer Bilanz samt Reichweite „(x Runden)“, die laufenden Terraformingvorgänge und die laufende Modulproduktion aller Kolonien. Bei Bauvorgängen steht, ob das Gebäude nach dem Bau aktiviert wird. In SWU fehlt das alles. Engpässe sieht man nur, wenn man jede Kolonie einzeln öffnet. Dieses Ticket ergänzt die Blöcke.

## STU-Quellen

- `src/html/view/colonylist.twig` (Warenverbrauch je Kolonie; `TERRAFORMING_LIST` Z. 122–150; `BUILDINGJOB_LIST`; `MODULE_LIST` Z. 182–200)
- `src/Module/Game/Lib/View/Provider/ColonyListProvider.php`
- `src/Module/Colony/Lib/ColonyListItem.php` (`getCommodityUseView`)
- `src/Module/Colony/Lib/CommodityConsumption.php`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony.service.ts` `findAllByUser` (Z. 202)
- `apps/backend/src/modules/colony/colony-stats.service.ts` (Warenbilanz)
- `apps/backend/src/modules/colony/entities/colony-fabrication-queue.entity.ts`, `colony-fabrication.service.ts` (Modulqueue)
- `apps/backend/src/modules/colony/entities/colony-field.entity.ts` (`terraformingId`, `terraformingFinishesAt`, `activateAfterBuild`)
- `apps/frontend/src/pages/colonies/components/ColonyOverview.tsx` (Bauvorgänge Z. 213–262), `apps/frontend/src/pages/colonies/types.ts`

## Akzeptanzkriterien

- [x] Je Kolonie listet die Übersicht die Waren mit negativer Bilanz: Ware, Verbrauch je Tick und „(x Runden)“ = `floor(Lagerbestand / |Bilanz|)` wie STU `CommodityConsumption`.
- [x] Block „Aktuelle Terraformingvorgänge“: Kolonie, Feld, Vorgang, Fertigstellung, Fortschritt. Er fehlt, wenn nichts läuft.
- [x] Block „Modulproduktion“: Kolonie, Modul, Menge, Fertigstellung. Er fehlt, wenn nichts läuft.
- [x] Bauvorgänge zeigen „wird nach dem Bau aktiviert“ bzw. „deaktiviert“ anhand von `activateAfterBuild`.
- [x] Die Daten werden gesammelt für alle Kolonien des Spielers geladen (keine N+1-Abfragen).
- [x] Backend-Test: Reichweitenberechnung (inkl. Bestand 0 und positiver Bilanz), Terraforming- und Modulliste.
- [x] Frontend-Test `ColonyOverview.spec.tsx`: alle drei Blöcke und der Aktivierungshinweis, leere Blöcke ausgeblendet.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt C (Zeile „Kolonieliste“).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Seitenabgleich „Kolonieliste“, Große Abweichung Nr. 2, kleine Abweichung „Kolonieliste: Bauvorgänge ohne (de)aktiviert“.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt. Die echten Werte (Signaturen, Verteidigung, Wachstum) stehen in col-AUD-02a.
- 2026-11-19 – umgesetzt, Prüfung ausstehend. Umsetzung an Sonnet-Agent delegiert, Review und Ergänzung durch Opus 5.5. Commits `b2c0f26a` und „feat(colony): show terraforming progress in the colony list (col-AUD-02b)“.
  - Warenverbrauch je Kolonie aus der bereits berechneten Bilanz: nur negative, lagerbare Waren, „(x Runden)“ = `floor(Bestand / |Bilanz|)`, Sortierung nach `commodity.sort`. Bestand aus der geladenen Relation `storage`.
  - Terraforming-Block mit Kolonie, Feld, Vorgang, Fertigstellung und Fortschritt. Ohne gespeicherten Start wird der Fortschritt aus Fertigstellung und skalierter Dauer abgeleitet (`ColonyTimingService.scaleBuildTimeSeconds`), begrenzt auf 0–100 %; unbekannte Dauer → kein Balken.
  - Modulproduktion: eingeplante Modulaufträge aller Kolonien in einer Abfrage; Fertigstellung „mit dem nächsten Tick“, weil `finishesAt` laut Entity nicht mehr ausgewertet wird (Module werden im nächsten Koloniatick fertig). Torpedoaufträge nicht im Block.
  - Bauvorgänge der Kolonieliste zeigen „wird nach dem Bau aktiviert/deaktiviert“ (`activateAfterBuild`).
  - Checks: Jest `colony-tick` 237/237, Vitest `src/pages/colonies` 119/119, `tsc` Backend/Frontend sauber, ESLint 0 Fehler.
  - Offen für den Prüfpass: Browserprüfung der Blöcke, gemeinsamer Build.
- 2026-11-19 – Prüfpass (Opus 5.5): Diff bereits bei der Übergabe geprüft (Bestand aus geladener `storage`-Relation, Terraforming-Fortschritt ergänzt). Gesamtlauf auf `66a875fb`: Build `backend frontend shared` erfolgreich, Lint 0 Fehler, Backend-Unit 2605/2605, Frontend 925/925, PostgreSQL 903/1042 – die 139 Fehlschläge sind identisch mit dem vorherigen Prüfpass (vorbestehend, kein Ticket), keine Regression. Offen: Browserprüfung – Verbrauchszeile, Terraforming-Balken, Modulblock, Aktivierungshinweis, leere Blöcke ausgeblendet. Status bleibt `claimed`.
- 2026-11-19 – Abschluss (Opus 5.5): Browserprüfung vom Product Owner als bestanden gesetzt (nicht von Opus selbst im Browser gesehen). Prüflauf auf `7924fb96`: `nx typecheck backend frontend` grün, Build und Lint 0 Fehler, Backend-Unit 2625/2625, Frontend 943/943, PostgreSQL 1048/1048. resolved.
