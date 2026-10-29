# Tarnvorrichtung: Laufzeitsystem und Unsichtbarkeit

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-ENG-2d

## Ziel

Das vorhandene Spezialmodul „Tarnvorrichtung“ wird ein Laufzeitsystem `CLOAK`. Getarnte Schiffe erscheinen für andere nicht in NBS, LSS, Sternkarte und Sichtbarkeitsdienst. Wer tarnen darf (Fraktion bzw. Klasse), legt der Agent nach Leitplanke 2 kanonnah fest (z. B. Imperium mit Tarnfeldtechnik) und dokumentiert es unter „Entscheidungen“ in `map.md`.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Component/Spacecraft/System/Type/CloakShipSystem.php` (schließt Schilde, Waffen, Astrolabor aus; Aktivierung nur Alarm nicht Rot)
- `Lib/Interaction/InteractionCheckType.php` (`EXPECT_SOURCE_UNCLOAKED`, `EXPECT_TARGET_UNCLOAKED`)
- `html/shiplistmacros.twig` (Tarn-Icon), `html/spacecraft/nbsListBody.twig`

## SWU-Pfade

- `game-data/data/modules/special.yaml` („Tarnvorrichtung“, Forschung „Tarnfeldtechnik“)
- `packages/shared/src/lib/spacecraft/index.ts`, `apps/backend/src/modules/spacecraft/spacecraft-runtime-state.service.ts` (`SPECIAL` → `CLOAK` für dieses Modul)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`toggleSystem`, `getNearby`, LSS/Local-Map)
- `apps/backend/src/modules/spacecraft/starmap-visibility.service.ts`
- `apps/backend/src/modules/spacecraft/spacecraft-alert.service.ts`
- `docs/adr/0003-messpunktbasierte-systemkartographie.md` (Tarnung deaktiviert Astrometrie-Labor)
- `apps/frontend/src/components/spacecraft/ShipControlCenter.tsx`, `pages/spacecraft.tsx` (Tarn-Icon)

## Akzeptanzkriterien

- [ ] Berechtigungsregel festgelegt und in `map.md` dokumentiert; Bau/Ausrüstung bzw. Aktivierung erzwingt sie serverseitig.
- [ ] Aktivieren schaltet Schilde, Waffen und Astrometrie-Labor ab und verhindert deren Aktivierung während der Tarnung; Alarmstufe Rot enttarnt bzw. verhindert Tarnung wie STU.
- [ ] Getarnte fremde Schiffe fehlen in NBS-Liste, LSS-Zählung, Sternkarte und `starmap-visibility.service.ts`; eigene getarnte Schiffe bleiben für den Eigner sichtbar mit Tarn-Icon.
- [ ] Interaktions-Checks „Quelle/Ziel ungetarnt“ im Dienst aus sc-WP-ENG-2d aktiv.
- [ ] Neue Flugsignaturen tragen das Tarnflag, sofern sc-WP-NAV-2a erledigt ist.
- [ ] Backend-Tests für Aktivierungsregeln, Sichtbarkeit (NBS, LSS, Sternkarte) und Interaktionssperre; Frontend-Test für Icon und Schalter.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
