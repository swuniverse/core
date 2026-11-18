# Crew-Spezies aus festem Star-Wars-Katalog

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

STU lässt Spieler die Rassenverteilung ihrer neuen Crew steuern: Auswahl aus fraktionsfreigegebenen Rassen mit Prozentchancen, dazu eigene Rassen mit Grafiken einreichen, die ein Moderator in der Datenbank annimmt oder ablehnt. `CrewCreator` würfelt die Rasse neuer Crew nach diesen Chancen. SWU-Crew hat keine Rasse (`crew.entity.ts`: Typ, Geschlecht, Name, Rang), und es gibt weder Einstellung noch Ticket.

## STU-Quellen

- `src/html/view/options.twig` (Z. ~101–105, „Crew-Rassen verwalten“), `src/html/user/crewRaceManagement.twig`
- `src/Module/PlayerSetting/View/ShowCrewRaceManagement/ShowCrewRaceManagement.php`
- `src/Module/PlayerSetting/Action/SelectCrewRace/`, `UpdateUserCrewRaceChance/`, `UpdateCrewRaceDistribution/`, `CreateCrewRace/`, `ResubmitCrewRace/`, `RemoveCrewRace/`
- `src/Module/PlayerSetting/Lib/CrewRaceSubmission.php`, `src/Component/Crew/CrewRaceGraphics.php`, `CrewRaceInput.php`, `CrewRaceSubmissionNotifier.php`
- `src/Module/Database/Action/ModerateCrewRace/`, `UpdateCrewRaceModeration/`, `src/Module/Database/View/ShowCrewRaceModeration/`, `src/html/database/crewRaceModeration.twig`
- `src/Orm/Entity/CrewRace.php`, `src/Orm/Entity/UserCrewRace.php`, `src/Module/Crew/Lib/CrewCreator.php` (Z. ~48–70)

## SWU-Pfade

- `apps/backend/src/modules/colony/entities/crew.entity.ts` (keine Rasse)
- `apps/backend/src/modules/colony/colony-crew.service.ts` (Crew-Erzeugung)
- `apps/backend/src/modules/spacecraft/spacecraft-crew.service.ts` (Crewanzeige)
- `apps/frontend/src/pages/settings.tsx`

## Akzeptanzkriterien

- [ ] Crew erhält eine Spezies (Entity-Feld + Migration; bestehende Crew erhält eine Standardspezies ihrer Fraktion).
- [ ] Fester Star-Wars-Spezieskatalog je Fraktion in den Spieldaten als Ersatz der STU-Rassen (Leitplanke 2); der Umsetzer wählt kanonnahe Spezies und hält die Zuordnung unter „Entscheidungen“ in `map.md` fest.
- [ ] Einstellungen: Spieler wählen Spezies und Prozentchancen aus dem Katalog ihrer Fraktion (wie STU `SelectCrewRace`, `UpdateUserCrewRaceChance`, `UpdateCrewRaceDistribution`); Summe 100 %.
- [ ] Neue Crew wird nach diesen Chancen gewürfelt (wie STU `CrewCreator`); ohne Auswahl Standardverteilung der Fraktion.
- [ ] Anzeige der Spezies an der Crew (Schiffs- und Koloniecrew).
- [ ] **Nicht** übernehmen: eigene Spezies einreichen, Grafik-Upload, Moderation in der Datenbank.
- [ ] Backend- und Frontend-Tests.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt E („Crew-Ränge/-Rassen in Einstellungen“); [social.md](../audit-2026-11-17/social.md) Seitenabgleich „Einstellungen“ (`CREW_RACE_USAGE` fehlt), Kleine Abweichungen „Einstellungen“.
- PO-Entscheidung 2026-11-17: Option (b) – fester Star-Wars-Katalog statt STU-Rassen; voll wie STU (Einreichung/Moderation) entfällt.

## Comments

- 2026-11-17 Product Owner: Option (b): Star-Wars-Katalog, ohne Einreichung und Moderation.
