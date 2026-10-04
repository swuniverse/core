# 06: Details und Amtstitel bearbeiten, Platzhalter

**What to build:** **Präsident** und **Vize** pflegen das Erscheinungsbild ihrer **Allianz**: Name, Beschreibung, Homepage, Farbe und die angezeigten Titel der drei **Ämter**. Die Beschreibung kann Platzhalter enthalten, die beim Anzeigen durch aktuelle Werte ersetzt werden. Spezifikation: `.scratch/alliance/spec.md`, User Stories 14–15, 44, 46–49.

**Blocked by:** 05 (Ämter und Übergabe)

**Status:** resolved

- [x] Präsident und Vize ändern Name, Beschreibung, Homepage und Farbe.
- [x] Validierung:
  - Name 5–40 Zeichen und eindeutig ohne Rücksicht auf Groß- und Kleinschreibung, der eigene Name ist ausgenommen
  - Beschreibung höchstens 10.000 Zeichen
  - Homepage leer oder mit `http://` bzw. `https://` am Anfang
  - Farbe leer oder `#rrggbb`
- [x] Bei einem Validierungsfehler wird gar nichts gespeichert. Die Farbe lässt sich durch leere Eingabe löschen.
- [x] Präsident und Vize benennen die Titel der drei Ämter um (je 3–30 Zeichen). Liste, Detailseite und Nachrichten verwenden die neuen Titel.
- [x] Die Detailseite ersetzt in der Beschreibung die Platzhalter auf dem Server:
  - `$ALLIANCE_PRESIDENT`
  - `$ALLIANCE_VICEPRESIDENT` (erster Vize)
  - `$ALLIANCE_FOREIGNMINISTER` (erster Diplomat)
  - `$ALLIANCE_HOMEPAGE_LINK` (Link „Zur Allianz-Homepage“)

  Unbesetzte Ämter erscheinen als „Unbesetzt“. Unbekannte `$ALLIANCE_*`-Platzhalter werden entfernt.
- [x] Unit-Tests decken Validierung, „nichts speichern bei Fehler“ und die Platzhalter-Ersetzung ab.
- [x] Frontend-Tests decken das Bearbeiten-Formular mit Fehleranzeige und das Umbenennen der Titel ab.

## Comments

Implemented in commit 13590f6 (feat(alliance): add alliances).
