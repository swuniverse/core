# Nebelvorschau mit tatsächlichem Himmelskörper-Schema

Type: task
Status: resolved
Label: ready-for-agent

## Acceptance criteria

- [x] Ursache anhand der konkreten PostgreSQL-Fehlermeldung ermittelt.
- [x] Vorschau nutzt die persistierte CelestialObject-Spalte systemId und normalisiert die interne Referenz.
- [x] Isoliertes Testschema korrigiert; zusätzlicher Regressionstest mit migriertem Anwendungsschema.
- [x] Galaxie-, System- und kombinierte Vorschau auf Bestandskarte funktionieren schreibfrei.
- [x] Laufendes Backend mit korrigiertem Build aktualisiert.

## Answer

SQL-Spaltenfehler in meiner ursprünglichen Umsetzung: `CelestialObject.systemId` wurde fälschlich als `starSystemId` abgefragt. Auch das ursprünglich handgeschriebene Testschema war falsch. Der Join und die Projektion sind korrigiert; die sieben Postgres-Tests umfassen nun das tatsächliche migrierte Schema. Gegen die vorhandene Ebene 13 liefern alle drei Vorschauziele Ergebnisse (171 / 1.595 / 1.766 Feldvorschläge). Keine Bestandsdaten verändert.

## Comments

2026-11-25: Hauptagent (Sitzungsmodell, kein Modellwechsel) hat DB-Abfrage und Schematests direkt korrigiert und geprüft. App-Typprüfung, gezielter Postgres-Lauf und Diffreview erfolgreich. Backend neu gestartet; korrigierter Join im laufenden Build, HTTP 200 auf Game-Status. Separate bekannte Allianzrollen-Schemaabweichung dokumentiert, ohne fremde Rollen-Migration zurückzusetzen. [Nachweise](../verification.md). Commit-Subject: `fix(starmap): query celestial objects using their persisted system column`.
