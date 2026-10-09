# 07: Allianzweiter Reset-Einstieg

**What to build:** Eine idempotente interne Operation „alle Allianzdaten bereinigen“ für einen künftigen Spielreset. Sie entfernt Allianzen, Parteien, Beziehungen, öffentliche und interne Chroniken, Benachrichtigungsabsichten und alle Bannerassets (auch unreferenzierte) und informiert den Bereinigungs-Port. Es gibt keinen Endpunkt; ein Aufrufer bleibt Integrationspunkt.

**Blocked by:** 02, 06

**Status:** ready-for-agent

- [ ] Zweimaliger Aufruf und abgebrochener, wiederholter Reset enden im selben sauberen Zustand
- [ ] Nach dem Reset zeigen keine Rechte, Zugänge oder Zuordnungen auf neu vergebene IDs (Postgres-Test mit neuer Allianz)
- [ ] Unreferenzierte Bannerdateien werden entfernt
- [ ] Bereinigungs-Port erhält das Reset-Ereignis
