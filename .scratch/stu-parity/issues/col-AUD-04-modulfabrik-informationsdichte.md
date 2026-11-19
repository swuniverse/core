# Modulfabrik mit STU-Informationsdichte (Bedarfsfilter, Accountbestand, Sammelbestellung)

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

In der SWU-Modulfabrik startet man jedes Modul einzeln und sieht nur das lokale Lager. „Welche Module brauche ich für Bauplan X?“ lässt sich nicht direkt beantworten. In STU filtert man nach Rumpf oder Bauplan und sieht „(Benötigt: n)“ je Modul. Dazu zeigt STU den accountweiten Bestand mit Link auf die Lagerorte und bestellt mehrere Module mit einem Knopf, mit Vorschau der Fehlmengen. Außerdem zeigt SWU Entwickler-Metadaten, die nicht in die Spieler-UI gehören. Die Fertigungsregeln (col-A2) bleiben unverändert.

## STU-Quellen

- `src/html/colony/menu/moduleFab.twig` (Rumpf-/Bauplanfilter mit „(Benötigt: n)“ Z. ~60–80, Spalten In Bau/Lagernd/Anzahl, Sammelknopf „Modulherstellung“, `#module-production-preview`)
- `src/Module/Colony/Lib/Gui/Component/ModuleFabProvider.php`
- `src/Module/Colony/View/ShowModuleFab/`
- `src/Module/Colony/Action/CreateModules/CreateModules.php` (mehrere Module in einer Aktion)
- `src/Module/Database/View/ShowCommoditiesLocations/` (Lagerorte)

## SWU-Pfade

- `apps/frontend/src/pages/colonies/components/PanelFabrication.tsx` (Freitextsuche Z. 375–381, Entwicklerinfo Z. 461–476, Einzelstart Z. 478–512, lokales Lager Z. 513–518)
- `apps/frontend/src/pages/colonies/components/CommodityLocationsDialog.tsx` (Lagerorte, tmw-D1)
- `apps/backend/src/modules/colony/colony-fabrication.service.ts`, `colony.controller.ts` (Fertigungsendpunkte)
- `apps/backend/src/modules/colony/entities/colony-ship-buildplan.entity.ts` (Bauplanmodule), `colony-shipyard.service.ts`

## Akzeptanzkriterien

- [x] Filter „Rumpf“ und „Bauplan“ wie STU: Bei gewähltem Rumpf bzw. Bauplan werden nur passende Module gezeigt, je Modul mit „(Benötigt: n)“ aus dem Bauplan.
- [x] Je Modul zeigt die Spalte „Lagernd“ den accountweiten Bestand. Ein Klick öffnet die Lagerorte (`CommodityLocationsDialog`). Der lokale Bestand bleibt erkennbar.
- [x] Mengen lassen sich für mehrere Module eintragen und mit einem Knopf „Modulherstellung“ bestellen. Das Backend nimmt die Sammelbestellung in einer Transaktion an. Teilergebnisse meldet es je Modul wie STU `CreateModules` (welche Module, wie viele, wo es scheiterte).
- [x] Vor dem Absenden zeigt eine Vorschau die Gesamtkosten (Waren, Energie) und die Fehlmengen je Ware.
- [x] Die Entwickler-Metadaten („STU: rawName · Tech … · Bundle …“) erscheinen nicht mehr.
- [x] Torpedo- und Komponentenfertigung im selben Panel funktionieren weiter.
- [x] Backend-Tests: Sammelbestellung (alles ok, teilweise Mangel, EPS-Mangel), Bedarfszahlen je Bauplan, accountweiter Bestand.
- [x] Frontend-Tests `PanelFabrication.spec.tsx`: Filter mit „Benötigt“, Vorschau mit Fehlmengen, Sammelknopf, keine Metadaten.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt C (Zeile „Modulfabrik / Werft“).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Seitenabgleich „Modulfabrik“, Große Abweichung Nr. 4, kleine Abweichung „Fabrikationspanel zeigt Entwickler-Metadaten“.
- col-A2 (resolved) bleibt für die Regeln maßgeblich. Dieses Ticket betrifft nur Informationsdichte und Bedienung.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“ (map.md Leitplanke 5: STU-typische Informationsdichte).

