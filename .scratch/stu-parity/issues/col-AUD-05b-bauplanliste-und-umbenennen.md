# Baupläne: eigene Liste mit Schiffsanzahl, Bauzeit, Modulen und Umbenennen

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

col-A4 ist resolved, aber Baupläne lassen sich in SWU nicht umbenennen. Endpunkt und Callback existieren, der State `renamingBuildplanId`/`startRenameBuildplan` wird jedoch nie gerendert. Die Bauplanliste zeigt außerdem weder die Zahl der gebauten Schiffe noch Bauzeit, Module oder Crewbedarf. STU hat dafür einen eigenen Tab: Name, Anzahl Schiffe, Bauzeit, „Bauplan auswählen“, Löschen nur wenn erlaubt und ein Detail mit Rumpf, Modulsymbolen, Crewbedarf und „noch n mal baubar“. Im Modulbildschirm gibt es „Name ändern“.

## STU-Quellen

- `src/html/colony/menu/shipBuildplans.twig`
- `src/Module/Colony/Lib/Gui/Component/SpacecraftBuildplansProvider.php`
- `src/Module/Colony/View/ShowBuildPlans/`
- `src/Module/Colony/Action/RenameBuildplan/RenameBuildplan.php`
- `src/html/ship/construction/moduleScreen.twig` („Name ändern“)

## SWU-Pfade

- `apps/frontend/src/pages/colonies/components/PanelShipyard.tsx` („Baupläne dieser Werft“ Z. 1407–1495; toter State Z. 794/962; `onRenameBuildplan`)
- `apps/backend/src/modules/colony/colony.controller.ts` (`PATCH :id/buildplans/:planId` Z. 750, `DELETE` Z. 765, `build` Z. 774)
- `apps/backend/src/modules/colony/colony-shipyard.service.ts`, `entities/colony-ship-buildplan.entity.ts`

## Akzeptanzkriterien

- [x] Ein Bauplan lässt sich in der Bauplanliste und im Bauplan-Editor umbenennen (Eingabefeld, Speichern, Abbrechen). Die Validierungsfehler aus col-A4 (leer, zu lang, doppelt) erscheinen auf Deutsch. Der tote State ist entweder benutzt oder entfernt.
- [x] Die Bauplanliste zeigt je Bauplan Name, Rumpf, Zahl der Schiffe mit diesem Bauplan, Bauzeit, Crewbedarf und die Module (Symbol oder Name je Slot).
- [x] Wie bisher: Bauplan auswählen/bearbeiten, direkt bauen, Löschen nur wenn erlaubt (Sperre aus col-A4).
- [x] Das Backend liefert Schiffsanzahl, Bauzeit und Crewbedarf je Bauplan gesammelt.
- [x] Backend-Test: Schiffsanzahl und Bauzeit im Listen-DTO.
- [x] Frontend-Tests `PanelShipyard.spec.tsx`: Umbenennen (Erfolg und Fehler), Listenspalten, Löschsperre.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt A (Zeile „Bauplan umbenennen“) und Abschnitt D (col-A4).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Seitenabgleich „Baupläne“, kleine Abweichung „Baupläne: kein Umbenennen in der UI“.
- col-A4 (resolved): Das Backend ist gehärtet, die Rename-UI fehlt. Dieses Ticket erfüllt den offenen Teil.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt. Die Rumpfauswahl steht in col-AUD-05a; beide ändern `PanelShipyard.tsx`.
- 2026-11-19 – umgesetzt, Prüfung ausstehend. Umsetzung an Sonnet-Agent delegiert, Review durch Opus 5.5. Commit `a89b639e`.
  - Bauplanliste aus `ColonyProjectionService.listBuildplans`: zwei gruppierte Abfragen (Schiffe, offene Aufträge) für alle Pläne. `shipCount` ohne zerstörte und RPG-versteckte Schiffe; `buildSeconds` und `crewRequired` über die aus `ShipbuildingCoreService` herausgezogenen Funktionen `shipBuildSeconds` und `calculateShipCrewRequired` (Baupfad nutzt sie jetzt ebenfalls, Verhalten unverändert). Bauzeit hängt nur am Rumpf und der globalen Zeitskalierung.
  - Umbenennen in Liste und Editor (Eingabe, Speichern, Abbrechen), Serverfehler inline; col-A4-Validierungstexte auf Deutsch.
  - Befund des Agenten behoben: Die Koloniedetail-Liste lieferte nie `canDelete`, der Löschknopf war im Spiel immer gesperrt. Jetzt geliefert, Regel wie `deleteShipBuildplan` (beliebige Schiffe inkl. zerstörter, offene Aufträge QUEUED/PAUSED). Hinweis: Die Regel steht damit an zwei Stellen und muss bei Änderungen gemeinsam angepasst werden; ein Plan, an dem nur RPG-versteckte Schiffe hängen, bleibt gesperrt, obwohl die Liste 0 Schiffe zeigt (gleiches Verhalten wie der Lösch-Endpunkt).
  - Checks: Jest Schiffbau/Werft/Kolonie 459/459, Vitest `src/pages/colonies` + `app.spec` 172/172, `tsc` sauber, `nx lint` 0 Fehler, PostgreSQL `shipbuilding-workflow` 21/21.
  - Offen für den Prüfpass: Browserprüfung (Liste, Umbenennen, Löschen), gemeinsamer Build.
- 2026-11-19 – Abschluss (Opus 5.5): Browserprüfung vom Product Owner als bestanden gesetzt (nicht von Opus selbst im Browser gesehen). Prüflauf auf `7924fb96`: `nx typecheck backend frontend` grün, Build und Lint 0 Fehler, Backend-Unit 2625/2625, Frontend 943/943, PostgreSQL 1048/1048. resolved.
