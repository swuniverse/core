# Handelslizenzen: Datenmodell, Bedingungen und Presence-Policy

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** tmw-T1a

## Ziel

Handelsposten erhalten persistente Lizenzbedingungen und Spieler erhalten eindeutig zugeordnete, zeitlich begrenzte Handelslizenzen. Eine gemeinsame Presence-Policy definiert die für Lizenzkauf und spätere Handelsaktionen erforderliche Feld-Kopräsenz.

## STU-Quellen

- `src/Orm/Entity/TradeLicense.php`, `TradeLicenseInfo.php`
- `src/Module/Trade/Action/CreateLicense/*`
- `src/Module/Trade/View/ShowLicenseMenu/*`
- `src/Module/Spacecraft/Lib/Interaction/InteractionChecker.php#checkPosition`

## SWU-Pfade

- `apps/backend/src/modules/trade/entities/`
- `apps/backend/src/modules/trade/`
- `apps/backend/src/migrations/`
- `apps/backend/src/modules/spacecraft/`

## Akzeptanzkriterien

- [ ] Migration und Entitäten bilden Lizenzbedingung (Posten, handelbare Ware, Menge ≥ 1, 1–365 Tage) und Lizenz (Posten, Spieler, Beginn, Ablauf, Warnzeitpunkt) ab.
- [ ] Pro Spieler und Posten kann höchstens eine Lizenz bestehen; Nebenläufigkeit wird durch einen Datenbank-Constraint abgesichert.
- [ ] Nur der Posteneigentümer darf Bedingungen lesen und ändern. Neue Bedingungen gelten für neue Käufe und spätere Verlängerungen, nicht rückwirkend für den vorhandenen Ablauf.
- [ ] `TradePostPresencePolicy.isAt(ship, post)` verlangt ein eigenes Schiff am selben `SpaceLocation`, das weder `IN_FLIGHT` noch im Hyperraum und – sobald vorhanden – nicht getarnt ist. Docking ist nicht erforderlich.
- [ ] NPC-Posten erhalten idempotent den Alpha-Default 10 Aurodium für 30 Tage.
- [ ] Nur serverseitig als handelbar markierte Waren dürfen als Lizenzpreis konfiguriert werden; es gibt keinen globalen Lizenzdeckel.
- [ ] Backend-Tests decken Validierung, Eigentümerschutz, Eindeutigkeit, Seed-Idempotenz und Presence-Policy ab.

## Entscheidung

Der SWU-Alpha-Default von 10 Aurodium und 30 Tagen ist verbindlich, da der STU-Dump keine Lizenz-Defaults enthält. Feld-Kopräsenz genügt; Docking wird nicht verlangt.
