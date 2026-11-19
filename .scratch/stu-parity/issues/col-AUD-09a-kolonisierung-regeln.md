# Kolonisierung wie STU: Startwerte, erste Kolonie, Startfeld, Datenbankeintrag

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Die Prüfungen beim Kolonisieren entsprechen bereits STU. Die Startwerte der neuen Kolonie weichen ab:

- STU gibt einer Folgekolonie 150 Baumaterial. Die Energie entspricht dem EPS-Speicher und die Arbeitslosen dem Wohnraum des Startgebäudes. Der Name ist „Kolonie“.
- Bei der ersten Kolonie über ein Kolonieschiff gibt STU zusätzlich Startwaren und setzt den Spielerstatus auf aktiv.
- SWU gibt 150 Baumaterial, 75 Transparistahl, 50 Deuterium und 75 Durastahl. Die Kolonie startet mit Energie 50/100 und 10 Arbeitslosen und heißt „<Spieler>'s Kolonie“.

Außerdem erlaubt STU als Startfeld nur Feldtypen aus `colonizeableFields` der Kolonieklasse. SWU erlaubt jedes Oberflächenfeld außer Typ 201 und wandelt es in Ebene um. Den Datenbankeintrag der Kolonieklasse vergibt STU beim Kolonisieren; SWU tut das nur beim Scan.

Die Vorkommensmengen behandelt col-AUD-09b.

## STU-Quellen

