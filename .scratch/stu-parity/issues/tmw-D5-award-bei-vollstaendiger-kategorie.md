# Award bei vollständig entdeckter Datenbankkategorie und Meldung „Neuer Datenbankeintrag“

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

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

Dieses Parent-Ticket ist ein Tracking-Split; die Umsetzung erfolgt in vier geordneten Child-Issues:

- [ ] `tmw-D5a`: gemeinsame Kategorie-Award-Konfiguration und Completion-Service.
- [ ] `tmw-D5b`: Schiffsrümpfe, Planetentypen und Systemtypen – Entdeckung, Meldung und Award-Prüfung.
- [ ] `tmw-D5c`: Sternensystem-Katalogmerkmal, Backfill und Entdeckungsintegration je Ebene.
- [ ] `tmw-D5d`: Datenbank-Hub-Fortschritt und Frontend-Meldungen.

## Entscheidung

Für „Sternensysteme je Ebene vollständig entdeckt“ zählt ein explizit konfigurierter Datenbankkatalog statt jede persistierte oder aktuell erreichbare Weltentität. `StarSystem` erhält dafür ein persistentes Katalogmerkmal; bestehende produktive Systeme werden als katalogberechtigt zurückgefüllt, während versteckte, Test- oder Admin-Experimentsysteme ausdrücklich ausgeschlossen werden können. Vollständigkeit wird ausschließlich gegen die katalogberechtigten Systeme der jeweiligen Ebene geprüft. Änderungen an dieser Berechtigung sind bewusste Katalogpflege und keine abgeleitete Navigationsentscheidung.

Regions-Awards sind nicht Teil der ersten produktiven Konfiguration. Sie werden ergänzt, sobald `tmw-K8b2` und `tmw-D4` einen autoritativen Regionskatalog bereitstellen; die vier bereits verfügbaren Kategorien werden dadurch nicht blockiert.

## Comments

- 2026-10-28 – Blocker: Das Issue verlangt eine produktive Konfiguration für fünf Kategorien, aber zwei davon sind noch nicht vollständig implementiert: Regionen hängen von `tmw-D4`/`tmw-K8b` ab, und für die Systemkategorie fehlt eine eindeutige Produktentscheidung, welche Sternensysteme je Ebene zur Vollständigkeit zählen (alle kartierten Systeme, alle generierten Systeme oder nur betretbare Systeme). Außerdem ist `tmw-D4` derzeit selbst noch blockiert. Bitte die Vollständigkeitsmenge für „Sternensysteme je Ebene“ festlegen und entscheiden, ob Regionen in diesem Issue bis `tmw-D4` ausgenommen werden oder `tmw-D5` entsprechend blockiert werden soll.
- 2026-10-30 Product Owner: Option 3. Die Vollständigkeitsmenge je Ebene besteht aus Sternensystemen mit expliziter persistenter Katalogberechtigung. Bestehende produktive Systeme werden als berechtigt migriert; versteckte, Test- und Admin-Experimentsysteme können ausgeschlossen werden. Weder bloße Persistenz noch dynamische Erreichbarkeit definiert den Nenner. Regions-Awards werden bis zum autoritativen Katalog aus `tmw-K8b2` und `tmw-D4` zurückgestellt und blockieren die erste Umsetzung nicht.
- 2026-10-30 – Blocker nach Implementierungsanalyse: Das Issue verlangt vier voneinander unabhängige Entdeckungspfade, persistente Meldungen, NPC-Ausschluss, katalog-/ebenenabhängige Vollständigkeit, Migration/Backfill, Award-Seeds und Frontend-Fortschritt samt Tests. Das überschreitet die verbindliche Issue-Größe M deutlich und lässt sich nicht in einem sicheren vertikalen Durchlauf umsetzen. Deshalb wurde die Aufteilung in vier geordnete Child-Issues vorgeschlagen.
- 2026-11-06 Product Owner: Bestätigt den Tracking-Split in vier Child-Issues. `tmw-D5a` enthält die gemeinsame Award-Konfiguration und Completion-Prüfung; `tmw-D5b` integriert Schiffsrümpfe, Planetentypen und Systemtypen; `tmw-D5c` ergänzt Systemkatalogmerkmal, Backfill und Entdeckung je Ebene; `tmw-D5d` liefert Fortschrittsanzeige und Frontend-Meldungen. `tmw-D5b` und `tmw-D5c` hängen von `tmw-D5a` ab; `tmw-D5d` hängt von beiden ab. Regionen bleiben bis zum autoritativen Regionskatalog aus `tmw-K8b2` und `tmw-D4` ausgenommen. Das Parent-Ticket bleibt `resolved` als Tracking-Split.
