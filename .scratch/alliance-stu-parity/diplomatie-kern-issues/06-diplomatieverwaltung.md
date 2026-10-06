# 06: Diplomatieverwaltung

**What to build:** Präsidenten und Diplomaten erhalten eine vollständige Diplomatieverwaltung, in der sie aktive Beziehungen, gesendete und empfangene Vorschläge sowie ausstehende Änderungen überblicken und ausschließlich die vom Server erlaubten Aktionen ausführen können.

**Blocked by:** 02 (Krieg erklären), 03 (Abkommen vorschlagen und beantworten), 04 (Frieden und Beziehungswechsel), 05 (Beziehungsfreigaben und Vertragswerk aushandeln)

**Status:** resolved

- [ ] Die Verwaltungsantwort liefert aktive Beziehungen, den gegebenenfalls daneben bestehenden Beziehungsvorschlag und die ausstehende Änderung mit klarer Sender-/Empfängerrichtung.
- [ ] Für jedes Objekt liefert der Server konkrete Fähigkeiten für Anlegen, Krieg erklären, Frieden anbieten, annehmen, ablehnen, zurückziehen, ändern und beenden.
- [ ] Präsident und Diplomat sehen den Einstieg in die Diplomatieverwaltung; Vize, Mitglieder ohne Amt, Außenstehende und allianzlose Spieler erhalten weder Einstieg noch Verwaltungsdaten.
- [ ] Die Zielauswahl enthält ausschließlich andere Allianzen derselben Fraktion und verhindert Selbstbeziehungen.
- [ ] Formulare bieten nur zum gewählten Beziehungstyp passende Beziehungsfreigaben an und erklären, dass deren Spielwirkungen erst mit einer späteren Fähigkeit aktiviert werden.
- [ ] Die Verwaltung zeigt aktive Beziehung und ausstehenden Typwechsel getrennt, sodass eindeutig bleibt, welcher Zustand derzeit gilt.
- [ ] Gesendete Vorschläge bieten Zurückziehen, empfangene Vorschläge Annehmen und Ablehnen; die Oberfläche rekonstruiert diese Rechte nicht aus Amt oder Richtung.
- [ ] Vertragsentwürfe sind nur innerhalb der berechtigten Verwaltungsansicht sichtbar und werden mit dem vorhandenen sicheren BBCode dargestellt.
- [ ] Während einer Mutation sind betroffene Aktionen deaktiviert; nach Erfolg wird der autoritative Serverzustand neu geladen, bei Fehler bleibt die Ansicht bedienbar und zeigt eine verständliche Meldung.
- [ ] Direkte Requests bleiben unabhängig von der UI für jedes Amt und jede Parteirichtung serverseitig autorisiert.
- [ ] Frontend- und Servicetests decken alle Rollen, Richtungen, parallele Aktiv-/Vorschlagsdarstellung, Formvalidierung, Fehler und Reload ab.

## Answer

Implementiert in fdad441a7c18ce635e5175cae6f5e2159db3bd28; integriert als c01014a4750974f36cfe88dafba3ccb13853fe40.
