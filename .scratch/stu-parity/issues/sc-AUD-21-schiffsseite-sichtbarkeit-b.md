# Schiffsseite: Reparatur, Karte, Boje, Selbstzerstörung wie STU (Paket B)

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Paket B aus `sc-AUD-19`: Aktionen, deren Sichtbarkeit STU an Schiffsdaten knüpft, die das Frontend bisher nicht kannte.

## STU-Quellen

- `SpacecraftWrapper::canBeRepaired` (Z. 200): unalarmiert (kein Computer oder Alarmstufe Grün), Schilde aus, nicht getarnt, beschädigte Systeme oder Hülle unter Maximum.
- `ShowSpacecraft.php` Z. 164–166: `IS_MAP_BUTTON_VISIBLE`, wenn der Layer des Schiffs zu den Layern des Nutzers gehört.
- `SpacecraftStorageTrait::hasStoredBuoy`: Boje im Lager.
- `spacecraft.twig` Z. 65–82: bei `isConstruction` kein Selbstzerstörungs-Icon.

## Akzeptanzkriterien

- [x] `GET /spacecraft/:id` liefert `actions.repair`, `actions.starMap`, `actions.dropBuoy`.
- [x] „Reparaturoptionen“ nur bei `actions.repair.available`. Schaden zählt nach der SWU-Eigenreparaturschwelle (≤ 45 % Hülle oder Modul), damit der Dialog nie leer öffnet.
- [x] „Navigation und Karte“ nur bei bekanntem Layer (`layer_knowledge`).
- [x] „Boje setzen“ nur mit Sondenboje (Ware 88) im Lager.
- [x] Kein Selbstzerstörungs-Icon auf einem Konstrukt (`STATION` + `CONSTRUCTION`).

## Comments

### 2026-11-23 — umgesetzt, Prüfung ausstehend

- Tests: `spacecraft-core-controls.spec.ts` +5 (Backend-Flags, Schilde/Tarnung/Gelb blenden Reparatur aus); `ShipHeaderTable.spec.tsx` +3; `FieldContextPanel.spec.tsx` +1. Jest `modules/spacecraft` 819/819; Vitest `components/spacecraft` + `pages` 790/791 (Ausreißer `PanelBuildingManagement.spec.tsx`, einzeln 8/8 grün, nicht berührt); `nx typecheck` backend und frontend ✓; ESLint der geänderten Dateien 21 Warnungen vorher wie nachher.
- Abweichung: STU zeigt Reparatur schon bei Hülle < Maximum; SWU nutzt die eigene Schwelle von 45 %.
- Backend lehnt Selbstzerstörung eines Konstrukts weiterhin nicht ab (nur UI ausgeblendet).
- Modell: Claude Opus 5.5 direkt.

- 2026-11-23 – **Prüfung bestanden, resolved.** Gesammelter Verifikationslauf auf `afa856fb`: Lint 0 Fehler (in den geänderten Dateien keine Warnung), `nx typecheck` und `nx build` alle Projekte grün, Unit Backend 2739/2739, Frontend 990/991 (Ausreißer `settings-tutorial.spec.tsx` einzeln 23/23 grün, nicht berührt), PostgreSQL-Integration 1076/1076. Diff-Review gegen Akzeptanzkriterien ohne Befund (Rechte: Kolonie-Eigentum, Orbit, Tarnung; Flottenendpunkte prüfen den Eigner). Offene Abweichung: Selbstzerstörung eines Konstrukts nur im UI ausgeblendet, Backend lehnt nicht ab. Modell: Opus 5.5 direkt.
