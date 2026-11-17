# Kooperationsuplink für fremde Crew

**Status:** resolved
**Priority:** P3
**Size:** M
**Blocked by:** sc-WP-CREW-3c, sc-WP-STAT-3b

## Ziel

Das belegte STU-Uplink-Verhalten für die Aufnahme, Unterbringung und Rückholung fremder Crew an Sensorphalanx-Stationen umsetzen. Die Nutzerentscheidung zur STU-Parität ersetzt die bisher nur vorgeschlagenen Produktregeln.

## Verbindlicher STU-Abgleich

Lokaler STU-Commit `f8c8dda33`; Pfade relativ zu `../../st-universe/core/src/`.

- `Module/Spacecraft/Lib/Creation/SpacecraftSystemCreation.php`: Sensorrollen erhalten UPLINK als eingebautes Standardsystem ohne Fertigungsmodul; neue Systeme starten MODE_OFF.
- `Component/Spacecraft/System/Type/UplinkShipSystem.php`: 0 EPS Aktivierung, 5 EPS Betrieb, höchstens drei fremde Spieler; Aktivierung verlangt Fremdcrew und mindestens die reguläre Sollcrew des Eigentümers. Der geerbte Standardmodus ist MODE_OFF.
- `Lib/Transfer/Wrapper/SpacecraftStorageCrewLogic.php`: Aufnahme prüft vorhandenen/intakten Uplink und aktuelle Dockingrechte, aber nicht dessen aktiven Modus oder bereits ausreichende Eigentümercrew. Je fremdem Eigner ein Crewmitglied; normale Gesamtquartiergrenze bleibt. Fremdcrewänderung startet bei erfüllten Bedingungen; ohne Fremdcrew schaltet das System aus.
- `Lib/Transfer/Strategy/TroopTransferStrategy.php`, `Module/Spacecraft/Lib/Crew/TroopTransferUtility.php`: Transfer filtert die Crew des handelnden Eigners. Rückholung prüft Aufnahme-/Docking-/Uplinkintegrität nicht erneut; sonstige räumliche und Transportsicherheitsregeln bleiben bestehen. Rechteentzug oder Systemausfall allein entfernt vorhandene Crew nicht.
- `Module/Spacecraft/Action/StandBy/StandBy.php`, `Module/Tick/Spacecraft/Handler/EnergyConsumeHandler.php`: Standby und Energiemangel schalten Uplink aus; gespeicherte EPS sind für den Betrieb nutzbar. Lesen oder EPS-Nachfüllen allein startet ein ausgeschaltetes System nicht.
- `Module/Tick/Spacecraft/Handler/StationPassiveRepairHandler.php`: passive Reparatur zählt beschädigte Systeme im Zwei-System-Budget und stellt mit Crew den jeweiligen Standardmodus her; Uplink wird daher repariert, aber nicht automatisch aktiviert.
- `Module/Spacecraft/Action/DumpForeignCrewman/DumpForeignCrewman.php`: Stationseigner darf fremde Crew über den vorhandenen Rettungskapselpfad ablegen. Dies ist keine Übertragung des Crew-Eigentums.

## Akzeptanzkriterien

- [x] Nur Sensorphalanx-Stationen beider Fraktionen erhalten den persistenten eingebauten Uplink, auch bestehende Stationen. Keine neue Ware, Fertigung, Forschung oder Baukosten.
- [x] Neue fremde Crewaufnahme verlangt aktuelle Dockingrechte und intaktes System; höchstens drei fremde Spieler, je ein eigenes Crewmitglied, zusätzlich normale Quartiergrenze. Admission verlangt keinen bereits aktiven Uplink.
- [x] Jeder Transfer bewegt ausschließlich Crew des handelnden Eigners. Rückholung bleibt bei Rechteentzug, abgeschaltetem/defektem Uplink möglich, wenn die bisherigen Positions-/Schild-/Tarnungs-/Urlaubs-/Sicherheitsregeln erfüllt sind. Frachtrechte werden durch Uplink nicht erweitert.
- [x] Betrieb verlangt eigene Sollcrew und Fremdcrew; 0 EPS Aktivierung, 5 EPS je Haupttick. Crewbelegung/Integrität und Zustandswechsel bleiben transaktional konsistent. Keine negative Energie und kein Neustart durch Lesen.
- [x] Standby und Brownout schalten aus und behalten Crew. Neue Fremdcrewänderung startet bei erfüllten Bedingungen; manuelle Aktivierung/Deaktivierung bleiben möglich. Reparatur stellt den OFF-Standardmodus her.
- [x] Stationseigner sieht Zustand, Integrität, Kosten, Eigentümercrew und Fremdspielerplätze/Eigner. Der Crew-Eigner kann über die bestehende Transferansicht zurückholen oder den vorhandenen Rettungskapsel-Abzug nutzen. Eigentum bleibt bestehen; vorhandene Ablegen-Aktion bleibt.
- [x] Zerstörung evakuiert sämtliche Eigner über echte Rettungskapseln; Demontage bleibt mit beliebiger Crew gesperrt. Keine stille Crew-Löschung durch Rollen-/Systemverlust.
- [x] PostgreSQL/HTTP prüfen konkurrierende Aufnahme, Limits, Rechteentzug, Defekt, Eigentümerschaft, Energie, Reparatur, Zerstörung, Demontage und Rollback; Unit-/Frontendtests prüfen Systemzustand, Kosten und Anzeige.

