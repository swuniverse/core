# NBS-Liste gruppiert wie STU

**Status:** ready-for-agent
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

- [ ] `SpacecraftNearbyDto` liefert Gruppen bzw. je Ziel Flotten-ID/-Name/Leader und je Flotte die Anzahl sichtbarer Schiffe; Stationen werden getrennt geliefert.
- [ ] Das NBS zeigt die Gruppen „Stationen“, je Flotte eine Kopfzeile (Name, Anzahl sichtbarer Schiffe, „Flotte beitreten“ wo erlaubt, verteidigte/blockierte Kolonie, auf-/zuklappen, PM an Eigner), „Einzelschiffe“ und „Trümmerfelder“ in STU-Reihenfolge.
- [ ] Hinweis „Es befinden sich getarnte Schiffe in diesem Sektor“ nach STU-Bedingung (Gravitationswellenscanner aktiv, kein laufender Scan, getarntes Schiff am Feld) – ohne getarnte Schiffe selbst preiszugeben.
- [ ] Je Zeile Logbuch-Icon, wenn das Ziel nicht-private Logbucheinträge hat (Anschluss an sc-AUD-13), und RPG-Icon bei aktivem RPG-Transponder (nur soweit sc-WP-SPEC-2 die Sichtbarkeit erlaubt; an dessen Code nichts ändern).
- [ ] Eine eigene Station kann eine eigene Flotte am Feld aus der Flottenkopfzeile andocken; Regeln und Teilergebnis nach sc-AUD-11 (Station zahlt EPS).
- [ ] Unicode-Glyphen (⌁, ◎, ⚔, ⇪) durch die vorhandenen Icon-Assets bzw. konsistente Icons mit Tooltip ersetzen.
- [ ] Backend-Tests für Gruppierung und Getarnt-Hinweis (kein Informationsleck); Frontend-Tests für Gruppen, Kopfzeile und Station-dockt-Flotte.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt C („Schiffsliste / NBS“); [spacecraft.md](../audit-2026-11-17/spacecraft.md) große Abweichung 6, Seitenabgleich „NBS“.
- Andocken der Flotte durch die Station hängt an PO-Entscheidung K2 vom 2026-11-17 (schiffsweise, siehe sc-AUD-11).

## Comments

- Abhängigkeit: Die Aktion „Station dockt Flotte“ nutzt den Endpunkt aus sc-AUD-11. Ist sc-AUD-11 noch offen, Kopfzeile und Gruppen zuerst umsetzen und die Aktion danach ergänzen.
