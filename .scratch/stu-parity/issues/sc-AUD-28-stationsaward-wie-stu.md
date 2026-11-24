# Stations-Award wie STU vergeben, Menüpunkt „Stationen“ nur danach

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** sc-AUD-27

## Problem

Der Menüpunkt „Stationen“ (sc-AUD-27) erscheint bei STU nur bei `hasStationsNavigation` (`src/Module/Control/Render/GameTwigRenderer.php` Z. 95). Bedingung ist eine der folgenden:
- NPC
- Award `RESEARCHED_STATIONS` (id 1, „Der Spieler hat Stationen erforscht“)
- eigene Crew auf einer fremden Station

STU vergibt den Award über `stu_research.award_id = 1` bei der Forschung „Raumkonstrukt“ (ids 12001201–12001205, je Fraktion eine; geprüft in `core-stu-db-1`).

SWU hat den Mechanismus dafür bereits: `research.service.ts` Z. ~781 vergibt bei Abschluss `tech.awardKey` über `AwardService.grant`. Der Award `RESEARCH_STATIONS` steht auch im Katalog (`awards/award.catalog.ts`). In `game-data` setzt aber keine Technologie `awardKey`, also bekommt niemand den Award.

Als Übergang zählt sc-AUD-27 deshalb zusätzlich jede eigene, nicht zerstörte Station (`auth.service.ts` `hasStationsNavigation`). Das weicht von STU ab.

## Ziel

Der Award wird wie bei STU mit „Raumkonstrukt“ erforscht. Danach gilt für den Menüpunkt nur noch die STU-Regel.

## Akzeptanzkriterien

- [ ] **game-data (Submodul):** `awardKey: RESEARCH_STATIONS` an den Raumkonstrukt-Forschungen. Rebellen: `12001201` in `data/research/rebels.yaml`. Imperium: `12001203` in `data/research/imperials.yaml`. Die übrigen STU-ids 12001202, 12001204 und 12001205 nur, wenn sie in SWU existieren.
- [ ] Das Forschungs-UI zeigt den Award an der Technologie an. Das passiert über das vorhandene Feld `award` in `research.service.ts`, ohne Zusatzarbeit; ein Test sichert es ab.
- [ ] **Nachtrag für Bestandsspieler:** Eine Migration oder ein einmaliger Lauf vergibt `RESEARCH_STATIONS` an alle Spieler, die Raumkonstrukt schon erforscht haben (Tabelle `research`, abgeschlossen), ohne doppelte Einträge (Unique `UQ_user_awards_user_award`).
  - Der Nachtrag vergibt die 10 Prestige des Katalogs wie eine normale Vergabe (über `AwardService.grant`, Entscheidung unten).
- [ ] `hasStationsNavigation` folgt danach nur noch der STU-Regel (NPC, Award, Crew auf fremder Station). Die Übergangsbedingung „eigene Station“ fällt weg.
  - Der Admin-Sonderfall in Sidebar und Mobil-Menü fällt weg, wie bei STU (Entscheidung unten).
- [ ] **Tests:**
  - Unit: Der Abschluss von Raumkonstrukt vergibt `RESEARCH_STATIONS`.
  - PostgreSQL: Die Migration bzw. der Nachtrag vergibt den Award genau einmal.
  - `stations-navigation.int-spec.ts`: Eine eigene Station allein schaltet nicht mehr frei.

## Risiko

Spieler, die eine Station ohne die Forschung besitzen (zum Beispiel über eine Übernahme), sehen den Menüpunkt danach nicht mehr. Bei STU ist das genauso. Die Station bleibt über die Schiffsansicht und die Karte erreichbar. Vor dem Entfernen der Übergangsregel per Datenbankabfrage zählen, wie viele Spieler das betrifft.

## Quellen

- STU: `GameTwigRenderer.php` Z. 95–106, `UserAwardEnum::RESEARCHED_STATIONS = 1`, `stu_research` (award_id 1 bei 12001201–12001205).
- SWU: `research.service.ts` (Vergabe `tech.awardKey`), `awards/award.catalog.ts`, `auth.service.ts` (`hasStationsNavigation`), `stations-navigation.int-spec.ts`.

## Entscheidungen (Projektinhaber, 2026-11-24)

- **Prestige beim Nachtrag:** ja, wie bei einer normalen Vergabe. Voraussichtlich betrifft es niemanden, weil bisher wohl noch kein Spieler Raumkonstrukt erforscht hat. Der Nachtrag wird trotzdem eingeplant.
- **Admins:** wie STU. Admins sehen „Stationen“ nur nach derselben Regel wie alle anderen.
