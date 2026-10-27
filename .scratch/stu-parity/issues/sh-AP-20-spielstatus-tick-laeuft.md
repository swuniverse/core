# Spielstatus „Tick läuft“

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** sh-AP-07b

## Ziel

STU kennt den Spielstatus TICK: Während der Haupttick läuft, ist das Spiel für Spieler gesperrt. SWU erlaubt heute Spieleraktionen parallel zum Haupttick; Konsistenz hängt allein an den Transaktionen der einzelnen Dienste. Zu entscheiden ist, ob SWU den STU-Status übernimmt.

## STU-Quellen

- `src/Component/Game/GameStateEnum.php` (`ONLINE`, `TICK`, `MAINTENANCE`, `RELOCATION`, `RESET`)
- `src/Module/Control/GameController.php` (Sperre während TICK)

## SWU-Pfade

- `apps/backend/src/modules/game-status/*` (`entities/game-status.entity.ts` `GameStatusKind`, `game-status.guard.ts`, `game-status.service.ts`)
- `apps/backend/src/modules/tick/tick.service.ts#handleTick`
- `apps/frontend/src/components/layout/app-shell.tsx` (Wartungsbanner)

## Akzeptanzkriterien

- [ ] Status `TICK` wird zu Beginn des Haupttick gesetzt und am Ende (auch bei Fehler) auf den vorherigen Status zurückgesetzt; das gilt auch für manuell über die Tick-Admin-Seite (sh-AP-07b) ausgelöste Hauptticks. Ein bereits gesetzter Wartungsstatus wird nicht überschrieben.
- [ ] Schreibende Spieler-Endpunkte (`POST/PATCH/PUT/DELETE` mit `RequiresGameAccess`) liefern 503 mit Code `GAME_TICK_RUNNING` und „Der Tick läuft gerade. Bitte versuche es gleich noch einmal.“; Lesezugriffe und Admins bleiben erlaubt.
- [ ] Die App-Shell zeigt ein Banner und lädt nach dem `TICK`-Socket-Event neu.
- [ ] Die Dauer des Hauptticks ist auf der Tick-Admin-Seite sichtbar (sh-AP-07b); ein Hinweis in `docs/` bzw. im Issue-Kommentar nennt die gemessene typische Sperrdauer.
- [ ] Backend-Tests: Status setzen/zurücksetzen inkl. Fehlerfall, 503 für Schreibzugriff, Lese- und Adminzugriff erlaubt. Frontend-Test: Banner.

## Entscheidung

Vorgabe: Variante (a), wie STU. Status `TICK` während des Hauptticks, schreibende Spieleraktionen erhalten 503 mit `GAME_TICK_RUNNING`, Lesezugriffe und Admins bleiben erlaubt, Banner in der App. Die Tickdauer wird über die Tick-Admin-Seite (sh-AP-07b) gemessen.

## Comments

- 2026-10-21 Product Owner: Option a – SWU übernimmt den STU-Spielstatus TICK: Während des Hauptticks erhalten schreibende Spieleraktionen 503, und die App zeigt ein Banner.
