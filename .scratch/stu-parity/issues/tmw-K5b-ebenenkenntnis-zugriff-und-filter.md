# Ebenenkenntnis: Zugriff und Datenbankfilter

**Status:** ready-for-human
**Priority:** P2
**Size:** S
**Blocked by:** tmw-K5a

## Ziel

Spieler können Karten- und Datenbankdaten nur für bekannte Ebenen abrufen. Administratoren und Karteneditoren behalten vollständigen Zugriff.

## STU-Quellen

- `src/Module/Starmap/View/ShowSection/*` (`hasSeen`, unbekannt → Zugriff verweigert)
- `src/Module/Starmap/View/ShowUserStarmap{Data,Image,Realtime}/*`
- `src/Orm/Repository/LayerRepository.php#getKnownByUser`
- `src/Module/Database/View/Category/*`

## SWU-Pfade

- `apps/backend/src/modules/starmap/starmap.controller.ts`, `starmap.service.ts`, `starmap-query.service.ts`
- `apps/backend/src/modules/database/`
- `apps/frontend/src/pages/starmap.tsx`, `apps/frontend/src/pages/database.tsx`

## Akzeptanzkriterien

- [ ] `GET starmap/layers` liefert Spielern ausschließlich bekannte, nicht versteckte Ebenen; Administratoren und Karteneditoren sehen weiterhin alle für ihre Rolle vorgesehenen Ebenen.
- [ ] Alle spielerseitigen `layers/:layerId/*`-Endpunkte prüfen die Ebenenkenntnis zentral und antworten für eine unbekannte Ebene mit HTTP 403.
- [ ] Die Prüfung umfasst mindestens Felder, Sektoren, Systeme, Hyperraumrouten, Wurmlöcher und persönliche Erkundungsdaten; indirekte Systemzugriffe umgehen sie nicht.
- [ ] Datenbankfilter für Sternensysteme, Systemtypen und Planetentypen bieten nur bekannte Ebenen an und lehnen eine explizit unbekannte Ebenen-ID ab.
- [ ] Der Status `KNOWN` genügt für den Zugriff; `EXPLORED` ist keine zusätzliche Autorisierungsvoraussetzung.
- [ ] Frontend-Auswahlfelder zeigen nur die vom Backend gelieferten bekannten Ebenen.
- [ ] Backend-Tests decken jeden Endpunkttyp, HTTP 403 und Rollen-Bypass ab; Frontend-Tests decken die gefilterten Ebenenauswahlen ab.

## Entscheidung

SWU wendet die STU-`hasSeen`-Semantik konsistent an. Anders als gemischte STU-Datenbankansichten dürfen keine Karten- oder Datenbankpfade unbekannte Ebenen offenlegen.

## Comments

- 2026-10-30: Backend-Zugriffsschutz und Datenbank-Ebenenfilter wurden umgesetzt; fokussierte Tests (19/19) sowie alle Builds sind grün. Der verpflichtende Gesamt-Gate bleibt jedoch nach zwei Versuchen an drei fachfremden bestehenden Typecheck-Fehlern in `wreck-decay.service.spec.ts` und `tutorial.service.spec.ts` (TS2554, dokumentiert in sh-AP-23) rot. Produktcode wurde gemäß Abbruchregel verworfen. Bitte nach Behebung der Baseline erneut auf `ready-for-agent` setzen.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Backend-Konstruktor-Fixtures); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
- 2026-11-10: Auf Basis 699258b4 neu implementierter, lokal erhaltener K5b-Kandidat: zentrale Ebenenautorisierung für direkte und indirekte Kartenzugriffe, Datenbank-Ebenenfilter und backendgesteuerte Frontend-Auswahlen. KNOWN genügt, versteckte Ebenen bleiben für Spieler gesperrt; bestehende Admin-/MAP_EDITOR-Zugriffe und persönliche Systementdeckung/Kartographie bleiben erhalten. Frische Gates über direct-gate.py: Produktions-HTTP mit disposable PostgreSQL 16 und committed migrations (synchronize:false) 45/45 sowie Export-Kompatibilität 4/4; Backend-Units 1996/1996; fokussiertes Frontend 56/56; Lint, erzwungener Spec-Typecheck, reguläre Typechecks und Builds jeweils Exit 0. Pflicht-Gesamtfrontend jedoch Exit 1: 665/666 Tests grün, TutorialPadd.spec.tsx:34 erwartet tutorial-target, erhält false. Test und Komponente sind im Kandidaten unverändert; Ursache/Baseline-Reproduzierbarkeit nicht nachgewiesen. Keine Abschwächung, kein Skip, keine Ausnahme und kein blinder Wiederholungslauf. Akzeptanzcheckliste bleibt offen; ready-for-human markiert den blockierten Review-/Gate-Handoff, keine Fertigstellung. Direkte Logs/Receipts und Kandidatenidentität: .workmux/tmw-K5b-report-20261110.md. Keine Integration/kein Push; Übergabe an die ursprünglichen zwei Sol-Reviewer und serielle Integration.
