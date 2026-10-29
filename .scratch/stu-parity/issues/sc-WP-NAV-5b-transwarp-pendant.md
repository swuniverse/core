# Langstreckensprung (Pendant zu STU-Transwarp)

**Status:** needs-info
**Priority:** P3
**Size:** M
**Blocked by:** sc-WP-NAV-3

## Ziel

STU erlaubt mit der Transwarpspule einen Sprung zu beliebigen Koordinaten einer bekannten Ebene außerhalb von Systemen. SWU erhält ein Star-Wars-Pendant (Name, Modul und Mechanik wählt der Agent nach Leitplanke 2, passend zum in sc-WP-NAV-3 festgelegten Hyperraummodell, z. B. Sprung entlang Hyperraumrouten). Laut sc-WP-NAV-3 (Option b, 2026-10-21) entfällt der zeitbasierte Hyperraumsprung; Reisen erfolgt feldweise, und dieses Pendant ist der **einzige** Langstreckensprung in SWU. Es ersetzt funktional den bisherigen `warp`, dessen Rückbau ein eigenes Folge-Issue aus sc-WP-NAV-3 übernimmt und dokumentiert es unter „Entscheidungen“ in `map.md`.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Ship/Action/Transwarp/Transwarp.php` (bekannte Ebene, Cooldown, nicht im System, Warpantrieb aktiv, kein Traktor, nicht in Flotte, Ziel passierbar)
- `Component/Spacecraft/System/Type/TranswarpCoilShipSystem.php`, `html/spacecraft/system/TRANSWARP_COIL.twig`
- `Module/Spacecraft/Lib/Movement/Component/Consequence/PostFlight/DeactivateTranswarpConsequence.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`warp`, `flyGalaxy`)
- `apps/backend/src/modules/starmap/entities/hyperspace-route.entity.ts`, `hyperspace-route-segment.entity.ts`
- `packages/shared/src/lib/spacecraft/index.ts`, `spacecraft-runtime-state.service.ts`
- `game-data/data/modules/special.yaml` (Submodul)
- `apps/frontend/src/components/spacecraft/NavigationPanel.tsx`

## Akzeptanzkriterien

- [ ] Entscheidung zu Name und Mechanik in `map.md`, konsistent mit der ADR aus sc-WP-NAV-3 (feldweiser Galaxieflug; kein zeitbasierter Sprung, also sofortiger Sprung mit Kosten und Cooldown wie STU-Transwarp).
- [ ] Modul und Laufzeitsystem existieren; ohne Modul ist die Aktion nicht verfügbar.
- [ ] Vorbedingungen wie STU (außerhalb von Systemen, Antrieb aktiv, kein Traktor, keine Flotte, Ziel passierbar, Cooldown) mit deutschen Fehlermeldungen.
- [ ] Erfolgreicher Sprung setzt Position, Kosten und Cooldown und erzeugt Flugsignaturen, sofern sc-WP-NAV-2a erledigt ist.
- [ ] Backend-Tests für Erfolg und jede Ablehnung; Frontend-Test für Zielwahl.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-10-29: Die STU-Mechanik verlangt einen Sprung in jede bekannte Ebene. SWU besitzt zwar persistente Ebenenkenntnis, aber das Issue legt die produktentscheidende Kostenregel des sofortigen Sprungs nicht fest: STU berechnet nur 55 EPS Aktivierungskosten, während das Akzeptanzkriterium zusätzlich allgemein „Kosten“ fordert. Soll der **Navicomputer-Sprung** (vorgeschlagener Star-Wars-Name) exakt 55 EPS kosten, oder sollen zusätzlich Hyperantriebspunkte abhängig von der Sprungdistanz verbraucht werden? Ohne diese Entscheidung wären Balance, UI-Kostenvorschau und Backend-Tests spekulativ.
