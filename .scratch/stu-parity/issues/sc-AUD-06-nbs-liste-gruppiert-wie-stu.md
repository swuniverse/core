# NBS-Liste gruppiert wie STU

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Die NBS-Liste in SWU ist flach: Eine einzige Gruppe „Einzelschiffe“ enthält alle Schiffe und Stationen. Flottenstärken sind nicht erkennbar, auf vollen Feldern geht die Übersicht verloren. STU gliedert in „Stationen“, je Flotte eine Kopfzeile, „Einzelschiffe“ und „Trümmerfelder“, zeigt einen Hinweis auf getarnte Schiffe und je Zeile Logbuch- und RPG-Icons; Stationen können eine ganze Flotte andocken.

## STU-Quellen

- `src/html/shipmacros.twig` (Z. ~72–197 `nbsblock`/Gruppen; Z. ~400–412 Logbuch-Icon `hasLogBook`, RPG-Icon `getRPGModuleState`)
- `src/Component/Spacecraft/Nbs/NbsUtility.php` (Z. ~70–90, Gruppen `STATION_NBS`/`FLEET_NBS`/`SPACECRAFT_NBS`/`TRUMFIELD_NBS`, `showCloakedShipInfo`)
- `src/Module/Station/Action/DockFleet/DockFleet.php` (`B_DOCK_FLEET`, Station dockt Flotte)

## SWU-Pfade

- `apps/frontend/src/components/spacecraft/NearbySensorPanel.tsx` (Z. ~280–295, eine Gruppe „Einzelschiffe“)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`getNearby`, Z. ~4072 ff.; parallel in Arbeit, Zeilen auf HEAD)
- `apps/backend/src/modules/spacecraft/spacecraft-docking.service.ts` (Flottendock bisher nur durch den Leader)
- `packages/shared/src/lib/spacecraft/index.ts` (`SpacecraftNearbyDto`, `SpacecraftNearbyTargetDto`, Z. ~793–1000)

## Akzeptanzkriterien

- [x] `SpacecraftNearbyDto` liefert Gruppen bzw. je Ziel Flotten-ID/-Name/Leader und je Flotte die Anzahl sichtbarer Schiffe; Stationen werden getrennt geliefert.
- [x] Das NBS zeigt die Gruppen „Stationen“, je Flotte eine Kopfzeile (Name, Anzahl sichtbarer Schiffe, „Flotte beitreten“ wo erlaubt, verteidigte/blockierte Kolonie, auf-/zuklappen, PM an Eigner), „Einzelschiffe“ und „Trümmerfelder“ in STU-Reihenfolge.
- [x] Hinweis „Es befinden sich getarnte Schiffe in diesem Sektor“ nach STU-Bedingung (Gravitationswellenscanner aktiv, kein laufender Scan, getarntes Schiff am Feld) – ohne getarnte Schiffe selbst preiszugeben.
- [x] Je Zeile Logbuch-Icon, wenn das Ziel nicht-private Logbucheinträge hat (Anschluss an sc-AUD-13), und RPG-Icon bei aktivem RPG-Transponder (nur soweit sc-WP-SPEC-2 die Sichtbarkeit erlaubt; an dessen Code nichts ändern).
- [x] Eine eigene Station kann eine eigene Flotte am Feld aus der Flottenkopfzeile andocken; Regeln und Teilergebnis nach sc-AUD-11 (Station zahlt EPS).
- [x] Unicode-Glyphen (⌁, ◎, ⚔, ⇪) durch die vorhandenen Icon-Assets bzw. konsistente Icons mit Tooltip ersetzen.
- [x] Backend-Tests für Gruppierung und Getarnt-Hinweis (kein Informationsleck); Frontend-Tests für Gruppen, Kopfzeile und Station-dockt-Flotte.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt C („Schiffsliste / NBS“); [spacecraft.md](../audit-2026-11-17/spacecraft.md) große Abweichung 6, Seitenabgleich „NBS“.
- Andocken der Flotte durch die Station hängt an PO-Entscheidung K2 vom 2026-11-17 (schiffsweise, siehe sc-AUD-11).

## Comments

