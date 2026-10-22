# 01: Geschützte Kartenfreigabe für den Systemeintrag

**What to build:** Ein persönlich entdecktes Sternensystem liefert seine vollständige statische Kartographie nur nach erfolgreicher Finalisierung der Astrometrie. Für unvollständige, fehlgeschlagene oder ungültig gewordene Kartographie erscheint ein nicht enthüllender Verfügbarkeitsstatus statt Systemstruktur oder dynamischer Daten.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Der bestehende geschützte Systemeintrag unterscheidet zwischen persönlicher Systementdeckung und erfolgreich abgeschlossener Astrometrie des aktuell angemeldeten Spielers.
- [x] Nur ein Kartographieplan mit erfolgreicher Finalisierung schaltet die statische Systemstruktur für die grafische Darstellung frei.
- [x] Fehlende, laufende, unvollständige oder ungültig gewordene Kartographie liefert einen verständlichen, nicht enthüllenden Verfügbarkeitsstatus ohne Felder, Himmelskörper, Kolonien, Scans, Besitz- oder andere dynamische Informationen.
- [ ] Die Zugriffsentscheidung und das nicht enthüllende Verhalten sind über den bestehenden Systemeintrag verhaltensorientiert getestet.

## Comments

Audit 2026-10-22: Die Laufzeitimplementierung erfüllt die Freigabe- und Nichtoffenlegungsregeln. `b496498` trennt persönliche Systementdeckung von `DONE`/`SUCCESS`; `database.service.ts` und `database.tsx` liefern für fehlende, laufende, unvollständige oder invalidierte Pläne ausschließlich `ASTROMETRY_REQUIRED`. Service- und Frontendtests (`database-system-detail.service.spec.ts`, `database.spec.tsx`) bestehen. Offen bleibt ein authentifizierter Controller-/HTTP-Verhaltenstest für `GET /api/database/systems/:id` mit expliziten Nichtoffenlegungsassertions. Restarbeit: `tmw-D0b`.
