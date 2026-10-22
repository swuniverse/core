# Crew-Expertise, Ränge und Beförderung

**Status:** needs-info
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-CREW-1

## Ziel

STU vergibt Crew-Erfahrung für viele Ereignisse (`SkillEnhancementEnum`: Messpunkt erreicht, Kartographie abgeschlossen, Zerstörung, Bergung, Reparatur, Scan, Ausweichen u. a.), daraus Expertise je Skill und Ränge (Kadett bis Admiral) mit Beförderungslimits. `CONTEXT.md` nennt fehlende Crew-XP als offene Paritätslücke (Kartographie). Umfang muss entschieden werden.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Component/Crew/Skill/{SkillEnhancementEnum,CrewSkillLevelEnum,RaiseExpertise,CrewEnhancement}.php`, `Component/Crew/Skill/Event/*`
- `Module/Spacecraft/Action/PromoteCrew` (Expertise ≥ Rangbedarf, Limit je Rang)
- `Orm/Entity/{CrewSkill,UserCrewRank}.php`

## SWU-Pfade

- `apps/backend/src/modules/colony/entities/crew.entity.ts`, neue Entities für Skill/Rang
- `apps/backend/src/modules/spacecraft/cartography-plan.service.ts` (Messpunkt-XP laut `CONTEXT.md`)
- `apps/frontend/src/components/spacecraft/ShipOperationsPanel.tsx` (Crew-Fenster aus sc-WP-CREW-1)
- `CONTEXT.md`, `docs/adr/0003-messpunktbasierte-systemkartographie.md`

## Akzeptanzkriterien

- [ ] Datenmodell für Skill-Expertise je Crewmitglied und Rang (inkl. Rangzähler je Spieler für Limits), Migration.
- [ ] Mindestens die Ereignisse Messpunkt erreicht, Kartographie abgeschlossen, Zerstörung, Rettungskapseln geborgen und Reparatur abgeschlossen erhöhen die Expertise der beteiligten Crew; die übrigen STU-Quellen (`SkillEnhancementEnum`) sind als Erweiterungspunkt vorgesehen und in den jeweiligen Fachissues anzuschließen.
- [ ] 10 Ränge mit STU-Stufen in SW-Entsprechung (Leitplanke 2, in `map.md` unter „Entscheidungen“ dokumentiert), Beförderung bei Expertise ≥ Rangbedarf mit Limits je Rang.
- [ ] `CONTEXT.md` aktualisiert (Lücke Crew-XP geschlossen).
- [ ] Backend-Tests je Ereignisquelle und Beförderung; Frontend-Test.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Vorgabe: Variante (a), vollständig. Expertise je Skill, 10 Ränge (STU-Rangstufen mit Star-Wars-Namen nach Leitplanke 2, z. B. Kadett, Fähnrich, Leutnant, Commander, Captain, Commodore, Admiral – der Agent ergänzt auf 10 und dokumentiert in `map.md`), Beförderung mit Limits je Rang, alle STU-Ereignisquellen schrittweise.

## Offene Frage

Wie soll das Akzeptanzkriterium „Rettungskapseln geborgen“ in diesem Issue angeschlossen werden? SWU hat noch kein Rettungskapsel-Modell und bewahrt bei der Zerstörung nur eine aggregierte `wreck.crewCount` auf; dadurch gehen Crew-Identitäten samt Expertise verloren. Soll sc-WP-CREW-2 (a) individuelle Crew in neuen Rettungskapseln persistieren und einen Bergungsablauf ergänzen oder (b) nur einen Erweiterungspunkt für das spätere, bereits geplante sc-WP-CREW-3 schaffen und das Ereignis dort anschließen?

## Comments

- 2026-10-21 Product Owner: Option a – SWU übernimmt das STU-Expertisemodell vollständig: Expertise je Skill, 10 Ränge mit Star-Wars-Namen, Beförderung mit Limits je Rang und schrittweise alle STU-Ereignisquellen.
- 2026-10-22 Agent: Umsetzung vor Produktcode gestoppt: Das geforderte Bergungsereignis setzt eine noch offene Entscheidung über Crew-Identität und Eigentum bei Rettungskapseln voraus. `sc-WP-CREW-3` ist laut Backlog der kanonische Eigentümer für verschollene Crew/Rettungskapseln.
