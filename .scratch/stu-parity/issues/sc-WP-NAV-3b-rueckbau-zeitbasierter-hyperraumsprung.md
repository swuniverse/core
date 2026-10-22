# Zeitbasierten Hyperraumsprung zurückbauen

**Status:** needs-triage
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

- [ ] `warp`-API und -Service, `processMovement` sowie `checkWarpArrivals` sind entfernt.
- [ ] `IN_FLIGHT`, `arrivalAt`, `originLocation`, `targetLocation` und `warpCooldown` sind aus Entity, DTOs, Persistenz und Laufzeitlogik entfernt, soweit sie ausschließlich dem Zeitflug dienen.
- [ ] Frontend-Aktionen und -anzeigen für Zeitflug, Ankunft und Flugabbruch sind entfernt; Galaxieflug und Systemein-/-austritt bleiben bedienbar.
- [ ] Hyperraumrouten bleiben als Kartendarstellung erhalten und bewirken keine Reisezeitverkürzung.
- [ ] Eine Migration setzt jedes beim Upgrade in `IN_FLIGHT` befindliche Schiff deterministisch und sicher auf seinen Ausgangsort zurück; fehlt dieser, bleibt der aktuelle gültige Ort erhalten. Temporäre Flugreferenzen werden anschließend gelöscht.
- [ ] Backend- und Frontendtests decken API-Wegfall, Migration laufender Flüge und unveränderten feldweisen Galaxieflug ab.

## Comments

- Entdeckt bei sc-WP-NAV-3. Die Migration darf Schiffe nicht direkt ans Ziel teleportieren, weil der verworfene Zeitflug sonst beim Upgrade noch spielmechanisch belohnt würde.
