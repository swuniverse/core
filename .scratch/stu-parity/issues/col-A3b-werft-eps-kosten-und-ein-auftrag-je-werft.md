# Werft: EPS-Kosten und ein Auftrag je Werft

**Status:** ready-for-agent
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

- 2026-10-21 Product Owner: Option b – Die Werft übernimmt die STU-Regeln: Bau und Umrüstung kosten die Rumpf-EPS, und je Werftfunktion ist nur ein Bau- oder Umrüstauftrag gleichzeitig aktiv.
