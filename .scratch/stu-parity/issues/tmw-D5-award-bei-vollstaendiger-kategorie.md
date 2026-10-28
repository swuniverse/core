# Award bei vollständig entdeckter Datenbankkategorie und Meldung „Neuer Datenbankeintrag“

**Status:** needs-info
**Priority:** P2
**Size:** M
**Blocked by:** soc-G1

## Ziel

Hat ein Spieler eine Datenbankkategorie vollständig entdeckt, erhält er den zugehörigen Award, optional je Kartenebene, wie in STU. Jede neue Entdeckung erzeugt zusätzlich eine sichtbare Meldung „Neuer Datenbankeintrag: …“ mit dem erhaltenen Prestige. Awards sind laut Leitplanke 3 im Scope. Den Star-Wars-Katalog (Name, Bild) wählt der Agent laut Leitplanke 2 und trägt ihn in `map.md` unter „Entscheidungen“ ein.

## STU-Quellen

- `src/Module/Database/Lib/CreateDatabaseEntry.php` (`checkForCategoryCompletion`)
- `src/Orm/Entity/DatabaseCategoryAward.php` (Kategorie, optional Ebene, Award)
- `src/Component/Database/AchievementManager.php`
- `src/Module/Award/Lib/CreateUserAward.php`

## SWU-Pfade

- Entdeckungsdienste: `apps/backend/src/modules/spacecraft/ship-class-discovery.service.ts`, `apps/backend/src/modules/starmap/celestial-class-discovery.service.ts`, `system-type-discovery.service.ts`, Systementdeckung (ADR-0002/0003), Regionen (tmw-D4)
- Award-Vergabedienst aus soc-G1
- Meldungen: `apps/frontend/src/components/Toast.tsx` bzw. persistente Meldungsbox (sh-AP-12, falls vorhanden), Ereignisse `apps/backend/src/modules/events/game-event.service.ts`
- `apps/frontend/src/pages/database.tsx` (Fortschritt je Kategorie)

## Akzeptanzkriterien

- [ ] Eine Konfiguration „Kategorie (+ optional Ebene) → Award“ liegt als Seed bzw. in den Spieldaten vor, für Schiffsrümpfe, Planetentypen, Sternensystemtypen, Sternensysteme (je Ebene) und, falls vorhanden, Regionen.
- [ ] Nach jeder neuen Entdeckung wird geprüft, ob die Kategorie (bzw. Kategorie × Ebene) vollständig ist. Falls ja, wird der Award über den idempotenten soc-G1-Dienst genau einmal vergeben.
- [ ] Jede Entdeckung erzeugt ein Spielereignis „Neuer Datenbankeintrag: <Name> (+x Prestige)“, das im Frontend als Meldung erscheint. Ein Award erzeugt eine eigene Meldung.
- [ ] Der Datenbank-Hub zeigt je Kategorie „x / y entdeckt“.
- [ ] NPC-Konten (tmw-W1, falls vorhanden) erhalten weder Awards noch Prestige.
- [ ] Die gewählten Award-Namen und Bilder sind in `map.md` unter „Entscheidungen“ festgehalten. Bilder liegen nach Asset-Konvention unter `/assets/awards/…` oder sind als fehlendes Asset markiert.
- [ ] Backend-Tests: Vollständigkeit erkannt (mit und ohne Ebene), keine doppelte Vergabe, keine Vergabe bei unvollständiger Kategorie. Frontend-Test: Fortschrittsanzeige und Meldung.

## Comments

- 2026-10-28 – Blocker: Das Issue verlangt eine produktive Konfiguration für fünf Kategorien, aber zwei davon sind noch nicht vollständig implementiert: Regionen hängen von `tmw-D4`/`tmw-K8b` ab, und für die Systemkategorie fehlt eine eindeutige Produktentscheidung, welche Sternensysteme je Ebene zur Vollständigkeit zählen (alle kartierten Systeme, alle generierten Systeme oder nur betretbare Systeme). Außerdem ist `tmw-D4` derzeit selbst noch blockiert. Bitte die Vollständigkeitsmenge für „Sternensysteme je Ebene“ festlegen und entscheiden, ob Regionen in diesem Issue bis `tmw-D4` ausgenommen werden oder `tmw-D5` entsprechend blockiert werden soll.
