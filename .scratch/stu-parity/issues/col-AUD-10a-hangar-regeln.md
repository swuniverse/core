# Hangar wie STU: ein Kolonieschiff, Rumpfbau stückweise

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

STU verbietet den Start eines Kolonieschiffs aus dem Hangar, wenn der Spieler schon eins besitzt. SWU prüft das nur beim Werftbau, obwohl zwei Kolonieschiffe hangarfähig sind. Beim Rumpfbau im Hangar baut STU Stück für Stück, solange EPS und Waren reichen, und meldet „Es wurden daher nur %d Stück gebaut“. SWU prüft die Gesamtkosten vorab und lehnt bei Mangel komplett ab.

## STU-Quellen

- `src/Module/Colony/Action/StartAirfieldShip/StartAirfieldShip.php` (Z. 81–86 Kolonieschiff-Limit)
- `src/Module/Colony/Action/BuildAirfieldRump/BuildAirfieldRump.php` (Z. 60–72)
- `src/html/colony/menu/airfield.twig`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony.service.ts` (Rumpfbau Z. 1010–1016, `startHangarShip` Z. 1039–1080)
- `apps/backend/src/modules/spacecraft/shipbuilding-core.service.ts` (Kolonieschiff-Limit beim Werftbau Z. 136–163, wiederverwenden)
- `game-data/data/ship-building/ship-class-hangar.yaml` (`REBEL_COLONIZER_ICARUS`, `EMPIRE_COLONIZER_SENTINEL`)
- `apps/frontend/src/pages/colonies/components/PanelHangar.tsx`

## Akzeptanzkriterien

- [x] `startHangarShip` lehnt den Start eines Kolonieschiffs ab, wenn der Spieler bereits ein nicht zerstörtes Kolonieschiff besitzt. Die Prüfung nutzt dieselbe Funktion wie der Werftbau.
- [x] Der Hangar-Rumpfbau baut bis zur gewünschten Menge Stück für Stück, solange Energie und Waren reichen. Werden weniger gebaut als bestellt, meldet er „Es wurden daher nur n Stück gebaut“. Bei 0 Stück lehnt er mit Grund ab.
- [x] `PanelHangar` zeigt die Meldung und den Grund für ein gesperrtes Kolonieschiff.
- [x] Backend-Tests: Limit (mit/ohne vorhandenes Kolonieschiff), Teilbau bei knapper Energie, Teilbau bei knappen Waren.
- [x] Frontend-Test `PanelHangar.spec.tsx`: Teilbau-Meldung, Sperrhinweis.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt H „Kolonie“ (Hangar).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), kleine Abweichungen „Kolonieschiff-Limit beim Hangarstart“ und „Hangar-Rumpfbau“, Unsicherheit Nr. 4.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt. Startwerte je Hangar-Rumpf in col-AUD-10b.
- 2026-11-19 – umgesetzt, Prüfung ausstehend. Umsetzung an Sonnet-Agent delegiert, Review durch Opus 5.5. Commits `4e88c4a7` und „fix(colony): German hangar and colonizer messages (col-AUD-10a)“.
  - Kolonieschiff-Limit als gemeinsame Funktion `ownsOperationalColonizer` (aus `ShipbuildingCoreService.startBuild` herausgezogen), genutzt von Werftbau, `startHangarShip` und der Hangar-Ansicht (`startLockReason`, eine Abfrage je Ansicht).
  - Hangar-Rumpfbau stückweise wie STU `BuildAirfieldRump`: min(Bestellung, EPS/Kosten, Bestand/Kosten je Ware); Abbuchung nur für gebaute Stücke; Meldung „Es wurden daher nur n Stück gebaut“, bei 0 Ablehnung mit Grund ohne Änderung. Wie bisher ohne Transaktion (unverändert).
  - Review-Befund behoben: Sperrgrund und Hangar-Gründe waren englisch und erscheinen im Panel; jetzt STU-Wortlaut „Es kann nur ein Schiff mit Kolonisierungsfunktion genutzt werden“ und „Nicht genug Energie/<Ware>: benötigt X, vorhanden Y“ (betrifft auch die Werftmeldung). Andere englische Energietexte im Koloniecode bleiben außerhalb dieses Tickets.
  - Checks: Jest `colony shipbuilding hangar` 450/450, Vitest `src/pages/colonies` 136/136, `nx typecheck backend/frontend` grün, `nx lint` 0 Fehler, PostgreSQL `shipbuilding-workflow` 21/21.
  - Offen für den Prüfpass: Browserprüfung Hangar, gemeinsamer Build.
- 2026-11-19 – Abschluss (Opus 5.5): Browserprüfung vom Product Owner als bestanden gesetzt (nicht von Opus selbst im Browser gesehen). Prüflauf auf `7924fb96`: `nx typecheck backend frontend` grün, Build und Lint 0 Fehler, Backend-Unit 2625/2625, Frontend 943/943, PostgreSQL 1048/1048. resolved.
