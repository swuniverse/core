# Urlaubsmodus: Schutz vor feindlichen Interaktionen

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** sh-AP-04a, sc-WP-ENG-2

## Ziel

Schiffe und Kolonien wirksamer Urlauber (sh-AP-04a) können nicht angegriffen, abgefangen, blockiert oder (sobald vorhanden) per Traktorstrahl gezogen oder übernommen werden. Die Prüfung hängt sich in die zentrale Interaktionsprüfung aus sc-WP-ENG-2 ein, damit neue Aktionen den Schutz automatisch erben.

## STU-Quellen

- `src/Lib/Interaction/InteractionCheckType.php` (`EXPECT_TARGET_NO_VACATION`, Text „Aktion nicht möglich, der Spieler befindet sich im Urlaubsmodus!“)
- `src/Lib/Interaction/CustomizedInteractionChecker.php`
- Verwender: `src/Module/Spacecraft/Action/AttackSpacecraft`, `InterceptShip`, `AttackBuilding`, `ActivateTractorBeam`, `StartTakeover`, `BoardShip`, `src/Module/Ship/Action/ColonyBlocking/StartBlocking.php`, `ColonyDefending/StartDefending.php`

## SWU-Pfade

- `apps/backend/src/modules/combat/combat.service.ts#attack`, `#attackColony`
- `apps/backend/src/modules/spacecraft/hyperdrive-disruption.service.ts#intercept`, `spacecraft.service.ts#interceptNearbyTarget`
- `apps/backend/src/modules/colony/colony-orbit.service.ts` (Blockieren)
- zentrale Prüfung aus sc-WP-ENG-2 (z. B. `spacecraft/transfer.service.ts#shipTransferBlockReason` bzw. deren Nachfolger)
- `packages/shared/src/lib/auth/index.ts#isVacationEffective`

## Akzeptanzkriterien

- [ ] Die zentrale Interaktionsprüfung kennt den Prüftyp „Ziel nicht im Urlaub“ und liefert die STU-Meldung „Aktion nicht möglich, der Spieler befindet sich im Urlaubsmodus!“.
- [ ] Angriff auf Schiff, Angriff auf Kolonie, Abfangen und Kolonieblockade gegen wirksame Urlauber werden serverseitig mit dieser Meldung abgelehnt; vor Ablauf der 48 h bleiben sie möglich.
- [ ] Eigene und freundliche Aktionen (Transfer an eigene Schiffe, Verteidigen der eigenen Kolonie) bleiben unberührt.
- [ ] Die NBS-Liste markiert Urlauber-Schiffe (Namenszusatz aus sh-AP-04a) und deaktiviert die Angriffsaktion mit `title`-Begründung.
- [ ] Backend-Tests je Aktion (Urlaub wirksam, Urlaub < 48 h, kein Urlaub). Frontend-Test: deaktivierte Angriffsaktion.

## Comments
