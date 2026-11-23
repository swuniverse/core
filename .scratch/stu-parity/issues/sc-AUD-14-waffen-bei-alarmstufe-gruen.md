# Waffen bei Alarmstufe Grün wie STU sperren

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

STU lässt Strahlen- und Projektilwaffen nur außerhalb von „unalarmiert“ einschalten (Alarmstufe Grün oder kein Computer) und zeigt statt des Schalters „bei Alarmstufe deaktiviert“. SWU erlaubte das Einschalten bei Grün; der Alarmwechsel auf Grün schaltete die Waffen nur ab.

## STU-Quellen

- `src/Component/Spacecraft/System/Type/EnergyWeaponShipSystem.php`, `ProjectileWeaponShipSystem.php` (`checkActivationConditions`: „die Alarmstufe Grün ist“)
- `src/Module/Spacecraft/Lib/SpacecraftWrapper.php` Z. 140 (`isUnalerted`: kein Computer oder Alarm Grün)
- `src/html/spacecraft/system/PHASER.twig`, `torpedoAndStorage.twig` („bei Alarmstufe deaktiviert“)

## Akzeptanzkriterien

- [x] `toggleSystem` lehnt `WEAPONS` und `TORPEDO_BANK` bei Grün oder ohne `COMPUTER` ab: `<Schiff>: System Strahlenwaffe|Projektilwaffe konnte nicht aktiviert werden, weil die Alarmstufe Grün ist`. Gilt auch für Flottenschaltungen (laufen über `toggleSystem`).
- [x] Schiffskontrolle zeigt bei unalarmiertem Schiff „Strahlenwaffen/Projektilwaffe bei Alarmstufe deaktiviert“ statt des Schalters.
- [x] Backend- und Frontend-Tests.

## Comments

### 2026-11-23 — umgesetzt, Prüfung ausstehend

Commit: `feat(spacecraft): block weapons while unalerted like STU (stu-parity sc-AUD-14)`

- Prüfung nach der Tarnungsprüfung, Reihenfolge wie STU. Fehlende STU-Bedingung „keine Torpedos vorhanden“ nicht Teil dieses Tickets.
- Frontend wertet „unalarmiert“ nur aus, wenn die Alarmstufe übergeben wird (Schiffsseite); das Backend prüft immer.
- Die STU-Symbole `act_phaser2`/`act_torp2` fehlen in SWU; es werden die vorhandenen Systemsymbole genutzt.
- Checks: Jest `spacecraft-core-controls.spec.ts` 30/30 (4 neu); Jest `spacecraft`, `combat`, `alert-reaction`, `colony` 1373/1373 (vor den neuen Tests); Vitest `ShipControlCenter.spec.tsx` 11/11 (1 neu), `components/spacecraft` + `spacecraft-detail` 251/251; `nx typecheck backend` und `frontend` ✓; `nx lint frontend` ohne neue Befunde.
- Modell: Claude Opus 5.5 direkt.
- Ausstehend: gesammelter Verifikationslauf.