## Comments

- 2026-11-17: Aus dem Audit angelegt.
- 2026-11-19 – umgesetzt, Prüfung ausstehend. Umsetzung an Sonnet-Agent delegiert (Transaktions- und Kürzungsregeln vom Planer vorgegeben), Review durch Opus 5.5. Commits `5067d0b9` und „fix(colony): roll back a module batch when stock fails after the clamp (col-AUD-04)“.
  - `POST colonies/:id/fabrication-queue/batch` (1–50 Positionen): eine Transaktion mit gesperrter Kolonie; je Modul nacheinander der bestehende `queueFabrication` (optionaler `manager`) auf demselben Kolonieobjekt, also dieselbe STU-Kürzung wie beim Einzelstart. Ungültige Module werden je Modul gemeldet, inaktives Gebäude lehnt alles ab, unerwartete Fehler rollen alles zurück.
  - Review-Befund behoben: `BadRequestException` aus `lowerStorage`/`deductColonyEnergy` nach der Kürzung wurde als abgelehntes Modul geschluckt und hätte einen Teilabzug committet; im Batch wird daraus jetzt ein Serverfehler mit Rollback (PostgreSQL-Test).
  - `GET colonies/:id/commodity-totals?ids=` liefert den accountweiten Bestand (eigene Kolonielager + eigene Schiffsfracht, eigentümergeprüft, max. 500 IDs), einmal je Panel geladen; Anzeige „Lagernd: gesamt (lokal x)“ mit Klick auf die Lagerorte.
  - Bauplan-/Rumpffilter mit „(Benötigt: n)“ aus bereits geladenen Bauplänen und Rumpfslots, kein Zusatzendpunkt; bei aktivem Filter nur Module. Vorschau mit Gesamtkosten und Fehlmengen je Ware/Energie (lokales Lager, ohne Bestellreihenfolge). Entwickler-Metadaten entfernt; Torpedo-/Komponentenfertigung unverändert.
  - Checks: PostgreSQL `colony-fabrication-batch` 5/5 (Kürzung über zwei Module, EPS-Mangel, Rollback, Rollback nach Kürzung, inaktives Gebäude), Jest 245/245, Vitest `src/pages/colonies` 127/127, `tsc` sauber, `nx lint backend/frontend` 0 Fehler.
  - Nicht getestet: DTO-Grenzen (50 Positionen, positive Ganzzahlen). Offen für den Prüfpass: Browserprüfung, gemeinsamer Build.
- 2026-11-19 – Prüfpass (Opus 5.5): Frontend-Review-Befund behoben: Scheiterte bei mehreren aktiven Modulfabriken eine spätere Gruppe, gingen die Ergebnisse der bereits bezahlten Gruppen verloren und ihre Mengen blieben stehen (Gefahr doppelter Bestellung); jetzt angezeigt und geleert, mit Test. Gesamtlauf auf `fe482b29` (+ Korrektur): Build erfolgreich, Lint 0 Fehler, Backend-Unit 2611/2611, Frontend 935/935 nach Korrektur, PostgreSQL 908/1047 – die 139 Fehlschläge sind identisch mit den vorigen Prüfpässen, keine Regression. Offen: Browserprüfung – Filter, Lagernd/Lagerorte, Vorschau, Sammelbestellung. Status bleibt `claimed`.
- 2026-11-19 – Abschluss (Opus 5.5): Browserprüfung vom Product Owner als bestanden gesetzt (nicht von Opus selbst im Browser gesehen). Prüflauf auf `7924fb96`: `nx typecheck backend frontend` grün, Build und Lint 0 Fehler, Backend-Unit 2625/2625, Frontend 943/943, PostgreSQL 1048/1048. resolved.
