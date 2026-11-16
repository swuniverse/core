# Fremde Crew aus Kapseln an Handelsposten überstellen und fremde Crew ablegen

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** sc-WP-CREW-3b, tmw-T1c

## Ziel

Wie in STU wird beim Bergen fremde Crew an den nächstgelegenen Handelsposten überstellt; ihr Eigner erhält eine Nachricht und sieht sie in „Verschollene Crew“ unter Handelsposten. Fremde Crew an Bord kann abgelegt werden (STU `DumpForeignCrewman`).

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/SalvageEmergencyPods/SalvageEmergencyPods.php` (`sendPMsToCrewOwners`, `getClosestTradePost`)
- `Module/Spacecraft/Action/DumpForeignCrewman/DumpForeignCrewman.php`, `Module/Spacecraft/Lib/Crew/SpacecraftLeaver.php` (`dumpCrewman`)
- `Module/Colony/View/ShowPodsLocations` (`getOrphanedSummaryByUserAtTradeposts`)

## SWU-Pfade

- Handelsposten-Modell aus tmw-T1c
- `apps/backend/src/modules/colony/entities/crew-assignment.entity.ts` (neuer Bezug Handelsposten), Migration
- Kapsel-Bergung aus sc-WP-CREW-3b, Ansicht „Verschollene Crew“

## Akzeptanzkriterien

- [x] Beim Bergen wird fremde Crew dem nächstgelegenen Handelsposten zugeordnet; ohne erreichbaren Posten bricht die Bergung mit Meldung ab (STU).
- [x] Eigner der fremden Crew erhält eine Systemnachricht mit Postenname und Sektor.
- [x] „Verschollene Crew“ listet Crew an Handelsposten.
- [x] Fremde Crew an Bord kann der Schiffseigner ablegen (in Kapsel), der Crew-Eigner kann sie abziehen (mit Nachricht an den Schiffseigner).
- [x] Backend- und Frontend-Tests.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-11-02: Umsetzung nach zwei ernsthaften Prüfversuchen abgebrochen. Die fokussierten Backend-/Frontend-Tests, Typechecks und Builds sind grün, aber das verbindliche Gate `npx nx affected -t lint typecheck test --base=HEAD` bleibt wegen zweier fachfremder Backend-Baselinefehler rot: `spacecraft-fleet.service.spec.ts` scheitert mit `Not enough EPS for navigation`, `spacecraft-core-controls.spec.ts` mit fehlendem `shipRepo.findOneBy` im Test-Double. Benötigt Entscheidung bzw. separates Baseline-Issue, bevor dieses Issue erneut umgesetzt wird.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Flotten-EPS- und shipRepo.findOneBy-Fixtures); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.


## Answer

- Crew-Zuordnungen besitzen jetzt `tradePostId`; Migration `20261116120000-add-crew-at-trade-posts` ergänzt Index, Fremdschlüssel und die Vier-Wege-Standortbedingung (genau eine Kolonie, Schiff, Kapsel oder Handelsposten). Ein Rollback wird bei dort wartender Crew verweigert und verliert keine Crew.
- Kapseln mit fremder Crew sind bergbar. Vor jeder Umbuchung wird für **jeden Crew-Eigner** der nächste erreichbare Posten ermittelt: gleiche Galaxieebene, Manhattan-Distanz, Posten-ID als stabile Gleichstandsregel. Systempositionen werden über ihr Sternensystem auf Galaxiekoordinaten projiziert. Stationsposten prüfen aktuelle Spieler-/Allianz-/Fraktions-Dockingrechte; Verbote haben Vorrang, schiffsspezifische Rechte sind keine Crew-Freigabe. Die bestehenden eigenständigen NPC-Posten ohne Stationsbezug sind öffentlich erreichbar; verlassene Posten scheiden aus.
- Ohne erreichbaren Posten schlägt die **gesamte** Bergung vor Crew-/EPS-Änderungen fehl. Fremde Crew wechselt zum Posten, eigene Crew bleibt unter der vorhandenen Kapazitätsregel an Bord bzw. in der Kapsel. Eine erfolgreiche Aktion kostet weiterhin 1 EPS. Meldungen mit Postenname und Sektor werden in derselben Transaktion gespeichert; Live-Benachrichtigungen erfolgen erst nach Commit. Die frühere STU-Wiederverwendung des Postens des ersten Crew-Eigners wird nicht übernommen.
- „Verschollene Crew“ zeigt zusätzlich Handelsposten mit eigener wartender Crew und eigene Crew auf fremden Schiffen. Der Crew-Eigner kann dort einzelne Mitglieder abziehen. Der Schiffseigner sieht Gäste separat im Crew-Fenster und kann sie ablegen, erhält aber keine Bearbeitungsrechte für deren Namen, Position oder Beförderung. Beide Wege erzeugen eine Kapsel, leeren den Slot, synchronisieren die Schiffszählung und benachrichtigen den jeweils anderen Eigner; Außenstehende und eigene Crew auf dem eigenen Schiff sind ausgeschlossen.
- Bei Zerstörung eines Stationshandelspostens wechselt wartende Crew vor der Postenlöschung in Kapseln und erhält eine Nachricht; der neue Fremdschlüssel verhindert unbemerkten Crewverlust.
- Neue API-Sichten: `GET /spacecraft/lost-crew/trade-posts`, `GET /spacecraft/lost-crew/ships`; gemeinsame Aktion `POST /spacecraft/:id/crew/:crewId/release`. Die bestehende Kapsel-Sicht bleibt kompatibel.

## Validation

- Gezielte Crew-/Kapsel-Backend-Tests: **32 Tests / 3 Suites**, einschließlich fremder Bergung, atomarem Abbruch gemischter Kapseln und Berechtigung beim Ablegen/Abziehen.
- `npx nx run backend:test-integration --runInBand --testPathPatterns='foreign-crew|escape-pod|player-trade-post-lifecycle'`: **14 Tests / 3 Suites grün** gegen PostgreSQL mit echten Migrationen. Einschließlich Nachrichtenfehler-Rollback ohne EPS-/Crew-Verlust, Dockingrechten, Eignerfilterung, Kapselbildung, Postenzerstörung und Standort-/FK-Bedingungen sowie geschütztem und anschließend erfolgreichem Migrations-Down/Up.
- Frontend-Tests für Handelspostenliste, Crew-Abziehen und Crew-Ablegen ohne fremde Bearbeitungsfelder.
- `npx nx affected -t lint typecheck test --base=HEAD --parallel=2`: grün; Backend **231 Suites / 2209 Tests**, Frontend **110 Dateien / 793 Tests**. Lint ohne Fehler.
- `npx nx run-many --targets=build`: grün für alle drei Projekte. Backend-Deklarationen anschließend mit `npx tsc --build apps/backend/tsconfig.json --emitDeclarationOnly --force` regeneriert.
- 2026-11-16: sc-WP-CREW-3c abgeschlossen auf `stu-parity`.
