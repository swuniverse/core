# Werft: EPS-Kosten und ein Auftrag je Werft

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** col-A1a, col-A3a

## Ziel

STU zieht beim Schiffsbau und bei der Umrüstung die Rumpf-EPS-Kosten (`rump->getEpsCost`) ab und erlaubt je Werftfunktion nur einen laufenden Bau- oder Umrüstauftrag. SWU übernimmt diese Regeln und persistiert dafür die bereits in der Oberfläche gewählte kompatible Werftfunktion am Auftrag.

## STU-Quellen

- `src/Module/Colony/Action/BuildShip/BuildShip.php` (EPS-Prüfung Z. 98, Abzug Z. 276)
- `src/Module/Colony/Action/RetrofitShip/`
- `src/Orm/Entity/SpacecraftRump.php` (`eps_cost`)

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-shipyard.service.ts` (`buildShip`, `queueShipRetrofit`, `cancelShipyardQueue`)
- `apps/backend/src/modules/colony/entities/colony-ship-build-queue.entity.ts`
- `game-data/data/ship-building/stu-rump-stats.yaml` (ein `epsCost` fehlt bisher und müsste aus dem STU-Dump ergänzt werden)
- `apps/frontend/src/pages/colonies/components/PanelShipyard.tsx`

## Akzeptanzkriterien

- [x] `epsCost` je SWU-Schiffsklasse wird über deren explizites `stuRumpId` aus den autoritativen STU-Rumpfdaten übernommen; bewusst gemeinsam gemappte Profile teilen den Wert.
- [x] Bau und Umrüstung prüfen und ziehen die Rumpf-EPS-Kosten ab; zu wenig EPS → Ablehnung mit Meldung.
- [x] Die API übermittelt für jeden neuen BUILD-/RETROFIT-Auftrag die aktuell in der UI ausgewählte kompatible Werftfunktion; Queuezeilen persistieren diese Funktion und validieren sie transaktionssicher.
- [x] Je persistierter Werftfunktion ist insgesamt höchstens ein aktiver BUILD- oder RETROFIT-Auftrag zulässig; BUILD und RETROFIT schließen sich auf derselben Funktion gegenseitig aus. REPAIR belegt diesen Slot nicht.
- [x] Vor der Migration angelegte Aufträge bleiben ungebunden, laufen regulär aus, reservieren keine neu modellierte Funktion und blockieren keine neuen gebundenen Aufträge.
- [x] Der Werftbildschirm zeigt die EPS-Kosten und die Belegung der ausgewählten Funktion.
- [x] Backend- und Frontend-Tests für EPS-Mangel, Auswahl/Persistenz der Funktion, BUILD-/RETROFIT-Ausschluss, ungebundene Legacy-Aufträge, REPAIR-Ausnahme und Gutfall.

## Entscheidung

Vorgabe: STU-Regeln. Die bereits vorhandene Spielerwahl der kompatiblen Werftfunktion wird durch API und Queue getragen; der Server wählt nicht eigenmächtig eine andere Funktion. Ein aktiver BUILD- oder RETROFIT-Auftrag belegt die gewählte Funktion. Legacy-Aufträge bleiben ungebunden und nicht blockierend; REPAIR gehört nicht zu dieser Belegung. EPS stammen über `stuRumpId` aus den STU-Rumpfdaten; keine ADR.

## Comments

- 2026-10-22 Agent: Blocker: Die verbindlichen STU-`eps_cost`-Werte sind zwar im `dist/db/stu.dump` vorhanden, aber die bestehende SWU-Zuordnung verwendet für viele Star-Wars-Klassen nur generische `stuRumpId`-Profile (zum Beispiel teilen mehrere SWU-Klassen denselben STU-Rumpf). Kritischer fehlt im Queue-Modell die Werftfunktion: `colony_ship_build_queue` speichert weder `buildingFunctionId` noch das konkrete Werftfeld. Bei Kolonien mit mehreren aktiven Werftfunktionen kann deshalb weder bestehender Bestand verlustfrei zugeordnet noch „höchstens ein BUILD- oder RETROFIT-Auftrag je Werftfunktion“ eindeutig geprüft werden; die API übermittelt ebenfalls keine ausgewählte Funktion. Bitte festlegen, ob (1) der Auftrag eine vom Spieler ausgewählte Werftfunktion speichern soll und Altaufträge ungebunden regulär auslaufen, oder (2) automatisch eine kompatible freie Funktion gewählt und gespeichert werden soll, sowie welche Funktion bei mehreren kompatiblen freien Funktionen Priorität hat.

- 2026-10-21 Product Owner: Option b – Die Werft übernimmt die STU-Regeln: Bau und Umrüstung kosten die Rumpf-EPS, und je Werftfunktion ist nur ein Bau- oder Umrüstauftrag gleichzeitig aktiv.
- 2026-10-27 Product Owner: Die bestehende UI-Auswahl wird persistiert. Legacy-Aufträge bleiben ungebunden, blockieren keine Funktion und laufen normal aus; EPS folgen dem gemappten `stuRumpId`, REPAIR belegt keinen BUILD-/RETROFIT-Slot.

- 2026-10-27 Agent: Abbruch nach zwei ernsthaften Umsetzungs-/Prüfversuchen. Der bestehende Shipyard-Service verarbeitet Bau, Material-/Crew-Reservierung, EPS-Abzug und Queue-Slot nicht in einer Datenbanktransaktion; eine rein service-seitige Prüfung wäre rennanfällig und könnte bei später Fehlerprüfung bereits EPS/Material abziehen. Für die geforderte transaktionssichere Validierung braucht es eine Produkt-/Scope-Entscheidung: Darf dieses S-Issue auf M erweitert werden, um `buildShip` und `queueShipRetrofit` auf eine gemeinsame `DataSource.transaction` mit Zeilensperre und Manager-Repositories umzubauen? Produktcode wurde gemäß Abbruchregel verworfen.
- 2026-10-30 Product Owner: Option 1. Das Issue wird auf Größe M erweitert. `buildShip` und `queueShipRetrofit` müssen Ressourcenreservierung, EPS-Abzug und Prüfung/Belegung der gewählten Werftfunktion in einer gemeinsamen Datenbanktransaktion mit geeigneter Zeilensperre und Manager-Repositories ausführen. Rennanfällige rein service-seitige Vorprüfungen sind nicht ausreichend. Das Issue ist `ready-for-agent`.
- 2026-10-30 Agent: Umgesetzt. `epsCost` je `stuRumpId` aus `stu.dump:stu_rumps.eps_cost` in `game-data/data/ship-building/stu-rump-stats.yaml` (Submodul-Commit f58e029, `validate.ts` prüft das Feld). Backend: `colony_ship_build_queue.buildingFunctionId` (Migration `20261030140000`, Altaufträge NULL = ungebunden/nicht blockierend); `buildShip`/`buildShipFromBuildplan`/`queueShipRetrofit` nehmen die gewählte Werftfunktion aus der API (`buildingFunctionId`), validieren sie als aktiv/kompatibel und führen Slot-Prüfung, EPS-Abzug, Material-/Modul-/Crew-Reservierung in `ColonyShipyardService.reserveShipyardSlot` in einer `DataSource.transaction` mit `pessimistic_write` auf `colony_changeable` aus. Frontend: `PanelShipyard` sendet die gewählte Funktion, zeigt EPS-Kosten vs. vorhandene Energie und die Belegung. Offene Folgepunkte: Abbruch eines Bau-/Umrüstauftrags erstattet EPS nicht (STU erstattet ebenfalls nichts, daher unverändert); `game-data` `npm run validate` meldete schon vorher fehlende STU-Rumpfwerte für Stationsklassen (nicht Teil dieses Issues). Die Migration wurde nicht gegen eine DB ausgeführt.
