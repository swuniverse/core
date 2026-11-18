# Wurmlochrechte wie STU: nur Admin, ohne Erlaubnis kein Durchflug

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

In STU gibt es je Wurmloch-Eingang Regeln (`WormholeRestriction`) für Spieler, Allianz, Fraktion oder Schiff, jeweils Erlauben oder Verbieten. Verbot gewinnt, sonst reicht eine Erlaubnis; **ohne passende Erlaubnis ist der Durchflug verboten**. Geprüft wird beim Eintritt und beim Austritt. Pflegen kann die Regeln **nur ein Admin** („Wurmlochkontrolle“ nur bei `isAdmin`).

SWU weicht ab:
- Der Betreiber einer Station am Eingang verwaltet die Regeln (`WormholeRestrictionsPanel` in der Stationsansicht, `GET/POST/DELETE spacecraft/:id/wormhole-restrictions`).
- Ohne Regeln ist alles erlaubt (`allowsWormholeAccess`: `rules.length === 0 → true`), und Regeln gelten nur, wenn eine Station auf dem Eingangsfeld steht (`WormholeRestrictionAccessPolicy.snapshot`).

Umsetzung:

- Regeln werden ausschließlich über Admin-Endpunkte gepflegt (`starmap/admin/wormholes/:id/restrictions`, Rechte `MAP_EDITOR` bzw. Admin wie die übrigen Wurmloch-Admin-Endpunkte) und in einer Admin-UI je Wurmloch angezeigt, angelegt und gelöscht (Zieltyp USER/ALLIANCE/FACTION/SHIP, Ziel-Id, Modus ALLOW/DENY; Duplikate wie STU abgelehnt).
- Die Stationsbetreiber-Rolle entfällt: Endpunkte `spacecraft/:id/wormhole-restrictions`, `WormholeRestrictionService.managedWormholes`, `WormholeRestrictionsPanel` und dessen Einbindung in `spacecraft-detail.tsx` werden entfernt.
- Zugriff wie STU: ohne passende ALLOW-Regel kein Durchflug, DENY gewinnt; unabhängig davon, ob eine Station am Eingang steht.
- Prüfung bei Eintritt und Austritt (beide Richtungen eines bidirektionalen Wurmlochs).
- Fehlermeldung wie STU: „Du hast keine Berechtigung um in das Wurmloch einzufliegen“.

**Keine Bestandsmigration:** Das Spiel ist noch nicht live. Wie STU ist ein Wurmloch ohne Regeln gesperrt, auch bestehende; Freigaben pflegt der Admin. Die Admin-UI weist auf regellose (= gesperrte) Wurmlöcher hin.

## STU-Quellen

- `src/Component/Ship/Wormhole/WormholeEntryPrivilegeUtility.php` (Reduce mit `false` als Start, DENY wirft)
- `src/Module/Spacecraft/Action/EnterWormhole/EnterWormhole.php` (Z. 58–67), `LeaveWormhole/LeaveWormhole.php` (Z. 61)
- `src/Module/Spacecraft/Action/AddWormholeRestriction/AddWormholeRestriction.php`, `DeleteWormholeRestriction/`, `View/ShowWormholeRestrictions/`, `View/ShowWormholeControl/`
- `src/html/spacecraft/control/control_mid.twig` (Z. 292–296 und 358–361: nur `isAdmin`)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/wormhole-access.ts` (`allowsWormholeAccess`)
- `apps/backend/src/modules/spacecraft/wormhole-access-policy.service.ts` (`snapshot`: Stationsbedingung entfernen)
- `apps/backend/src/modules/spacecraft/wormhole-passage-planner.ts` (Z. 125–143 Richtung/Prüfung)
- `apps/backend/src/modules/spacecraft/wormhole-restriction.service.ts`, `wormhole-restriction.dto.ts`, `entities/wormhole-restriction.entity.ts`
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts` (Z. 495–507: Betreiber-Endpunkte entfernen)
- `apps/backend/src/modules/starmap/starmap.controller.ts` (Admin-Wurmloch-Endpunkte Z. 640–670), `wormhole.service.ts`
- `apps/backend/src/database/migrations/` (neue Migration; Bezug `20261110180000-add-wormhole-restrictions.ts`)
- `apps/frontend/src/components/spacecraft/WormholeRestrictionsPanel.tsx`, `apps/frontend/src/pages/spacecraft-detail.tsx` (Z. 29, 334)
- Admin-UI: `apps/frontend/src/pages/starmap-admin-fullmap.tsx` bzw. `components/starmap-admin-fullmap/*` (Wurmloch-Verwaltung)
- `packages/shared/src/lib/starmap/index.ts` bzw. `spacecraft` (`WormholeRestrictionDto`, `StationWormholeRestrictionsDto` entfernen)
- Tests: `wormhole-access.spec.ts`, `wormhole-passage-planner.spec.ts`, `wormhole-passage.int-spec.ts`, `wormhole-passage-http.int-spec.ts`, Admin-Controller-Spec, Frontend-Spec der Admin-UI

## Akzeptanzkriterien

- [ ] `allowsWormholeAccess` liefert ohne passende ALLOW-Regel `false`; DENY gewinnt; Stationen am Eingang spielen keine Rolle.
- [ ] Ein- und Austritt werden geprüft; abgelehnte Passage meldet den STU-Text.
- [ ] Nur Admins (bzw. `MAP_EDITOR`) können Regeln listen, anlegen und löschen; Spieler erhalten 403. Die Betreiber-Endpunkte und das Stationspanel existieren nicht mehr.
- [ ] Admin-UI je Wurmloch mit Regel-Liste, Anlegen und Löschen; Hinweis, dass ein Wurmloch ohne Regeln gesperrt ist.
- [ ] Backend-Tests: keine Regel → verboten, ALLOW → erlaubt, DENY schlägt ALLOW, Prüfung beim Austritt, Admin-Zugriff, Spieler 403. Frontend-Tests: Admin-UI; Stationsansicht ohne Wurmlochpanel.

## Herkunft

- Audit: [README.md](../audit-2026-11-17/README.md) Abschnitt K4 „Wurmlöcher – Passage atomar, Rechte beim Stationsbetreiber“ und „Entscheidungen PO zu K: K4 wie STU“, N2 „Wurmlochrechte beim Stationsbetreiber, Passage atomar → Rechte nur durch Admin, Passage wie normaler Flug“.
- PO-Entscheidung K4 vom 2026-11-17: wie STU.
- Ersetzt die `map.md`-Entscheidung „2026-10-21 – tmw-K7b – Option b: Wurmloch-Regeln verwaltet der Stationsbetreiber am Eingang“ sowie die PO-Kommentare in tmw-K7b. Die Flottenpassage regelt tmw-AUD-12b.
- Keine Bestandsmigration (PO 2026-11-17: nicht live, exakt wie STU).

## Comments

- 2026-11-17 Product Owner: Nicht live, daher keine ALLOW-Migration für Bestand; exakt wie STU.
