# Systemdetail-Verhaltenstests und Kartographiefragen schließen

**Status:** ready-for-agent
**Priority:** P1
**Size:** M
**Blocked by:** tmw-D0a

## Ziel

Die geschützte Systemdetailansicht wird über die HTTP-, Service- und UI-Grenzen vollständig verhaltensorientiert abgesichert. Zwei vom alten Ein-Tick-Astrometrievertrag übrig gebliebene Fachfragen zur messpunktbasierten Kartographie werden vor der Umsetzung entschieden.

## STU-Quellen

- keine neue Referenzanalyse; Restlücke aus `.scratch/stu-systemdatenbank-und-kolonie-scans/issues/03-*.md`, `05-*.md`, `06-*.md` und `.scratch/grafischer-systemeintrag-nach-astrometrie/issues/01-*.md` bis `03-*.md`

## SWU-Pfade

- `apps/backend/src/modules/database/database.controller.ts`
- `apps/backend/src/modules/database/database-system-detail.service.spec.ts`
- `apps/backend/src/modules/spacecraft/cartography-plan.service.ts`
- `apps/frontend/src/pages/database.spec.tsx`

## Akzeptanzkriterien

- [ ] Ein authentifizierter Controller-/HTTP-Test für `GET /api/database/systems/:id` deckt unbekannte, entdeckte, laufend kartographierte, invalidierte und erfolgreich kartographierte Zustände ab und prüft explizit, dass gesperrte Antworten keine Struktur- oder Dynamikdaten serialisieren.
- [ ] Tests prüfen das vollständige `maxX × maxY`-Raster, beide Achsen, feste lesbare Zellgrößen und Scrollbarkeit in beide Richtungen.
- [ ] Tests prüfen repräsentative Assets, die Asteroidengruppe ohne Badge und den vollständigen Ausschluss taktischer bzw. dynamischer Inhalte.
- [ ] Seitentests prüfen anfängliche Zusammenfassung inklusive Rastergröße, Auswahlaktualisierung, gesperrten Rückweg und responsive Anordnung als sichtbares Verhalten.
- [ ] Integrations- und UI-Tests prüfen aktuelle gegenüber Snapshotdaten, Besitzerwechsel, Aufgabe, Allianzbeitritt/-austritt, Provenienz sowie eigene und fremde Löschversuche.
- [ ] Positive und negative Schnellnachrichtenfälle sind getestet.
- [ ] Die Fachentscheidungen zu Crew-XP bei erfolgreicher Finalisierung und Fortsetzung eines `MEASURED`-Plans durch ein anderes eigenes Schiff sind dokumentiert und getestet.

## Entscheidung

Crew-XP ist fachlich ausschließlich Eigentum von sc-WP-CREW-2 und wird hier weder definiert noch dupliziert. Ein `MEASURED`-Plan darf nach abgebrochener Finalisierung durch ein anderes eigenes geeignetes Schiff fortgesetzt werden; die Finalisierung benötigt dabei erneut 15 EPS.

## Comments

Aus dem Audit `tmw-D0`: Der alte schiffsgebundene Ein-Tick-Auftrag ist durch ADR-0003 obsolet; wiederhergestellt werden soll nicht das alte Modell, sondern nur explizit entschiedene, weiterhin gewünschte Fachwirkung und belastbare Vertragsabdeckung.
