# Teleskop-Scan zählt wie STU (Stationen, alle Zustände, ohne Getarnte)

**Status:** claimed
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel

Der Scan des Subraumteleskops zählt in SWU nur Spacecraft vom Typ `SHIP` im Status `IDLE` und prüft die Tarnung nicht. Getarnte Schiffe werden also mitgezählt. Das ist ein Informationsleck, denn das Teleskop verrät getarnte Schiffe in beliebiger Entfernung. Fliegende, reparierende und Stationen fehlen dagegen.

STU zählt alle Spacecraft am Feld einschließlich Stationen, in jedem Zustand, und schließt getarnte aus. Kosten und Kartenansicht entsprechen bereits STU und bleiben.

## STU-Quellen

- `src/Module/Colony/View/ShowSubspaceTelescopeScan/ShowSubspaceTelescopeScan.php` (Kosten Z. 25–26/84–98, EPS-Prüfung Z. 70–76)
- `src/Orm/Repository/LocationRepository.php` (`getRumpCategoryInfo` Z. 130–164; Ausschluss Cloak-System `mode > 1`)

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-telescope.service.ts` (Abfrage Z. 139–151, `kind: SHIP`, `status: IDLE`)
- `apps/backend/src/modules/colony/colony-stats.service.ts` (`deductColonyEnergy` Z. 133–146)
- `apps/backend/src/modules/spacecraft/spacecraft-cloak.ts` (`isCloaked` Z. 25)
- `apps/backend/src/modules/colony/colony-telescope.service.spec.ts`
- `apps/frontend/src/pages/colonies/components/PanelTelescope.tsx` (Kategorienamen für Stationen)
- `docs/adr/0002-persoenliche-systementdeckung-und-dynamisches-scanwissen.md` (Nachtrag Teleskop)

## Akzeptanzkriterien

- [x] Der Scan zählt alle Spacecraft am Zielfeld (Schiffe und Stationen), unabhängig vom Status, außer `DESTROYED`.
- [x] Getarnte Spacecraft (gemeinsame Funktion `isCloaked`, gleiche Bedingung wie Tachyon-/Sensorlogik) werden nicht gezählt, auch die eigenen nicht (STU zählt nach Feld, nicht nach Besitzer).
- [x] Reicht die Energie nicht, bricht der Scan ab, ohne Energie abzuziehen und ohne Ergebnis. Die Meldung ist deutsch (statt „Not enough energy …“).
- [x] Stationen erscheinen mit ihrer Rumpfkategorie; `PanelTelescope` zeigt deutsche Kategorienamen.
- [x] Backend-Tests in `colony-telescope.service.spec.ts`: Station gezählt, fliegendes Schiff gezählt, getarntes Schiff nicht gezählt, zerstörtes nicht gezählt, zu wenig Energie → Abbruch ohne Abzug.
- [x] Frontend-Test `PanelTelescope.spec.tsx` für die Stationskategorie und die Fehlermeldung.
- [x] Der Nachtrag in ADR-0002 wird auf „Kartenansicht und Scan entsprechen STU“ korrigiert.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt J2 (Subraumteleskop) und Abschnitt N2 (Zeile „Teleskop-Scan“); Kartenansicht in N3 als bereits STU-gleich.
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Seitenabgleich „Subraumteleskop“, Unsicherheit Nr. 4 (Kosten gleich).
- PO-Entscheidung 2026-11-17: „wie STU“. Ersetzt beim Scan die `map.md`-Entscheidung „2026-10-21 – col-G1b – Option a“ (Zählweise); col-G1a bleibt gültig.

## Comments

- 2026-11-17: Aus dem Audit angelegt. P1 wegen des Informationslecks bei getarnten Schiffen.

- 2026-11-18: **umgesetzt, Prüfung ausstehend** nach dem getrennten Prüfablauf. Commit-Zuordnung: `fix(colony): align telescope scan visibility with STU (stu-parity col-AUD-15)`.
- Die Abfrage zählt Schiffe und Stationen am unveränderten Galaxie-Zielfeld in jedem Zustand außer `DESTROYED`. Der bisherige SHIP-/IDLE-Filter entfällt. Die gemeinsame Funktion `isCloaked` prüft die direkt geladene JSONB-Spalte `runtimeSystems`; aktive Tarnung schließt auch eigene Spacecraft aus. Zusätzlich bleibt die bereits bestehende allgemeine RPG-Sichtbarkeitsregel erhalten: administrativ versteckte Spacecraft werden für keinen Spieler gezählt. Rumpfkategorien werden anonym gruppiert; Kartenansicht, Kostenformel und der Verzicht auf Scan-Speicherung bleiben bestehen.
- Energiemangel liefert „Nicht genug Energie: benötigt n, vorhanden m“ und stoppt vor Abzug, Ergebnisabfrage und Speicherung. Die Oberfläche übersetzt die bekannten Spielkategorien einschließlich `STATION` → „Station“, erhält unbekannte bzw. schon lokalisierte Kategorien und zeigt die deutsche Backend-Fehlermeldung. Der Nachtrag in ADR-0002 und die historische col-G1b-Zählentscheidung wurden auf die freigegebene STU-Zählweise abgeglichen.
- **Sofortprüfung:** Kurzer Diff-/Sichtbarkeitsreview; `colony-telescope.service.spec.ts`: 16 Tests erfolgreich (Station, alle Status, eigene/fremde aktive Tarnung, leeres Ergebnis ohne verborgene Kategorie, zerstörte Spacecraft, administrative RPG-Sichtbarkeit, Energiemangel ohne Abzug/Abfrage/Speicherung und exakt ausreichende Energie). `PanelTelescope.spec.tsx`: 5 Tests erfolgreich (Stationen, deutsche Fehlermeldung und unveränderte Kategorien einschließlich eines unbekannten Namens, der eine JavaScript-Prototyp-Eigenschaft bezeichnet). Keine breiten Prüfungen oder Builds ausgeführt.
- **Routing/Modelle:** Backend-Sichtbarkeit, ADR und kurzer Review direkt im aktiven Sitzungsmodell; GPT-6.1 Sol ist in dieser laufenden Sitzung nicht umschaltbar, daher Workflow-Fallback. Abgegrenzte Frontend-Übersetzung und Component-Tests durch `ticket-coder` (GPT-6 Luna, high). Lokale Review-Korrektur: Übersetzungen verwenden nur eigene Mapping-Einträge, damit unbekannte Kategorien unverändert bleiben. Keine gemessenen Token-/Einsparungszahlen verfügbar; vorhandene Workspace-Änderungen bleiben erhalten.

## Ausstehender Prüfpass

- [ ] Abschließender Sichtbarkeits-/Abfragereview gegen Ticket, gemeinsame Tarnlogik und RPG-Regeln.
- [ ] Gezielter Backend-/Frontend-ESLint für die vier geänderten Code-/Testdateien.
- [ ] Backend- und Frontend-Typechecks.
- [ ] Ergänzende Regression der bestehenden gemeinsamen Tarnlogik (`spacecraft-cloak.spec.ts`); weitere Läufe nur bei konkretem Befund.
- [ ] Visuelle Prüfung des Teleskop-Panels (Stationskategorie und Energiemeldung), bei Bedarf über nativen Chrome-Zugriff.
- [ ] Gemeinsamer Workspace-Build: `npx nx run-many --targets=build`.

Das Ticket bleibt bis zum erfolgreich abgeschlossenen Prüfpass `claimed`. Erfolgreiche gezielte Tests ohne zwischenzeitliche relevante Änderungen nicht wiederholen.
