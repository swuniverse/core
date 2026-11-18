# Restliche NPC-Werkzeuge als Admin-Seiten (Leitplanke 3 prüfen)

**Status:** needs-triage
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

STU hat einen NPC-Bereich mit Werkzeugen für Spielleitung und RPG-Betrieb. SWU ersetzt ihn teilweise durch Admin-Seiten (Schiffs-Spawn, Award vergeben, Deals/Auktionen/Lotterie, Spieler, Fraktionen). Es fehlen:

1. **Waren-Werkzeug** (`CommodityCheat`): Waren einer Kolonie oder einem Spacecraft eines Spielers gutschreiben, mit Grund; Log „X hat … folgende Waren hinzugefügt: … Grund: …“.
2. **Prestige-Werkzeug** (`PrestigeCheat`): positiven oder negativen Prestigebetrag mit Beschreibung buchen. **Hinweis:** Bereits Teil von soc-AUD-08 (Punkt 3 „Prestigekorrektur durch NPC/Admin“); hier nur aufnehmen, falls soc-AUD-08 ihn bei der Triage abgibt.
3. **NPC-Awards** (`CreateNpcAward`, `GiveNpcAward`): eigene Awards mit Name, Beschreibung, Bild und Prestige anlegen und an mehrere Spieler vergeben. SWU vergibt nur Awards aus dem festen Katalog (`admin-awards.tsx`, `award.catalog.ts`).
4. **NPC-Log mit Begründungspflicht** (`NPCLog`, `npclog.twig`, `npcLogRepository`): Jede Werkzeugaktion (Waren, Prestige, Award, Schiff, Bauplan, Deal, Spielerdetails einsehen `LogPlayerDetails`) wird mit Akteur, Ziel und Grund protokolliert; ohne Grund wird die Aktion abgelehnt (STU: Pflicht für NPC-Konten). Eine Admin-Seite listet das Log.
5. **Editierbare Willkommensnachricht** (`SaveWelcomeMessage`, `settings.twig`): Text der fraktionsspezifischen Willkommens-PM im Admin pflegbar statt fest im Code (`onboarding.service.ts`, soc-A8).

Außerdem im Audit genannt, aber nicht beauftragt: History-Einträge von Hand anlegen (`CreateHistoryEntry`), Bauplan-/Schiffsersteller über den Schiffs-Spawn hinaus.

**Triage-Fragen (Leitplanke 3: „NPC-Konten nur so weit, wie Handel sie braucht“; N1: „NPC-Werkzeuge als Admin-Seiten“):**
- Welche der Punkte 1–5 gehören in den Scope? Das Audit war bei Waren-/Prestige-Werkzeug und NPC-Log unsicher.
- Werkzeuge an die Admin-Rolle binden (wie bisher) oder zusätzlich an NPC-Konten/eine eigene Berechtigung (z. B. „Spielleitung“)?
- Begründungspflicht für alle Werkzeugnutzer oder nur für Nicht-Admins (STU: nur NPC)?
- Nach Entscheidung in Teiltickets der Größe S aufteilen (Vorschlag: a) NPC-Log + Begründungspflicht als Fundament, b) Waren-Werkzeug, c) NPC-Awards, d) Willkommensnachricht).

## STU-Quellen

- `src/html/npc/tools.twig`, `npclog.twig`, `settings.twig`, `playerDetails.twig`
- `src/Module/NPC/Action/CommodityCheat.php` (Z. 48–62 Grundpflicht, Z. 150–189 Log), `PrestigeCheat.php`, `CreateNpcAward.php` (Z. 60–62, 142–147), `GiveNpcAward.php` (Z. 73–116), `SaveWelcomeMessage.php`, `LogPlayerDetails.php`, `CreateHistoryEntry.php`
- `src/Module/NPC/View/NPCLog/NPCLog.php`, `ShowTools/`, `ShowNPCSettings/`

## SWU-Pfade

- `apps/frontend/src/pages/admin.tsx`, `admin-awards.tsx`, `admin-users.tsx`, `admin-ships.tsx`, `admin-trade-deals.tsx`
- `apps/backend/src/modules/awards/admin-awards.controller.ts`, `award.catalog.ts`, `award.service.ts`
- `apps/backend/src/modules/prestige/prestige.service.ts` (`change`)
- `apps/backend/src/modules/onboarding/onboarding.service.ts` (`sendWelcomeMessage`, Z. ~504–545)
- `apps/backend/src/modules/auth/auth.controller.ts` (Admin-Benutzerendpunkte)
- Verwandte Tickets: soc-AUD-08 (Prestigekorrektur), sh-AUD-12 (übrige Admin-Werkzeuge), soc-A8 (Willkommens-PM, resolved)

## Akzeptanzkriterien

- [ ] Triage-Entscheidung zu Scope, Rolle und Begründungspflicht unter `## Comments` festgehalten.
- [ ] Teiltickets (S) mit eigenen Akzeptanzkriterien und Tests angelegt; dieses Ticket danach als Tracking-Split `resolved`.
- [ ] Doppelungen mit soc-AUD-08 und sh-AUD-12 aufgelöst (kanonischer Eigentümer je Werkzeug benannt).

## Herkunft

- Audit: [README.md](../audit-2026-11-17/README.md) Abschnitt F „Out of scope: … NPC-Konten über Handel hinaus (map.md Leitplanke 3) – betrifft NPC-Werkzeuge“, N1 „NPC-Konten nur für den Handel; NPC-Werkzeuge als Admin-Seiten“; [trade-map-world.md](../audit-2026-11-17/trade-map-world.md) „Große Abweichungen 6“ und Seitenabgleich `html/npc/*.twig`.
- `map.md` Leitplanke 3 (2026-10-21). tmw-W1 ist `resolved` (nur Handels-NPCs).
- Status `needs-triage`, weil der Audit-Bericht die Zugehörigkeit zum Scope ausdrücklich offen lässt.

## Comments
