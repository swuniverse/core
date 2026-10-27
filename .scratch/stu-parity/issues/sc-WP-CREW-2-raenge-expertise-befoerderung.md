# Crew-Expertise, Ränge und Beförderung

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-CREW-1

## Ziel

SWU übernimmt das vollständige STU-Expertisemodell: Expertise je Skill und Crewmitglied, zehn Rangstufen sowie kontrollierte Beförderungen mit Spielerlimits. Verfügbare Ereignisquellen werden jetzt angebunden; die Rettungskapsel-Bergung bleibt ein nicht blockierender Produzent des kanonischen Folgeissues sc-WP-CREW-3b.

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

- [ ] Datenmodell für Skill-Expertise je Crewmitglied und Rang, Migration und zentraler idempotenter Enhancement-Service; Expertise und Rang bleiben bei Kolonie-/Schiffszuweisung und späterem Kapseltransfer an der individuellen Crew erhalten.
- [ ] Der Ereigniskatalog unterstützt alle STU-`SkillEnhancementEnum`-Quellen. Die bereits verfügbaren Quellen Messpunkt erreicht, Kartographie abgeschlossen, Zerstörung und Reparatur abgeschlossen erhöhen die Expertise der beteiligten Crew.
- [ ] `SALVAGE_EMERGENCY_PODS` ist als stabiler Erweiterungspunkt vorhanden und wird in sc-WP-CREW-3b nach erfolgreicher Kapselbergung ausgelöst; dies blockiert CREW-2 nicht.
- [ ] Zehn Ränge verwenden die STU-Schwellen: Kadett 0, Crewmitglied 100, Fähnrich 300, Unterleutnant 1.000, Leutnant 2.000, Oberleutnant 5.000, Commander 10.000, Captain 20.000, Commodore 50.000, Admiral 100.000.
- [ ] Ränge bis `LIEUTENANT_COMMANDER`/Oberleutnant folgen der Expertise automatisch. Commander, Captain, Commodore und Admiral werden explizit befördert und erzwingen transaktionssicher die Spielerlimits 25/15/5/3.
- [ ] `CONTEXT.md` wird aktualisiert; Crew-UI zeigt Expertise, Rang und mögliche Beförderung.
- [ ] Backend-Tests decken Modell, Rangübergänge, Limits, verfügbare Ereignisquellen und den Erweiterungsport ab; sc-WP-CREW-3b besitzt den Integrationsfall für Kapselbergung. Frontend-Test deckt Anzeige/Beförderung ab.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Vorgabe: Das vollständige STU-Modell wird jetzt als eigenständige Grundlage umgesetzt. Die unteren sechs Rangstufen folgen automatisch der Expertise; die oberen vier erfordern eine explizite Beförderung mit Limits 25/15/5/3. Rettungskapsel-Bergungs-XP wird später durch sc-WP-CREW-3b über dieselbe Enhancement-API erzeugt und ist keine Abhängigkeit dieses Issues.

## Comments

- 2026-10-21 Product Owner: Option a – SWU übernimmt das STU-Expertisemodell vollständig: Expertise je Skill, 10 Ränge mit Star-Wars-Namen, Beförderung mit Limits je Rang und schrittweise alle STU-Ereignisquellen.
- 2026-10-22 Agent: Umsetzung vor Produktcode gestoppt: Das geforderte Bergungsereignis setzt eine noch offene Entscheidung über Crew-Identität und Eigentum bei Rettungskapseln voraus. `sc-WP-CREW-3` ist laut Backlog der kanonische Eigentümer für verschollene Crew/Rettungskapseln.
- 2026-10-27 Product Owner: CREW-2 baut das vollständige Expertise-/Rangfundament jetzt. CREW-3b liefert später nur den Produzenten `SALVAGE_EMERGENCY_PODS`; dies blockiert CREW-2 nicht. Die oberen vier Ränge verwenden die STU-Limits 25/15/5/3.
