# 05: Ordnerpostfach und Header-Leiste ausliefern

**What to build:** Spielende verwenden ein STU-inspiriertes Ordnerpostfach statt technischer Tabs und sehen im Header eine kompakte, zugängliche Icon-Leiste für alle Nachrichtenordner mit ihren ungelesenen Zählern und Direktlinks.

**Blocked by:** 04: Nachrichtenordner als serverseitigen Vertrag einführen.

**Status:** resolved

- [ ] Die Nachrichtenansicht zeigt alle sieben Ordner und deren `ungelesen/gesamt`, einschließlich `0/0` für leere Ordner.
- [ ] Das Öffnen eines Ordners lädt dessen serverseitig gefilterte Nachrichten; beim Öffnen einer empfangenen Nachricht aktualisiert sich der Gelesen-Status.
- [ ] Der Header zeigt für alle Ordner Icons, Tooltips, ungelesene Zähler und direkte Navigation in den jeweiligen Ordner.
- [ ] Die Header-Leiste bleibt auf kleinen Viewports erreichbar und bedienbar.
- [ ] Integrationstests prüfen Ordneransicht, Zähler, Direktlinks, Lesen einer Nachricht und die Header-Leiste.

## Comments

- Resolved on integration/events-and-message-folders.
