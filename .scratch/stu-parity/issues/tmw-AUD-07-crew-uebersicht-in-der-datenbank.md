# Crew-Übersicht in der Datenbank wie STU crewManagement.twig

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

STU hat im Datenbank-Hub den Eintrag „Crew“: eine spielerweite Liste aller eigenen Crewmitglieder mit Rang, Expertise, aktuellem Posten und Einsatzort (Schiff, Station, Kolonie, Handelsposten, Rettungskapsel), Filtern, Sortierung und Sammel-Entlassung. SWU hat Crew-Management nur je Schiff (`GET spacecraft/:id/crew`) und je Kolonie nur Zähler.

Umsetzung:

- Endpunkt `GET database/crew` mit allen `CrewAssignment` des Spielers: Name, Rang (spielerspezifischer Rangname, wo vorhanden), höchste Expertise, Crewtyp/Posten (nur auf Schiffen, nicht in Kapseln), Einsatzort (Typ, Id, Name), Kennzeichen „Rettungskapsel“, „auf fremder Station“ und „auf fremder Station, nicht im Einsatz“.
- Seite „Datenbank / Crew“ mit Filtern Name, Schiff/Station, Kolonie, Rang (Mehrfachauswahl), Posten (Mehrfachauswahl), „Nur Rettungskapseln“, „Auf fremden Stationen“, „Auf fremden Stationen nicht im Einsatz“; Sortierung nach Expertise (Standard), Name, Rang, Schiffsname, Posten; Trefferzähler.
- Sammel-Entlassung wie STU `DismissCrew`: ausgewählte eigene Crew wird gelöscht; leere Rettungskapseln werden entfernt; Bestätigungsschritt.
- Eintrag „Crew“ im Datenbank-Hub.

## STU-Quellen

- `src/Module/Database/View/ShowCrewManagement/ShowCrewManagement.php` (Z. 28–56)
- `src/html/database/crewManagement.twig` (Filter, Sortierung, Liste, Entlassen)
- `src/Public/static/js/database.js` (Filter-/Entlassungslogik, Z. 50–270)
- `src/Module/Database/Action/DismissCrew/DismissCrew.php`
- `src/html/view/database.twig` (Z. 56, Hub-Link)

## SWU-Pfade

- `apps/backend/src/modules/colony/entities/crew.entity.ts`, `crew-assignment.entity.ts` (`colonyId`, `spacecraftId`, `escapePodId`, `tradePostId`, `slot`)
- `apps/backend/src/modules/spacecraft/entities/crew-skill.entity.ts`, `apps/backend/src/modules/spacecraft/crew-rank.ts`
- `apps/backend/src/modules/spacecraft/spacecraft-crew.service.ts` (Z. 65–121, Muster je Schiff), `escape-pod.service.ts`
- `apps/backend/src/modules/database/database.controller.ts`, `database.service.ts`
- `packages/shared/src/lib/database/index.ts`
- `apps/frontend/src/pages/database.tsx` (Hub-Gruppen, Routing)
- Tests: neue Backend-Spec für Crew-Übersicht und Entlassung, `apps/frontend/src/pages/database.spec.tsx`

## Akzeptanzkriterien

- [ ] `GET database/crew` liefert nur Crew des anfragenden Spielers, mit allen oben genannten Feldern; keine Daten fremder Spieler (auch nicht von fremden Stationen, auf denen eigene Crew dient, über Name/Ort hinaus).
- [ ] `POST database/crew/dismiss` mit Crew-Ids entlässt nur eigene Crew transaktional; Schiffscrewzahlen werden aktualisiert; leere Rettungskapseln werden entfernt; fremde oder unbekannte Ids werden übersprungen und gemeldet.
- [ ] Die Seite filtert und sortiert clientseitig wie STU und zeigt den Trefferzähler; Entlassen verlangt Bestätigung.
- [ ] Hub enthält „Crew“.
- [ ] Backend-Tests: Zuordnung je Einsatzort, Fremdstation-Kennzeichen, Entlassung inkl. Kapsel-Entfernung, Zugriffsschutz. Frontend-Tests: Filter, Sortierung, Entlassen mit Bestätigung.

## Herkunft

- Audit: [README.md](../audit-2026-11-17/README.md) Abschnitt H „Handel und Datenbank: Eine spielerweite Crew-Übersicht fehlt“; [trade-map-world.md](../audit-2026-11-17/trade-map-world.md) Seitenabgleich `database.twig`, Kleine Abweichungen „Datenbank-Hub: Ohne ‚Crew‘-Eintrag“, Unsicherheiten „Crew-Übersicht (Gegenstück zu `crewManagement.twig`)“.
- Kein bisheriges Ticket.

## Comments
