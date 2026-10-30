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

- [ ] Der Tarnfeld-Generator ist ausschließlich dem Galaktischen Imperium vorbehalten. Modulangebot, Fertigung, Bauplan, Bau/Umrüstung und Aktivierung erzwingen diese Berechtigung serverseitig; vorhandene gegnerische Installationen bleiben gespeichert, sind aber zwangsweise inaktiv und nicht erneut einbaubar.
- [ ] Aktivieren schaltet Schilde, Waffen und Astrometrie-Labor ab und verhindert deren Aktivierung während der Tarnung; Alarmstufe Rot enttarnt bzw. verhindert Tarnung wie STU.
- [ ] Getarnte Schiffe fehlen für alle anderen Spieler einschließlich Allianzmitgliedern in NBS-Liste, LSS-Zählung, Sternkarte und `starmap-visibility.service.ts`; ohne explizite Ortung sieht nur der Eigner das eigene getarnte Schiff mit Tarn-Icon.
- [ ] Interaktions-Checks „Quelle/Ziel ungetarnt“ im Dienst aus sc-WP-ENG-2d aktiv.
- [ ] Neue Flugsignaturen tragen das Tarnflag, sofern sc-WP-NAV-2a erledigt ist.
- [ ] Backend-Tests für Aktivierungsregeln, Sichtbarkeit (NBS, LSS, Sternkarte) und Interaktionssperre; Frontend-Test für Icon und Schalter.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Der Tarnfeld-Generator ist eine ausschließlich imperiale Ausrüstungsberechtigung. Die Regel greift bei Angebot, Fertigung, Bauplan, Bau/Umrüstung und zusätzlich bei Aktivierung als Defense-in-depth. Bereits vorhandene Installationen bei anderen Fraktionen werden nicht gelöscht, bleiben aber inaktiv und dürfen nicht erneut eingebaut werden. Aktive Tarnung ist ohne ausdrücklichen Detektor nur für den Schiffseigner sichtbar; auch Allianzmitglieder erhalten keine Sichtbarkeitsausnahme. Tachyon-Ortung aus `sc-WP-CLOAK-2a` ist der vorgesehene Aufdeckungsweg.

## Comments

- 2026-10-29: Abbruch nach zwei ernsthaften Umsetzungsversuchen. Die serverseitige Aktivierungsregel soll laut Issue zugleich beim Bau/Ausrüsten greifen, aber das heutige Fertigungs-/Bauplandatenmodell enthält keine bestätigte Fraktionszuordnung für die Tarnvorrichtung. Bitte festlegen, ob (a) Tarnvorrichtungs-Fertigungsitem und Bauplan ausschließlich dem Galaktischen Imperium zugeordnet werden sollen oder (b) beide Fraktionen sie ausrüsten dürfen und nur die Aktivierung eingeschränkt wird. Zusätzlich ist zu bestätigen, ob eigene Allianzmitglieder getarnte Schiffe sehen dürfen; das Akzeptanzkriterium sagt „fremde“ unsichtbar, STU behandelt Tarnung jedoch grundsätzlich als Sensorsichtbarkeit.
- 2026-10-30 Product Owner: Option 1. Der Tarnfeld-Generator ist ausschließlich dem Galaktischen Imperium vorbehalten und wird an allen serverseitigen Angebots-, Fertigungs-, Bauplan-, Bau-/Umrüstungs- und Aktivierungsgrenzen geprüft. Gegnerische Altinstallationen bleiben persistent, sind jedoch zwangsweise inaktiv und nicht erneut einbaubar. Getarnte Schiffe sind ohne explizite Ortung nur für ihren Eigner sichtbar; Allianzmitgliedschaft erzeugt keine Ausnahme. Dies folgt der vorhandenen imperialen SWU-Forschung und STUs eigentümerbasierter Sichtbarkeit.
