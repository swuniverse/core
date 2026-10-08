# 05: Beziehungsfreigaben und Vertragswerk aushandeln

**What to build:** Präsidenten und Diplomaten können bei Vorschlägen Beziehungsfreigaben vereinbaren und für eine aktive Beziehung gemeinsam einen neuen Freigabezustand oder ein neues Vertragswerk aushandeln. Der akzeptierte Zustand bleibt bis zur Annahme unverändert und öffentlich.

**Blocked by:** 03 (Abkommen vorschlagen und beantworten), 04 (Frieden und Beziehungswechsel)

**Status:** resolved

- [ ] „Als Freund behandeln“ ist ausschließlich für Handelsabkommen, Freundschaft, Bündnis und Vasallenschaft auswählbar; „Live-Kartenpositionen teilen“ ausschließlich für Bündnis.
- [ ] Krieg und Frieden besitzen keine Beziehungsfreigaben; ungültige Kombinationen werden serverseitig abgewiesen und nicht nur im Formular versteckt.
- [ ] Ein angenommener Erst- oder Typwechselvorschlag übernimmt genau den angebotenen zulässigen Freigabezustand und das angebotene Vertragswerk.
- [ ] Präsident und Diplomat einer beteiligten Allianz dürfen für die aktive Beziehung einen vollständigen neuen Freigabe- und/oder Vertragswerkzustand vorschlagen.
- [ ] Je aktiver Beziehung existiert höchstens eine ausstehende Änderung; identische Zielzustände werden ohne Schreibzugriff als fachlich ungültig abgewiesen.
- [ ] Nur Präsident oder Diplomat der Gegenseite dürfen die Änderung annehmen oder ablehnen; nur die anbietende Seite darf sie zurückziehen.
- [ ] Bis zur Annahme bleiben aktives Vertragswerk und aktive Freigaben in allen öffentlichen Antworten unverändert; nur berechtigte Beteiligte sehen den Entwurf und dessen Absender.
- [ ] Annahme ersetzt Freigaben und Vertragswerk atomar; Ablehnung oder Rückzug verwirft nur den Entwurf.
- [ ] Kriegserklärung und Beziehungsende entfernen ausstehende Änderungen, sodass kein verwaister oder später reaktivierter Entwurf bleibt.
- [ ] Ein direkt adressierter Entwurfsabruf durch unbeteiligte oder unberechtigte Nutzer wird serverseitig verweigert.
- [ ] Systemnachrichten informieren die Gegenallianz nach Commit über Angebot, Annahme, Ablehnung oder Rückzug, ohne vertraulichen Vertragsinhalt offenzulegen.
- [ ] Gespeicherte Freigaben bleiben in dieser Etappe rein diplomatische Daten und verändern keine anderen Spielsysteme.
- [ ] Service-, PostgreSQL- und Frontendtests decken Typmatrix, Sichtbarkeit, Einzigkeit, unveränderten Aktivzustand, atomare Annahme und konkurrierende Änderungen ab.

## Answer

Implementiert in 2fb40b4632a3558b788f04e3907c4c0151819988.
