# Flottenmutationen: gemeinsame Nebenläufigkeitsregeln

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Flottenmitgliedschaft und Führung werden bei gleichzeitigen Positionswechseln auf Grundlage des nach Sperren gültigen Zustands geändert. Ein unterstützter transaktionaler Vertrag stellt einem späteren vollständigen Positionswechsel die autoritative Teilnehmermenge bereit. Dieses Issue implementiert weder eine Wurmlochpassage noch einen Wurmlochendpunkt.

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (Flotte erstellen, beitreten, verlassen, auflösen, Führung ändern und bewegungsbedingte Austritte)
- `apps/backend/src/modules/spacecraft/entities/spacecraft.entity.ts` und bestehende Flottenpersistenz
- Bestehende PostgreSQL-Integrationsinfrastruktur unter `apps/backend/src/testing/integration/`

## Akzeptanzkriterien

- [ ] Flottenerstellung, Beitritt, Austritt, Auflösung, Führungswechsel und bewegungsbedingte Austritte verwenden einen gemeinsamen Transaktions- und Sperrordnungsvertrag mit Positionswechseln. Mitgliedschaft, Führung, Eigentum, Zulässigkeit und relevante Positionen werden nach Erwerb der benötigten Sperren autoritativ erneut gelesen und geprüft.
- [ ] Ein unterstützter transaktionaler Helper ermöglicht zukünftigen vollständigen Positionswechseln die Auswahl und Sperrung der vollständigen aktuellen Teilnehmermenge. Ein bereits abgeschlossener Beitritt wird dabei berücksichtigt; ein wartender Beitritt nach einem abgeschlossenen Positionswechsel prüft die neue Kolokation und wird bei fehlender Kolokation abgelehnt.
- [ ] Gezielte Schreibvorgänge für Mitgliedschaft und Führung stellen keine veralteten Positionen, Ressourcen oder Führungswerte wieder her; angrenzende Flottenspeicherungen überschreiben keine geschützten Führungsfelder mit veralteten Daten.
- [ ] Das bestehende partielle Verhalten gewöhnlicher Flüge mit nicht fixierter Flotte bleibt erhalten. Der Helper schreibt keine neue Wurmlochregel vor; keine monolithische Umstrukturierung und kein neuer Endpunkt.
- [ ] Tests nutzen die produktiven öffentlichen Flottenoperationen und eine echte, migrationsbasierte, disposable PostgreSQL-Datenbank mit kontrollierten Barrieren: wartender Beitritt nach bestätigter Verlagerung lehnt alte Kolokation ab; vor Verlagerung bestätigter Beitritt erscheint in der autoritativen Teilnehmermenge. Persistierter Zustand wird erneut geladen.
- [ ] Tests prüfen relevante Interleavings von Austritt, Auflösung und Führungswechsel, Rollback und deterministische Sperrreihenfolge; keine veraltete Wiederherstellung und keine partielle Mutation nach Fehlern.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-11-09: Zwei lokale Berichte bestätigen einen vorhandenen Beitrittswettlauf: Der echte öffentliche `joinFleet` wartete während einer simulierten, gesperrten Verlagerung; nach deren Commit zeigte der erneut geladene PostgreSQL-Zustand den Leiter am neuen und das beigetretene Mitglied am alten Ort in derselben Flotte. Die weitere Sperrreihenfolge und übrigen Operationen sind erforderliche Teilnehmer des gemeinsamen Vertrags, nicht separat nachgewiesene identische Fehler. Keine Implementierung oder abgeschlossene Abnahme wird behauptet.
