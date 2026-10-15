# 01: Globale Ereignis-API absichern und durchsuchbar machen

**What to build:** Berechtigte Spielende können globale Ereignisse über einen geschützten Vertrag nach Ereignistyp und Text durchsuchen, das Ergebnislimit wählen und konsistente Typzähler sowie Ortsdaten erhalten. Die Ergebnisse sind absteigend nach Erstellungszeitpunkt sortiert und umfassen die bestehenden globalen Ereignistypen Schiffszerstörung, Hyperraum-Abfang und Systemeintritt.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [ ] Die globale Ereignisabfrage verlangt Authentifizierung und erlaubten Spielzugang und liefert keine Daten für unberechtigte Anfragen.
- [ ] Die Abfrage unterstützt Typfilter, Textsuche und begrenzte Ergebnisse sowie leere Ergebnisse ohne Sonderfehler.
- [ ] Die Antwort enthält absteigend sortierte Ereignisse, Typzähler und die vorhandenen Ortsdaten für eine spätere sichere Navigation.
- [ ] Vertragstests decken Filter, Suche, Limit, Sortierung, Zähler, Ortsdaten und Zugriffsschutz ab.

## Comments

- Resolved on integration/events-and-message-folders.