## SWU-Anker und Sicherheitsinvarianten

`station-uplink.service.ts`, gemeinsame Crewtransfers/Dockingrechte, `runtimeSystems`, CrewAssignments, Ressourcenflow, passive Stationsreparatur und vorhandene Rettungskapsel-/Demontagepfade. PostgreSQL hält Belegung und Systemzustand auch bei Crewänderungen außerhalb des Transferdialogs konsistent.

STU verwendet bei automatischen Fremdcrewänderungen einen direkten Moduswechsel; dessen mögliche Umgehung der eigenen Integritäts-/Eigentümercrewprüfungen wird nicht übernommen. Diese Aktivierungsinvarianten gelten auch bei automatischen Übergängen und im Tick. Fremdcrew ersetzt keine Eigentümer-Sollcrew. Die belegten Standardmodi und Aufnahme-/Rückholregeln bleiben maßgeblich.

## Comments

- 2026-11-16 – Triage: STU-Rollenbindung und offene Crew-Rückholregeln identifiziert. Konkreter Vorschlag liegt vor, aber verfügbare Stationsrollen und Entzugspolitik sind Produktentscheidungen: needs-info. Siehe [Audit](../triage-2026-11-16.md).

- 2026-11-17 – Nutzerauftrag: STU-Verhalten einschließlich Rückholung/Rechteentzug/Systemausfall abgleichen und umsetzen. STU-Parität ist verbindlich; alte Empfehlungen werden gegen Quellen geprüft. Umsetzung beansprucht.

## Answer

Sensorphalanx-Stationen erhalten den eingebauten persistenten Kooperationsuplink ohne neues Modul oder Baukosten. Aufnahme und Rückholung verwenden den bestehenden Crewtransfer: aktuelle Dockingrechte und intakter Uplink für neue Gäste, drei Fremdspielerplätze mit je einem Crewmitglied, ausschließlich Crew des handelnden Eigners. Rückholung bleibt nach Rechteentzug oder Systemausfall möglich; Fracht-/Energie-/Steuerungsrechte bleiben eigenständig geprüft.

Eigentümer-Sollcrew und Fremdcrew sind getrennt. Der Uplink kostet 0 EPS beim Aktivieren und 5 EPS pro Haupttick, einschließlich gespeicherter Energie. Fremdcrewänderungen können ihn aktivieren; Standby, Brownout und fehlende Betriebsbedingungen schalten ihn ab, ohne Crew zu entfernen. Passive Reparatur stellt den OFF-Standardmodus her. PostgreSQL-Trigger halten Belegung und Zustand bei sämtlichen Crewänderungen konsistent, Stationssperren serialisieren Aufnahme und Dockingrechteänderungen. Die Stationsansicht zeigt Zustand, Integrität, Kosten, eigene Crew und öffentliche Namen der Gasteigner.

Bestehende Rettungskapsel-, Zerstörungs- und Demontagepfade wurden mit echten Produktionsprovidern geprüft. Dabei fehlende Produktionsregistrierung von `StationScrapping` ergänzt. Ein negativer Restbedarf nach Brownout-Abschaltung ist korrigiert, damit keine zusätzliche EPS entsteht.

Prüfgrenze: Dieses Crew-Ticket implementiert Aufnahme, Unterbringung und Rückholung. STUs `SpacecraftLoader.allowUplink` gewährt zusätzlich ausgewählte Stations-/Sensoransichten an Gäste; ein solches Fernzugriffsmodell wird hier nicht über eine pauschale Lockerung der Eigentümerprüfung eingeführt.


## Validation

- Vollständiger Backendlauf: **241 Suites, 2.344 Tests bestanden**. Nach dem Brownout-Fix die betroffenen Ressourcen-, Transfer-, Reparatur-, Runtime-, Docking- und Crewtests erneut geprüft: **8 Suites, 92 Tests bestanden**.
- Echte Produktions-AppModule-/HTTP-/PostgreSQL-Auswahl (`station-uplink|station-beam-blocker|station-scrapping|trade-account-transfer|trade-network-transfer`): **5 Suites, 52 Tests bestanden**. Nach der Anzeigenamenkorrektur Uplink erneut: **13 Tests bestanden**. Keine fachlichen Produktionsprovider ersetzt.
- Frontend vollständig: **128 Dateien/868 Tests bestanden**, ein bestehender `ShipHeaderTable`-Fall unter Parallellast mit 5-s-Timeout. Unveränderter isolierter Nachlauf: **11 Tests bestanden**, insgesamt **869 verschiedene Frontendtests geprüft**. Die drei neuen Uplink-/Transferdialogfälle bestehen.
- `npx nx run-many --targets=lint,typecheck`: erfolgreich für alle vier Projekte; keine Lintfehler, bestehende Warnungen bleiben.
- `npx nx run-many --targets=build` und `npx tsc --build apps/backend/tsconfig.json --emitDeclarationOnly --force`: erfolgreich.
- `StationUplink1794884400000` in der lokalen Dev-Datenbank erfolgreich ausgeführt und committed, ohne Datenbankreset. `git diff --check` erfolgreich.
