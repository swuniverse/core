# Werft: EPS-Kosten und ein Auftrag je Werft

**Status:** claimed
**Priority:** P2
**Size:** S
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

- [ ] `epsCost` je SWU-Schiffsklasse wird über deren explizites `stuRumpId` aus den autoritativen STU-Rumpfdaten übernommen; bewusst gemeinsam gemappte Profile teilen den Wert.
- [ ] Bau und Umrüstung prüfen und ziehen die Rumpf-EPS-Kosten ab; zu wenig EPS → Ablehnung mit Meldung.
- [ ] Die API übermittelt für jeden neuen BUILD-/RETROFIT-Auftrag die aktuell in der UI ausgewählte kompatible Werftfunktion; Queuezeilen persistieren diese Funktion und validieren sie transaktionssicher.
- [ ] Je persistierter Werftfunktion ist insgesamt höchstens ein aktiver BUILD- oder RETROFIT-Auftrag zulässig; BUILD und RETROFIT schließen sich auf derselben Funktion gegenseitig aus. REPAIR belegt diesen Slot nicht.
- [ ] Vor der Migration angelegte Aufträge bleiben ungebunden, laufen regulär aus, reservieren keine neu modellierte Funktion und blockieren keine neuen gebundenen Aufträge.
- [ ] Der Werftbildschirm zeigt die EPS-Kosten und die Belegung der ausgewählten Funktion.
- [ ] Backend- und Frontend-Tests für EPS-Mangel, Auswahl/Persistenz der Funktion, BUILD-/RETROFIT-Ausschluss, ungebundene Legacy-Aufträge, REPAIR-Ausnahme und Gutfall.

## Entscheidung

Vorgabe: STU-Regeln. Die bereits vorhandene Spielerwahl der kompatiblen Werftfunktion wird durch API und Queue getragen; der Server wählt nicht eigenmächtig eine andere Funktion. Ein aktiver BUILD- oder RETROFIT-Auftrag belegt die gewählte Funktion. Legacy-Aufträge bleiben ungebunden und nicht blockierend; REPAIR gehört nicht zu dieser Belegung. EPS stammen über `stuRumpId` aus den STU-Rumpfdaten; keine ADR.

## Comments

- 2026-10-22 Agent: Blocker: Die verbindlichen STU-`eps_cost`-Werte sind zwar im `dist/db/stu.dump` vorhanden, aber die bestehende SWU-Zuordnung verwendet für viele Star-Wars-Klassen nur generische `stuRumpId`-Profile (zum Beispiel teilen mehrere SWU-Klassen denselben STU-Rumpf). Kritischer fehlt im Queue-Modell die Werftfunktion: `colony_ship_build_queue` speichert weder `buildingFunctionId` noch das konkrete Werftfeld. Bei Kolonien mit mehreren aktiven Werftfunktionen kann deshalb weder bestehender Bestand verlustfrei zugeordnet noch „höchstens ein BUILD- oder RETROFIT-Auftrag je Werftfunktion“ eindeutig geprüft werden; die API übermittelt ebenfalls keine ausgewählte Funktion. Bitte festlegen, ob (1) der Auftrag eine vom Spieler ausgewählte Werftfunktion speichern soll und Altaufträge ungebunden regulär auslaufen, oder (2) automatisch eine kompatible freie Funktion gewählt und gespeichert werden soll, sowie welche Funktion bei mehreren kompatiblen freien Funktionen Priorität hat.

- 2026-10-21 Product Owner: Option b – Die Werft übernimmt die STU-Regeln: Bau und Umrüstung kosten die Rumpf-EPS, und je Werftfunktion ist nur ein Bau- oder Umrüstauftrag gleichzeitig aktiv.
- 2026-10-27 Product Owner: Die bestehende UI-Auswahl wird persistiert. Legacy-Aufträge bleiben ungebunden, blockieren keine Funktion und laufen normal aus; EPS folgen dem gemappten `stuRumpId`, REPAIR belegt keinen BUILD-/RETROFIT-Slot.
