# Urlaubsmodus: Schutz vor feindlichen Interaktionen

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** sh-AP-04a, sc-WP-ENG-2c

## Ziel

Schiffe und Kolonien wirksamer Urlauber (sh-AP-04a) können nicht angegriffen, abgefangen, blockiert oder (sobald vorhanden) per Traktorstrahl gezogen oder übernommen werden. Die Prüfung hängt sich in die zentrale Interaktionsprüfung aus sc-WP-ENG-2c ein, damit neue Aktionen den Schutz automatisch erben.

## STU-Quellen

- `src/Lib/Interaction/InteractionCheckType.php` (`EXPECT_TARGET_NO_VACATION`, Text „Aktion nicht möglich, der Spieler befindet sich im Urlaubsmodus!“)
- `src/Lib/Interaction/CustomizedInteractionChecker.php`
- Verwender: `src/Module/Spacecraft/Action/AttackSpacecraft`, `InterceptShip`, `AttackBuilding`, `ActivateTractorBeam`, `StartTakeover`, `BoardShip`, `src/Module/Ship/Action/ColonyBlocking/StartBlocking.php`, `ColonyDefending/StartDefending.php`

## SWU-Pfade

- `apps/backend/src/modules/combat/combat.service.ts#attack`, `#attackColony`
- `apps/backend/src/modules/spacecraft/hyperdrive-disruption.service.ts#intercept`, `spacecraft.service.ts#interceptNearbyTarget`
- `apps/backend/src/modules/colony/colony-orbit.service.ts` (Blockieren)
- zentrale Prüfung aus sc-WP-ENG-2c (z. B. `spacecraft/transfer.service.ts#shipTransferBlockReason` bzw. deren Nachfolger)
- `packages/shared/src/lib/auth/index.ts#isVacationEffective`

## Akzeptanzkriterien

- [x] Die zentrale Interaktionsprüfung kennt den Prüftyp „Ziel nicht im Urlaub“ und liefert die STU-Meldung „Aktion nicht möglich, der Spieler befindet sich im Urlaubsmodus!“.
- [x] Angriff auf Schiff, Angriff auf Kolonie, Abfangen und Kolonieblockade gegen wirksame Urlauber werden serverseitig mit dieser Meldung abgelehnt; vor Ablauf der 48 h bleiben sie möglich.
- [x] Eigene und freundliche Aktionen (Transfer an eigene Schiffe, Verteidigen der eigenen Kolonie) bleiben unberührt.
- [x] Die NBS-Liste markiert Urlauber-Schiffe (Namenszusatz aus sh-AP-04a) und deaktiviert die Angriffsaktion mit `title`-Begründung.
- [x] Backend-Tests je Aktion (Urlaub wirksam, Urlaub < 48 h, kein Urlaub). Frontend-Test: deaktivierte Angriffsaktion.

## Comments

Umgesetzt über die zentrale `TARGET_VACATION`-Regel mit wirksamer 48-h-Prüfung für Schiffs-/Kolonieangriff, Abfangen und Blockade. Eigene/freundliche Aktionen bleiben erlaubt; das NBS zeigt die bestehende Urlaubsmarkierung und eine deaktivierte Angriffsaktion mit serverseitiger Begründung. Fokus-Tests und Builds sind grün; der vollständige Affected-Gate bleibt an vorbestehenden Baseline-Fehlern außerhalb dieses Issues hängen.
