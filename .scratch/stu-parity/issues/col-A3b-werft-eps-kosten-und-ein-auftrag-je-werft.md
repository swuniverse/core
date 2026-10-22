# Werft: EPS-Kosten und ein Auftrag je Werft

**Status:** needs-info
**Priority:** P2
**Size:** S
**Blocked by:** col-A1a, col-A3a

## Ziel

STU zieht beim Schiffsbau und bei der Umrüstung die Rumpf-EPS-Kosten (`rump->getEpsCost`) ab und erlaubt je Werftfunktion nur einen laufenden Bau- oder Umrüstauftrag. SWU verlangt keine EPS und erlaubt parallele Aufträge je Werft; ein Abbruch erstattet kein Material. Diese Abweichung (Fertigungskosten, Leitplanke 1) braucht eine Entscheidung.

## STU-Quellen

- `src/Module/Colony/Action/BuildShip/BuildShip.php` (EPS-Prüfung Z. 98, Abzug Z. 276)
- `src/Module/Colony/Action/RetrofitShip/`
- `src/Orm/Entity/SpacecraftRump.php` (`eps_cost`)

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-shipyard.service.ts` (`buildShip`, `queueShipRetrofit`, `cancelShipyardQueue`)
- `game-data/data/ship-building/stu-rump-stats.yaml` (ein `epsCost` fehlt bisher und müsste aus dem STU-Dump ergänzt werden)
- `apps/frontend/src/pages/colonies/components/PanelShipyard.tsx`

## Akzeptanzkriterien

- [ ] `epsCost` je Rumpf ist aus dem STU-Dump in `game-data/data/ship-building/stu-rump-stats.yaml` ergänzt.
- [ ] Bau und Umrüstung prüfen und ziehen die Rumpf-EPS-Kosten ab; zu wenig EPS → Ablehnung mit Meldung.
- [ ] Je Werftfunktion ist höchstens ein BUILD- oder RETROFIT-Auftrag gleichzeitig aktiv; weitere werden abgelehnt. Bestehende parallele Aufträge laufen regulär aus.
- [ ] Der Modulbildschirm zeigt die EPS-Kosten und ob die Werft belegt ist.
- [ ] Backend- und Frontend-Tests für EPS-Mangel, belegte Werft, Gutfall.

## Entscheidung

Vorgabe: Variante (b), STU-Regeln. Rumpf-EPS-Kosten bei Bau und Umrüstung, höchstens ein BUILD- oder RETROFIT-Auftrag je Werftfunktion. Parallele Aufträge je Werft entfallen; keine ADR.

## Comments

- 2026-10-22 Agent: Blocker: Die verbindlichen STU-`eps_cost`-Werte sind zwar im `dist/db/stu.dump` vorhanden, aber die bestehende SWU-Zuordnung verwendet für viele Star-Wars-Klassen nur generische `stuRumpId`-Profile (zum Beispiel teilen mehrere SWU-Klassen denselben STU-Rumpf). Kritischer fehlt im Queue-Modell die Werftfunktion: `colony_ship_build_queue` speichert weder `buildingFunctionId` noch das konkrete Werftfeld. Bei Kolonien mit mehreren aktiven Werftfunktionen kann deshalb weder bestehender Bestand verlustfrei zugeordnet noch „höchstens ein BUILD- oder RETROFIT-Auftrag je Werftfunktion“ eindeutig geprüft werden; die API übermittelt ebenfalls keine ausgewählte Funktion. Bitte festlegen, ob (1) der Auftrag eine vom Spieler ausgewählte Werftfunktion speichern soll und Altaufträge ungebunden regulär auslaufen, oder (2) automatisch eine kompatible freie Funktion gewählt und gespeichert werden soll, sowie welche Funktion bei mehreren kompatiblen freien Funktionen Priorität hat.

- 2026-10-21 Product Owner: Option b – Die Werft übernimmt die STU-Regeln: Bau und Umrüstung kosten die Rumpf-EPS, und je Werftfunktion ist nur ein Bau- oder Umrüstauftrag gleichzeitig aktiv.
