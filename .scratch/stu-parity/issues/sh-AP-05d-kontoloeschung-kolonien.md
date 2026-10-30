# Kontolöschung: Umgang mit Kolonien

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** sh-AP-05a, col-E2

## Ziel

Beim Löschen eines Kontos müssen seine Kolonien samt Queues (Bau, Werft, Fabrikation, Crewausbildung, Abbau) behandelt werden. STU setzt jede Kolonie über `ColonyResetter` vollständig zurück. SWU hat für die freiwillige Kolonieabgabe ein Ruinenmodell (Gebäude und Lager bleiben, Wiederbesiedlung möglich), das laut col-E2 noch nicht als ADR bestätigt ist.

## STU-Quellen

- `src/Component/Player/Deletion/Handler/ColonyDeletionHandler.php`
- `src/Module/Colony/Lib/ColonyResetter.php`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-abandonment.service.ts#giveUpColony`
- `apps/backend/src/modules/colony/colony-purge.ts`
- `apps/backend/src/modules/colony/entities/*` (Queues, Crew)
- Handler-Registrierung aus sh-AP-05a

## Akzeptanzkriterien

- [ ] Der Löschhandler nutzt den Codepfad von `giveUpColony` (ggf. herausgelöst, mit Option „Startkolonien-Sperre umgehen“); keine zweite Implementierung.
- [ ] Alle Kolonien des Spielers (inkl. Startkolonie) verlieren den Besitzer und werden Ruinen mit Gebäuden und Lager; laufende Queues werden ohne Rückerstattung beendet; Orbit-Zuordnungen und Blockaden werden aufgehoben.
- [ ] Der Handler läuft nach dem Schiffs-Handler (sh-AP-05c).
- [ ] Integrationstest (Postgres): Spieler mit zwei Kolonien und laufenden Queues wird gelöscht; beide Kolonien sind besitzerlose Ruinen mit Gebäuden und Lager; keine FK-Fehler.

## Entscheidung

Vorgabe: Variante (a). Ruinenmodell wie die freiwillige Abgabe (col-E2): Gebäude und Lager bleiben, Kolonie wird besitzerlos und wiederbesiedelbar; gleicher Codepfad wie `giveUpColony`, die Startkolonien-Sperre wird für die Kontolöschung umgangen. Kein STU-Reset.

## Comments

- 2026-10-21 Product Owner: Option a – Kolonien eines gelöschten Kontos werden wie bei der freiwilligen SWU-Abgabe zu wiederbesiedelbaren Ruinen mit Gebäuden und Lager (gleicher Codepfad wie `giveUpColony`, Startkolonien-Sperre umgangen).
