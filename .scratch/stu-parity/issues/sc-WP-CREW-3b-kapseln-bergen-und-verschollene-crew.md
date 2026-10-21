# Rettungskapseln bergen und Ansicht „Verschollene Crew“

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-CREW-3a

## Ziel

Ein Schiff am Feld kann Rettungskapseln bergen (STU `SalvageEmergencyPods`): eigene Crew kommt an Bord, sofern Platz ist. Übernimmt col-G4: Der Spieler sieht in der Sozial-/Crew-Ansicht der Kolonie, wo seine verschollene Crew in Kapseln treibt. Die Überstellung fremder Crew an Handelsposten folgt in sc-WP-CREW-3c.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/SalvageEmergencyPods/SalvageEmergencyPods.php` (1 EPS, Reparatur/Umrüstung abbrechen, Kapsel nach Bergung entfernen, PM an Crew-Eigner)
- `Module/Ship/Action/SalvageCrew`
- `Module/Colony/View/ShowPodsLocations/ShowPodsLocations.php`, `html/colony/component/orphanedcrewlocations.twig`

## SWU-Pfade

- Kapselmodell aus sc-WP-CREW-3a
- `apps/backend/src/modules/spacecraft/spacecraft-crew.service.ts`, `spacecraft.controller.ts`, Interaktions-Checks aus sc-WP-ENG-2 (falls erledigt)
- `apps/frontend/src/components/spacecraft/NearbySensorPanel.tsx`
- `apps/frontend/src/pages/colonies/components/CrewSocialSection.tsx`, `PanelCrew.tsx`

## Akzeptanzkriterien

- [ ] Aktion „Rettungskapseln bergen“ am Feld: kostet 1 EPS, überträgt eigene Crew bis zur freien Crewkapazität; Rest bleibt in der Kapsel; leere Kapsel wird entfernt.
- [ ] Fremde Crew in der Kapsel wird vorerst nicht geborgen (klare Meldung, Verweis auf sc-WP-CREW-3c); ihr Eigner erhält keine falsche Meldung.
- [ ] `GET` Endpunkt „verschollene Crew“ liefert Kapseln mit eigener Crew (Position, Anzahl, Herkunftsschiff); Link „Verschollene Crew“ in der Crew-/Sozialansicht öffnet die Liste.
- [ ] Backend-Tests (Kapazitätsgrenze, EPS-Mangel, Entfernen), Frontend-Tests (NBS-Aktion, Liste).
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
