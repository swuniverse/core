# 03: Abkommen vorschlagen und beantworten

**What to build:** Präsidenten und Diplomaten können Freundschaft, Bündnis, Handelsabkommen oder Vasallenschaft samt Vertragswerk einer Allianz derselben Fraktion vorschlagen. Die Gegenseite kann den vertraulichen Vorschlag annehmen oder ablehnen, die sendende Seite ihn zurückziehen; erst die Annahme schafft eine öffentliche aktive Beziehung.

**Blocked by:** 01 (Beziehungen öffentlich anzeigen)

**Status:** resolved

- [ ] Präsident und Diplomat dürfen Vorschläge anlegen und beantworten; Vize, Mitglied ohne Amt, Außenstehende und allianzlose Spieler werden bei jedem direkten Mutationsaufruf serverseitig abgewiesen.
- [ ] Ein Vorschlag hat eindeutige Sender- und Empfängerallianzen derselben Fraktion, einen zulässigen Nicht-Kriegs-/Nicht-Frieden-Typ, optionales validiertes Vertragswerk und einen Erstellzeitpunkt.
- [ ] Je kanonischem Allianzenpaar besteht durch Service-Regel und Datenbank-Constraint höchstens ein Beziehungsvorschlag, auch bei zwei gleichzeitig angelegten Vorschlägen.
- [ ] Nur Präsident oder Diplomat der Empfängerallianz dürfen annehmen oder ablehnen; nur Präsident oder Diplomat der Senderallianz dürfen zurückziehen.
- [ ] Annahme erzeugt atomar die einzige aktive Beziehung des Paars; Ablehnung und Rückzug entfernen ausschließlich den Vorschlag.
- [ ] Vasallenschaft übernimmt die Senderallianz als Lehnsherr und die Empfängerallianz als Vasall; andere angenommene Typen werden gegenseitig dargestellt.
- [ ] Vorschläge, Richtung und Vertragsentwürfe sind ausschließlich in Verwaltungsantworten für Präsident und Diplomat einer beteiligten Allianz sichtbar, auch bei direktem Abruf per ID.
- [ ] Öffentliche Allianzdetails, öffentliche Vertragswerk-Abrufe und Beschreibungen geben weder Vorschlag noch Entwurf preis.
- [ ] Die betroffene Gegenallianz erhält jeweils nach Commit eine allianceweite Systemnachricht über Vorschlag, Annahme, Ablehnung oder Rückzug, ohne den vertraulichen Vertragsentwurf im Nachrichtentext.
- [ ] Veraltete Wiederholungen und zwei gleichzeitige Antworten erzeugen genau einen erfolgreichen Ausgang und ansonsten fachliche Fehler.
- [ ] Ein schmaler Verwaltungsfluss erlaubt Anlegen und Beantworten bereits über die Oberfläche und verwendet ausschließlich servergelieferte Aktionsfähigkeiten; die vollständige Verwaltungsübersicht folgt in Ticket 06.
- [ ] Service-, PostgreSQL- und Frontendtests decken sämtliche Ämter, Richtungen, Sichtbarkeiten, Vasallenschaft, atomare Annahme und Konkurrenzfälle ab.

## Answer

Implementiert in 63a399af088fd4c5b12a966352c6247fab43343a; integriert als 96905e949f41d71199f6f4547680699610337412.