- `src/Module/Ship/Action/Colonize/Colonize.php` (erste Kolonie Z. 106–131, Datenbankeintrag Z. 152 `checkDatabaseItem`)
- `src/Module/Colony/Lib/PlanetColonization.php` (Startfeld/-gebäude Z. 57–62, Name Z. 65, Startwaren Z. 75–79)
- `src/Orm/Entity/ColonyClass.php` (`getColonizeableFields` Z. 136), `src/Orm/Entity/PlanetField.php` (Z. 317–320)
- `src/html/ship/colonization.twig` (Z. 7–16, Anzeige erlaubter Feldtypen)

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-seed.service.ts` (Startwaren Z. 83–88, Name Z. 226, Energie/Arbeitslose Z. 237–239 und 623/655, Feldumwandlung Z. 595–597)
- `apps/backend/src/modules/colonization/colonization.service.ts` (Startfeldregel Z. 592)
- `game-data/data/colony-classes/stu-colony-classes.yaml` (kein `colonizeableFields`), `apps/backend/src/modules/game-data/game-data.service.ts`
- `apps/backend/src/modules/spacecraft/spacecraft-scan.service.ts` (Datenbankeintrag nur beim Scan, Z. 165), `apps/backend/src/modules/starmap/celestial-class-discovery.service.ts`
- `apps/frontend/src/components/spacecraft/ColonizationDialog.tsx`
- `apps/backend/src/modules/onboarding/` (Startkolonie, darf nicht brechen)

## Akzeptanzkriterien

- [x] Eine Folgekolonie startet mit 150 Baumaterial (SWU-Ware zu STU-Baumaterial), Energie = EPS-Speicher des Startgebäudes, Arbeitslose = Wohnraum des Startgebäudes und dem Namen „Kolonie“.
- [x] Sonderregel erste Kolonie: Hat der Spieler noch keine Kolonie und kolonisiert per Kolonieschiff, erhält er zusätzlich die STU-Startwaren in SWU-Entsprechung (150 Baumaterial, 150 Transparentes Aluminium → SWU-Äquivalent, 150 Duranium → Durastahl, 100 Deuterium). Der Spielerstatus wird wie STU `UserStateEnum::ACTIVE` gesetzt, falls SWU einen Status „unkolonisiert“ kennt. Die gewählten Warenentsprechungen werden unter „Entscheidungen“ in `map.md` festgehalten (Leitplanke 2).
- [x] Der Onboarding-Weg zur Startkolonie bleibt unverändert funktionsfähig.
- [x] Kolonieklassen erhalten `colonizeableFields` (Feldtypen). Kolonisieren ist nur auf diesen Feldern erlaubt; das Startfeld wird nicht mehr umgewandelt. Die Daten werden für alle Klassen aus STU-Feldtypen abgeleitet (Quelle STU-Migration `src/Migrations/Sqlite/Version20260915191824.php` bzw. `testdata/Migrations/VersionTestColoniesClasses.php`) oder als SWU-Balance gekennzeichnet.
- [x] Der Kolonisierungsdialog zeigt die erlaubten Feldtypen und sperrt andere Felder.
- [x] Beim Kolonisieren erhält der Spieler den Datenbankeintrag der Kolonieklasse (inkl. Prestige wie beim Scan), sofern er ihn noch nicht hat.
- [x] Backend-Tests in `colonization.service.spec.ts`: Startwerte Folgekolonie, erste Kolonie, Feldregel (erlaubt/verboten), Datenbankeintrag einmalig.
- [x] Frontend-Test für `ColonizationDialog` (nur erlaubte Felder wählbar).

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt H „Kolonie“ (Folgekolonie beim Kolonisieren).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), kleine Abweichungen „Kolonisierung, Startwerte/Startfeld/Datenbankeintrag“, Unsicherheit Nr. 1.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt. Vorkommensmengen in col-AUD-09b (wartet auf Daten aus col-AUD-12).
- 2026-11-19 Product Owner: Startfelder für die 40 Klassen ohne STU-Daten „Selbst ableiten“.
- 2026-11-19 – umgesetzt, Prüfung ausstehend. Datenableitung durch Opus 5.5, Umsetzung an Sonnet-Agent delegiert, Review durch Opus. Commits `4ef0a6f2` (Code), game-data `8cda535` (Daten) und Submodul-Zeiger „chore(game-data): start field types per colony class (col-AUD-09a)“.
  - Ableitungsregel für `swu-derived`: dominanter Landtyp der Klassenoberfläche im STU-Generator (Grundfeld, wenn es nach den Phasen vom Grundfeld die Mehrheit bleibt, sonst Ziel der größten solchen Phase). Gegen die STU-Daten geprüft: 10 von 11 Planeten-/Mondklassen getroffen; Ausnahme Klasse Q (221, STU: nur Sonderfeld 946), daher Mond Q (421) analog [946]. Mond L (403) und Mond P-T (416) folgen ihrer Planetenklasse. Unbewohnbare Klassen `[]`, Asteroiden behalten `selectable`.
  - Folgekolonie: 150 Baumaterial (2), Energie = `bonuses.energy` des Startgebäudes, Arbeitslose = `bevPro`, Name „Kolonie“; Startfeld wird nicht mehr in Ebene umgewandelt. Erste Kolonie (keine nicht aufgegebene Kolonie): 150 Baumaterial, 150 Transparistahl (4), 150 Durastahl (21), 100 Deuterium (5). Kein Spielerstatus „unkolonisiert“ in SWU.
  - Datenbankeintrag der Klasse über `CelestialClassDiscoveryService` (Quelle `COLONIZATION`), einmalig über den bestehenden Unique-Index; nur bei auflösbarem SWU-Planetentyp wie beim Scan.
  - Kolonisierungsdialog zeigt „Erlaubte Feldtypen“; wählbar sind nur vom Server freigegebene Felder. Auch die Hauptquartierfeldwahl bei Ruinen folgt der Klassenliste.
  - Onboarding unverändert (Startkolonie weiter mit eigener Feldumwandlung, Startwaren und Name).
  - Checks: Jest `colonization colony-seed onboarding celestial-class-discovery game-data` 93/93, Vitest `src/components/spacecraft` 223/223, `tsc` sauber, `nx lint` 0 Fehler, PostgreSQL `starmap-contacts-requests database-completion` 22/22 (keine eigene Kolonisierungs-Suite).
  - Hinweis: `game-data/scripts/import-stu-game-data.ts` erzeugt die YAML neu und verliert dabei `colonizeableFields`; vor einem Neuimport nachziehen. Beide Repos (core und game-data) müssen gepusht werden.
  - Offen für den Prüfpass: Browserprüfung des Dialogs und einer echten Kolonisierung, gemeinsamer Build.

