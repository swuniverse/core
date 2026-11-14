# Zeitbasierten Hyperraumsprung zurückbauen

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-NAV-3

## Ziel

Den durch ADR-0006 verworfenen Zeitflug vollständig entfernen. Reisen zwischen Systemen erfolgen danach nur noch als feldweiser Galaxieflug mit Systemein- und -austritt; Langstreckensprünge bleiben sc-WP-NAV-5b vorbehalten.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/MoveShip`
- `Module/Spacecraft/Lib/Movement/ShipMover.php`
- `Module/Ship/Action/Transwarp` (Abgrenzung des Langstreckensprungs)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts`
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts`
- `apps/backend/src/modules/spacecraft/entities/spacecraft.entity.ts`
- `apps/backend/src/modules/tick/tick.service.ts`
- `apps/frontend/src/` (Warp-Aktionen, Flugstatus, Ankunftsanzeige und Abbruch)
- `packages/shared/` (Status und DTO-Felder)
- `apps/backend/src/database/migrations/`

## Akzeptanzkriterien

- [x] `warp`-API und -Service, `processMovement` sowie `checkWarpArrivals` sind entfernt.
- [x] `IN_FLIGHT`, `arrivalAt`, `originLocation`, `targetLocation` und `warpCooldown` sind aus Entity, DTOs, Persistenz und Laufzeitlogik entfernt, soweit sie ausschließlich dem Zeitflug dienen.
- [x] Frontend-Aktionen und -anzeigen für Zeitflug, Ankunft und Flugabbruch sind entfernt; Galaxieflug und Systemein-/-austritt bleiben bedienbar.
- [x] Hyperraumrouten bleiben als Kartendarstellung erhalten und bewirken keine Reisezeitverkürzung.
- [x] Eine Migration setzt jedes beim Upgrade in `IN_FLIGHT` befindliche Schiff deterministisch und sicher auf seinen Ausgangsort zurück; fehlt dieser, bleibt der aktuelle gültige Ort erhalten. Temporäre Flugreferenzen werden anschließend gelöscht.
- [x] Backend- und Frontendtests decken API-Wegfall, Migration laufender Flüge und unveränderten feldweisen Galaxieflug ab.

## Comments

- Entdeckt bei sc-WP-NAV-3. Die Migration darf Schiffe nicht direkt ans Ziel teleportieren, weil der verworfene Zeitflug sonst beim Upgrade noch spielmechanisch belohnt würde.
- 2026-11-09: Das Rückbauziel und die Migration laufender Flüge auf den Ausgangsort (ersatzweise den aktuellen gültigen Ort) sind bereits entschieden und oben spezifiziert. `sc-WP-NAV-3` ist erledigt; Status `ready-for-agent`. Umsetzung und issue-spezifische Prüfungen stehen noch aus.
- 2026-11-15: Umgesetzt (e093e694).
  - Entfernt: `POST /spacecraft/:id/warp` mit `WarpDto`, `SpacecraftService.warp`/`processMovement` (samt verwaister Helfer `consumeWarpdrive`, `loadLocation`), Minuten-Cron `checkWarpArrivals`, Tick-Typ `WARP_ARRIVAL` (shared `TICK_RUN_TYPES`, Admin-Lauf, Admin-Seite). War nie als `GameTickType` persistiert, daher keine Bereinigung der Laufhistorie nötig.
  - Entfernt aus Entity, Bewegungszustand, DTOs und Logik: Status `IN_FLIGHT`, `arrivalAt`, `originLocation(Id)`, `targetLocation(Id)`, `warpCooldown`, `specialStatus 'IN_FLIGHT'`, Dashboard-Kennzahl `inFlightShipCount`; alle `IN_FLIGHT`-Prüfungen (Flug, Systemein-/-austritt, Wurmloch, Reparatur, Crew, Handel, Kampf, Kartographie-Tick). `warpdrive` und `warpSpeed` bleiben als allgemeine Schiffswerte.
  - „Im Hyperraum“ in `InteractionContextService` folgt jetzt wie `nearby-interaction` STU `isWarped` (Warpantrieb aktiv im freien Raum) statt dem Zeitflugstatus. Meldungen, die den Flug nannten, beschreiben jetzt die verbleibenden Zustände (Flottenbeitritt „Das Schiff ist nicht einsatzbereit“, Traktorstrahl).
  - Frontend: „IM FLUG“, Flug-Polling (Navigation, Schiffsdetail), Statuslabels „Hyperraumflug“/„Im Flug“, Ankunftsfelder und Warp-Admin-Job entfernt; Galaxieflug und Systemein-/-austritt unverändert. Hyperraumrouten bleiben reine Kartendarstellung.
  - Migration `20261114200000-remove-timed-hyperspace-flight`: Schiffe in `IN_FLIGHT` → `IDLE` auf `originLocationId`, sonst aktueller Ort; danach Index und Spalten gelöscht. `down` legt die Spalten leer wieder an.
  - Tests: `timed-flight-removal-migration.int-spec.ts` (Rückkehr zum Ausgangsort statt Ziel, Ersatz durch aktuellen Ort, Spalten-/Indexentfernung, Rollback), `starmap-contacts-requests.int-spec.ts` (`/warp` → 404), `tick.controller.spec.ts` (`WARP_ARRIVAL` abgelehnt), `admin-ticks.spec.tsx` (kein Warp-Job); reine Zeitflug-Tests entfernt, bestehende Galaxieflug-Tests unverändert grün.
  - Gates: Lint 0 Fehler (Warnungen 1430/110), Typecheck und Build grün, Frontend 760/760, Integration 725/725, Backend-Unit grün (vier Erwartungen an den Zeitflug nach dem Lauf angepasst und erneut geprüft).

