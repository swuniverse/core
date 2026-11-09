# Bewegung: veraltete Schreibvorgänge verhindern

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K7a2a

## Ziel

Gewöhnliche Bewegung darf nach einem konkurrierenden Commit nicht aus veraltetem Ausgangszustand Positionen oder Ressourcen überschreiben oder Folgen eines abgelehnten Schritts auslösen. Das Issue nutzt den Flottenvertrag aus `tmw-K7a2a` und ändert weder die bestehende Flugpolitik noch Ressourcentarife.

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`navigate`, `flyGalaxy` und direkte Speicherpfade betroffener Flottenmitglieder)
- `apps/backend/src/modules/spacecraft/spacecraft-destruction.service.ts` (`saveUnlessDestroyed` und bestehende Behandlung fehlender oder zerstörter Schiffe und Kampfüberlebender)
- Bestehende PostgreSQL-Integrationsinfrastruktur unter `apps/backend/src/testing/integration/`

## Akzeptanzkriterien

- [x] Ursprünglicher autoritativer Bewegungszustand wird unter Sperre, über einen gleichwertigen CAS-Vertrag oder in einem unterstützten gemeinsamen Transaktionskontext geprüft. Ausgangsort, Zulässigkeit, gelesene beziehungsweise geschriebene Ressourcen und Laufzeitsystemzustände sowie relevante Mitgliedschaftsannahmen nach `tmw-K7a2a` sind geschützt; reine Zerstörungsprüfung genügt nicht.
- [x] `navigate` und `flyGalaxy` sowie ihre betroffenen direkten Mitgliederspeicherpfade nehmen am Schutz teil, nicht nur `saveUnlessDestroyed`: laut unabhängiger Review `spacecraft.service.ts:2082-2084`, `:2372-2380`, `:2523-2527` und `:2634-2640`. Die konkreten Aufrufstellen sind bei Umsetzung am aktuellen Stand zu verifizieren.
- [x] Veraltete Schritte werden von fehlenden oder zerstörten Schiffen und der bestehenden Kampfüberlebenden-Semantik unterscheidbar behandelt. Ein wegen Veralterung abgelehnter Schritt erzeugt keine Signaturen, Erkundung oder Feldfolgen; auch beim veralteten Leiter laufen diese nicht weiter.
- [x] Gültige gewöhnliche Bewegung und bestehende partielle Flottenpolitik bleiben erhalten. Keine Änderung des Ressourcentarifs, kein Rewrite sämtlicher Schiffs-Writer und keine Wurmlochimplementierung.
- [x] Ein dauerhaftes Regressionstest-Szenario mit echter disposable PostgreSQL-Datenbank und kontrollierter Barriere prüft den produktiven veralteten Speicherer gegen eine zwischenzeitlich bestätigte Verlagerung; der neu bestätigte Zustand wird nicht überschrieben.
- [x] Ein Regressionstest über einen tatsächlich betroffenen Bewegungsaufrufer prüft, dass ein abgelehnter veralteter Schritt keine Signaturen, Erkundung oder Effekte erzeugt. Weitere Tests decken einen Konflikt nur bei Ressourcen/Laufzeitsystemen sowie gültige nicht veraltete Bewegung und Zerstörungsbehandlung ab.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-11-09: Der vorliegende disposable-PostgreSQL-Probe verwendete den echten öffentlichen `saveUnlessDestroyed`-Speicherer mit einem alten bewegungsartigen Snapshot, während eine separate gesperrte Verlagerung simuliert wurde. Nach dem beobachteten Warten und deren Commit überschrieb der produktive Speicherer Ort, EPS und Impulszustand; die Regression war rot. Dies ist kein vollständiger `navigate`- oder Wurmloch-End-to-End-Test und kein Implementierungs- oder Abnahmenachweis.
