# Fraktionsattribute, Teil 2: Wählbarkeit, Spielerlimit, wirksame Boni

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** tmw-FA1a

## Ziel

STU kann Fraktionen sperren (`chooseable`), die Spielerzahl je Fraktion begrenzen (`player_limit`) und Fraktionen Warenboni geben. SWU zeigt beide Fraktionen immer an und definiert Multiplikatoren, die nicht wirken (Bestandsaufnahme aus tmw-FA1a). Dieses Issue setzt die Entscheidung dazu um.

## STU-Quellen

- `src/Orm/Entity/Faction.php` (`chooseable`, `player_limit`, `positive_effect_primary/secondary_commodity_id`)
- `src/Module/Index/Action/Register/Register.php` (Prüfung von Wählbarkeit und Limit)
- `src/Component/Faction/FactionEnum.php`

## SWU-Pfade

- `apps/backend/src/modules/faction/*`, `apps/backend/src/modules/onboarding/onboarding.controller.ts` (`POST faction`), `onboarding.service.ts`
- `apps/frontend/src/pages/onboarding.tsx` (Fraktionsauswahl)
- Verbraucher der Multiplikatoren: `spacecraft-stats.service.ts`, Kolonie-Tick, Forschung, Basishandel (tmw-T7a/T13)

## Akzeptanzkriterien

- [ ] `isSelectable` (Default `true`) ist per Migration angelegt und in der Admin-Oberfläche pflegbar; ein `playerLimit` bzw. eine Balancing-Sperre wird nicht eingeführt.
- [ ] `POST onboarding/faction` lehnt nicht wählbare Fraktionen mit klarer Meldung ab. Das Onboarding zeigt sie deaktiviert, mit Grund.
- [ ] `hullMultiplier`, `shieldMultiplier` und `cargoMultiplier` wirken in `spacecraft-stats.service.ts`, `researchMultiplier` in der Forschungspunkterzeugung, `colonyGrowthMultiplier` im Kolonie-Tick (Bevölkerungswachstum); jeweils mit den Werten aus `DEFAULT_FACTIONS`. `docs/faction-modifiers.md` (aus tmw-FA1a) ist aktualisiert.
- [ ] `tradeModifier` bleibt hier unberührt; seine Entfernung erfolgt in tmw-T13.
- [ ] Backend-Tests: Sperre über `isSelectable`, Wirkung jedes Multiplikators an seiner Stelle. Frontend-Test: deaktivierte Fraktion im Onboarding.

## Entscheidung

Vorgabe:
1. Fraktionswahl (c): keine Spielerbegrenzung und keine Balancing-Sperre; nur ein Feld `isSelectable`, das Admins pflegen.
2. Multiplikatoren (a): Die vorhandenen Multiplikatoren werden an ihren Stellen wirksam (Rumpf `hullMultiplier`, Schild `shieldMultiplier`, Fracht `cargoMultiplier`, Forschung `researchMultiplier`, Koloniewachstum `colonyGrowthMultiplier`). Als Balancing-Werte gelten die heute in `faction.service.ts` (`DEFAULT_FACTIONS`) hinterlegten Werte. **Ausnahme Handel:** `tradeModifier` wird nicht wirksam gemacht, sondern gemäß tmw-T13 (Option 2b) entfernt.

## Comments

- 2026-10-28 Agent: Das Issue ist in der vorgegebenen Größe S nicht seriös in einem Durchlauf umsetzbar. Die Akzeptanzkriterien betreffen mindestens vier getrennte Laufzeitpfade (Fraktions-Admin/API und Onboarding, Spacecraft-Statistik mit fehlendem Fraktionskontext, Forschungspunkterzeugung sowie Koloniewachstum), dazu Migration, Shared-Verträge und Frontend. Bitte in vertikale Teilissues aufteilen; insbesondere muss entschieden werden, ob Schiffsmultiplikatoren nach Eigentümerfraktion beim Erzeugen persistiert oder bei jeder Statistikberechnung dynamisch angewandt werden.

- 2026-10-21 Product Owner: Option 1c, 2a – Fraktionen werden nicht begrenzt; es gibt nur ein von Admins gepflegtes `isSelectable` (1c). Die vorhandenen Fraktionsmultiplikatoren werden an ihren Stellen wirksam gemacht (2a); `tradeModifier` entfällt gemäß der spezielleren Entscheidung 2b in tmw-T13.
- 2026-10-30 Product Owner: Option 1. Das Issue wird in vier ausführbare Teilissues geteilt: `tmw-FA1b1` Fraktionswählbarkeit, `tmw-FA1b2` dynamische Schiffsmultiplikatoren, `tmw-FA1b3` Forschungsmultiplikator und `tmw-FA1b4` Koloniewachstumsmultiplikator. Der Parent ist als Tracking-Split `resolved`. Rumpf-, Schild- und Frachtboni werden in der autoritativen Statistikprojektion dynamisch anhand der aktuellen Eigentümerfraktion angewandt; persistierte Basiswerte bleiben unverändert. Forschung und Koloniewachstum lesen ihre Multiplikatoren ebenfalls zur Laufzeit. `tradeModifier` bleibt ausgeschlossen.
