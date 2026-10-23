# Geschützten Systemdetailvertrag wiederherstellen

**Status:** resolved
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

Der persönlich entdeckte und erfolgreich kartographierte Datenbank-Systemeintrag erhält wieder seinen vollständigen nicht-taktischen Detailvertrag. Aktuelle Koloniebelegung, Sternkartenlink, Schnellnachricht und zugängliche Kolonie-Scans werden ausschließlich serverseitig berechtigt bereitgestellt; die statische Rasteransicht entspricht den bestehenden Asset- und Informationskonventionen.

## STU-Quellen

- keine neue Referenzanalyse; Restlücke aus `.scratch/stu-systemdatenbank-und-kolonie-scans/issues/05-*.md`, `06-*.md` und `.scratch/grafischer-systemeintrag-nach-astrometrie/issues/02-*.md`, `03-*.md`

## SWU-Pfade

- `apps/backend/src/modules/database/database.service.ts`
- `apps/backend/src/modules/spacecraft/colony-scan-projection.service.ts`
- `apps/frontend/src/pages/database.tsx`
- `apps/frontend/src/components/database/SystemRasterMap.tsx`
- `apps/frontend/src/components/database/ColonyScans.tsx`

## Klarstellung

„Sternkartenlink“ meint die strategische Karte an den Außenkoordinaten. Der Systemdetail-Kontext bleibt eine nicht-taktische Datenbankansicht; Kartenposition und Detailkontext werden nicht vermischt.

## Akzeptanzkriterien

- [x] Der berechtigte Detailvertrag liefert aktuelle Koloniebelegung und die neuesten zugänglichen eigenen bzw. aktuellen Allianzscans, ohne dynamische Daten im gesperrten Zustand preiszugeben.
- [x] Der Systemeintrag verlinkt mit den Außenkoordinaten zur Sternenkarte.
- [x] `canMessageOwner` wird serverseitig ausschließlich aus aktueller eigener Koloniepräsenz und aktuellem fremdem Kolonieeigentum abgeleitet; Snapshotbesitzer werden nie vorbefüllt.
- [x] Scanzeilen kennzeichnen aktuellen gegenüber historischem Zustand, öffnen die gespeicherte Oberfläche nicht-taktisch und erlauben Löschen nur für eigene Scans mit anschließendem Reload.
- [x] Die anfängliche Systemzusammenfassung zeigt die Rastergröße.
- [x] Asteroidenfelder verwenden ein bestehendes Spielasset bzw. eine visuelle Asteroidengruppe ohne Mengenbadge statt Emoji.
- [x] Backend- und Frontendtests decken die wiederhergestellten Verträge ab.

## Comments

Aus dem Audit `tmw-D0`: Die Funktionen waren teilweise in `fc37352`/`64c0531` vorhanden und wurden durch `b496498`/`d118865` aus dem aktiven Detailpfad entfernt.

Wiederhergestellt in `database.service.ts` und `database.tsx`: berechtigte Live-Kolonien, neueste zugängliche Scans, serverseitige Nachrichtenfreigabe, Sternkartenlink, Rastergröße, nicht-taktischer Oberflächendialog und eigene Scanlöschung mit Reload. `SystemRasterMap.tsx` verwendet für Asteroiden das vorhandene Spielasset. Backend- und Frontendtests decken Vertrag und Darstellung ab; keine offenen Folgepunkte.