- Abhängigkeit: Die Aktion „Station dockt Flotte“ nutzt den Endpunkt aus sc-AUD-11. Ist sc-AUD-11 noch offen, Kopfzeile und Gruppen zuerst umsetzen und die Aktion danach ergänzen.
- 2026-11-20 – umgesetzt, Prüfung ausstehend (Commit „feat(spacecraft): NBS grouped like STU (stu-parity sc-AUD-06)“, Assets-Submodul b833a2794c). Modell: Claude Opus 5.5 direkt im Hauptchat (weder Sol noch Luna verfügbar; Informationsschutz-Thema daher nicht delegiert).
  - Backend `getNearby`: `fleets[]` (Name, Leader, Eigner, sichtbare Schiffe, verteidigt/blockiert aus `ColonyOrbitAssignment`, `canJoin` = eigene Flotte, Schiff ohne Flotte, keine Station; STU-Reihenfolge sort/id DESC), je Ziel `hasLogBook`/`rpgActive`, `cloakedShipsHint` nach STU `showCloakedShipInfo` (Tachyonscanner an, kein laufender Scan, fremdes sichtbares getarntes Schiff). Stationen über `kind`. Getarnte Schiffe zählen nicht in Flotten und erscheinen mit Name/Flotte nicht in der Antwort.
  - Frontend: Gruppen Stationen → je Flotte Kopfzeile (Anzahl, „Flotte beitreten“, Verteidigt/Blockiert-Icon, auf-/zuklappen, im zugeklappten Zustand Eigner + PM) → Einzelschiffe → Rettungskapseln → Trümmerfelder; Getarnt-Hinweis ersetzt die Leermeldung wie STU. Glyphen ⌁/◎/⚔/⇪ durch `trak1`/`mark`/`crew`/`b_up1` mit Tooltip ersetzt; `log.png`, `rpg1.png`, `mark.png`, `trak1.png`, `block1.png` aus STU übernommen.
  - Logbuch-Icon zählt derzeit alle Einträge (es gibt noch kein Privat-Flag, Default laut sc-AUD-13 „nicht privat“). sc-AUD-13 muss hier `isPrivate = false` und nicht gelöscht ergänzen.
  - Offen: „Station dockt Flotte“ aus der Flottenkopfzeile, weil sc-AUD-11 noch offen ist (Ticket-Kommentar). Frontend-Test dafür entsprechend offen.
  - Checks: `nx typecheck` shared/frontend/backend grün; `vitest NearbySensorPanel.spec.tsx` 22/22; `jest spacecraft-core-controls.spec.ts` 26/26 (neu: Gruppierung, Getarnt-Hinweis ohne Leck, Scan-/Scanner-aus-Fälle).
  - Ausstehend: gesammelter Verifikationslauf (u. a. `rpg-transponder.int-spec.ts`, das `getNearby` nutzt) und die Docking-Aktion nach sc-AUD-11.
- 2026-11-20 – Prüflauf (Claude Opus 5.5): Diff gegen alle Kriterien geprüft. Belegt: DTO-Gruppen, Gruppen/Kopfzeile, Getarnt-Hinweis ohne Leck, Logbuch/RPG-Icons, Icons statt Glyphen. Neu: Integrationstest gegen PostgreSQL in `rpg-transponder.int-spec.ts` („groups the NBS …“: echte Abfragen für Logbuch und `ColonyOrbitAssignment`, Flottenzählung mit/ohne Tachyonscan, Hinweis ohne Namen/ID des getarnten Schiffs). Checks: `rpg-transponder.int-spec.ts` 14/14 (13 + neu), `npm run test` Backend 2681/2682 und Frontend 964/965, `nx build` shared/backend/frontend grün. Die beiden Fehlschläge betreffen nicht sc-AUD-06: `admin-users.spec.tsx` ist isoliert grün (Flake unter Last); `resource-collection.controller.spec.ts` erwartet seit `ef80ad05` (col-AUD-16a) die alte PermissionGuard-Meldung „Insufficient permissions“.
  - Nicht erledigt, Ticket bleibt offen: „Station dockt Flotte“ aus der Flottenkopfzeile samt Frontend-Test – wartet auf den Endpunkt aus sc-AUD-11. Status zurück auf `ready-for-agent`, blockiert durch sc-AUD-11.
- 2026-11-20 – Restkriterium umgesetzt, Prüfung ausstehend (gemeinsamer Commit mit sc-AUD-11). `fleets[].canDockFleet` (eigene Station sieht eigene Flotte, STU `isStation and leadShip.isSelectable`); Kopfzeile bietet „(andocken)“ → `POST dock-fleet`, Teilergebnis je Schiff im NBS. Frontend-Tests „lets an own station dock an own fleet …“ und „offers no fleet dock without the station permission flag“; Backend-Tests für Station-dockt-Flotte in sc-AUD-11. Nebenbei behoben: veraltete Erwartung in `resource-collection.controller.spec.ts` (Guard-Meldung aus col-AUD-16a).
  - Ausstehend: separater Prüflauf für den neuen Teil.

