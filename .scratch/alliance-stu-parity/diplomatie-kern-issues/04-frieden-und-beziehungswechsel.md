# 04: Frieden und Beziehungswechsel

**What to build:** Beteiligte Allianzen können Krieg ausschließlich durch angenommenen Frieden beenden und eine bestehende Nicht-Kriegsbeziehung durch einen angenommenen neuen Beziehungstyp ersetzen. Bis zur Annahme bleibt die aktive Beziehung unverändert öffentlich und wirksam.

**Blocked by:** 02 (Krieg erklären), 03 (Abkommen vorschlagen und beantworten)

**Status:** resolved

- [ ] Präsident und Diplomat einer am Krieg beteiligten Allianz dürfen genau einen Friedensvorschlag samt optionalem Vertragswerk anlegen.
- [ ] Frieden kann nicht ohne aktiven Krieg und nicht als gewöhnliches Erstabkommen angeboten werden.
- [ ] Annahme ersetzt Krieg und Friedensvorschlag atomar durch eine aktive, öffentliche Friedensbeziehung ohne Beziehungsfreigaben.
- [ ] Ablehnung oder Rückzug entfernt nur den Friedensvorschlag; der Krieg bleibt aktiv.
- [ ] Aktiver Frieden bleibt öffentlich sichtbar und kann wie jede aktive Nicht-Kriegsbeziehung durch Präsident oder Diplomat einer Seite beendet werden.
- [ ] Präsident und Diplomat dürfen zu einer aktiven Nicht-Kriegsbeziehung einen anderen zulässigen Beziehungstyp vorschlagen.
- [ ] Während Friedens- oder Typwechselvorschlägen bleiben Typ, Vertragswerk und Freigaben der aktiven Beziehung öffentlich unverändert; die Verwaltungsansicht zeigt beide Zustände getrennt.
- [ ] Die Annahme eines Typwechsels ersetzt die aktive Beziehung atomar und erhält die korrekte Vasallenschaftsrichtung, wenn der Zieltyp Vasallenschaft ist.
- [ ] Präsident oder Diplomat einer beteiligten Allianz können jede aktive Nicht-Kriegsbeziehung beenden; Vorschläge und abhängige Änderungsdaten werden mit entfernt.
- [ ] Zwei konkurrierende Friedens-/Typwechselaktionen sowie Krieg gegen Annahme serialisieren zu genau einem gültigen Zustand ohne rohen Datenbankfehler.
- [ ] Alle erfolgreichen Übergänge benachrichtigen die Gegenallianz nach Commit; fehlgeschlagene oder zurückgerollte Übergänge versenden nichts.
- [ ] Service-, PostgreSQL- und Frontendtests decken die gesamte Zustandsmaschine von Krieg zu Frieden, Typwechsel, Beendigung und die relevanten Rennen ab.

## Answer

Implementiert in 804400dc93c91e33bd16b4e00eeaff0e708060d0; integriert als 9e179355ded44573b1ca420a5fa04d74140c7663.
