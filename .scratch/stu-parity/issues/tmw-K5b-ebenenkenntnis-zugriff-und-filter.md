# Ebenenkenntnis: Zugriff und Datenbankfilter

**Status:** resolved
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

- [x] `GET starmap/layers` liefert Spielern ausschließlich bekannte, nicht versteckte Ebenen; Administratoren und Karteneditoren sehen weiterhin alle für ihre Rolle vorgesehenen Ebenen.
- [x] Alle spielerseitigen `layers/:layerId/*`-Endpunkte prüfen die Ebenenkenntnis zentral und antworten für eine unbekannte Ebene mit HTTP 403.
- [x] Die Prüfung umfasst mindestens Felder, Sektoren, Systeme, Hyperraumrouten, Wurmlöcher und persönliche Erkundungsdaten; indirekte Systemzugriffe umgehen sie nicht.
- [x] Datenbankfilter für Sternensysteme, Systemtypen und Planetentypen bieten nur bekannte Ebenen an und lehnen eine explizit unbekannte Ebenen-ID ab.
- [x] Der Status `KNOWN` genügt für den Zugriff; `EXPLORED` ist keine zusätzliche Autorisierungsvoraussetzung.
- [x] Frontend-Auswahlfelder zeigen nur die vom Backend gelieferten bekannten Ebenen.
- [x] Backend-Tests decken jeden Endpunkttyp, HTTP 403 und Rollen-Bypass ab; Frontend-Tests decken die gefilterten Ebenenauswahlen ab.

## Entscheidung

SWU wendet die STU-`hasSeen`-Semantik konsistent an. Anders als gemischte STU-Datenbankansichten dürfen keine Karten- oder Datenbankpfade unbekannte Ebenen offenlegen.

## Comments

- 2026-10-30: Backend-Zugriffsschutz und Datenbank-Ebenenfilter wurden umgesetzt; fokussierte Tests (19/19) sowie alle Builds sind grün. Der verpflichtende Gesamt-Gate bleibt jedoch nach zwei Versuchen an drei fachfremden bestehenden Typecheck-Fehlern in `wreck-decay.service.spec.ts` und `tutorial.service.spec.ts` (TS2554, dokumentiert in sh-AP-23) rot. Produktcode wurde gemäß Abbruchregel verworfen. Bitte nach Behebung der Baseline erneut auf `ready-for-agent` setzen.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Backend-Konstruktor-Fixtures); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
- 2026-11-10: Auf Basis 699258b4 neu implementierter, lokal erhaltener K5b-Kandidat: zentrale Ebenenautorisierung für direkte und indirekte Kartenzugriffe, Datenbank-Ebenenfilter und backendgesteuerte Frontend-Auswahlen. KNOWN genügt, versteckte Ebenen bleiben für Spieler gesperrt; bestehende Admin-/MAP_EDITOR-Zugriffe und persönliche Systementdeckung/Kartographie bleiben erhalten. Frische Gates über direct-gate.py: Produktions-HTTP mit disposable PostgreSQL 16 und committed migrations (synchronize:false) 45/45 sowie Export-Kompatibilität 4/4; Backend-Units 1996/1996; fokussiertes Frontend 56/56; Lint, erzwungener Spec-Typecheck, reguläre Typechecks und Builds jeweils Exit 0. Pflicht-Gesamtfrontend jedoch Exit 1: 665/666 Tests grün, TutorialPadd.spec.tsx:34 erwartet tutorial-target, erhält false. Test und Komponente sind im Kandidaten unverändert; Ursache/Baseline-Reproduzierbarkeit nicht nachgewiesen. Keine Abschwächung, kein Skip, keine Ausnahme und kein blinder Wiederholungslauf. Akzeptanzcheckliste bleibt offen; ready-for-human markiert den blockierten Review-/Gate-Handoff, keine Fertigstellung. Direkte Logs/Receipts und Kandidatenidentität: .workmux/tmw-K5b-report-20261110.md. Keine Integration/kein Push; Übergabe an die ursprünglichen zwei Sol-Reviewer und serielle Integration.
- 2026-11-10: Koordinator-Korrektur zum vorigen Handoff: Ein technischer Testfehler ist keine Entscheidung für menschliche Implementierung. Status wieder ready-for-agent; Akzeptanzcheckliste weiterhin offen. Kandidat b32bc992bcdc2087b30a75362c01c1061760b42d bleibt nicht akzeptiert/nicht integriert. Der ursprüngliche Gesamtfrontend-Fehler und alle historischen Kommentare bleiben erhalten. Derselbe K5b-Worker untersucht ausschließlich TutorialPadd.spec.tsx:34 und relevante Test-Synchronisation/Isolation; schmale Reparaturen nur bei nachgewiesenem Race/Contamination, keine Ausnahme. Neue direkte Evidenz wird separat in .workmux/tmw-K5b-correction-report-20261110.md dokumentiert; ursprünglicher Bericht bleibt unverändert.
- 2026-11-10: Schmale K5b-Korrektur für die ursprünglichen Spec-/Standards-Reviewer: PlanetSurfacesController war ein zusätzlicher indirekter Kartenpfad ohne Ebenenprüfung. Produktions-AppModule-HTTP mit befüllten Planeten/Systemrelationen und Orbit-/Oberflächen-/Untergrundfeldern reproduziert unbekannt/versteckt mit 200 statt 403; zentrale CelestialObject→System→Layer-Auflösung im LayerAccessService/Guard behebt dies, KNOWN und Admin/MAP_EDITOR bleiben zugelassen. Alle ursprünglichen 45 Fälle plus 6 neue Fälle bestehen (51/51), mit Export-Kompatibilität final 55/55. Neue Typkatalog-/Ebenenauswahl-DTOs liegen in packages/shared und werden durch Backend-Rückgabetypen/Frontend-API verwendet; nur der neue Selektor nutzt jetzt text-xs. Tutorial-Fehler separat durch kontrollierte Commit-/Beobachtungszeit reproduziert: Überschrift ist vor dem passiven Highlight-Effekt sichtbar. Ausschließlich die bestehende identische tutorial-target=true-Assertion wird nun mit begrenztem waitFor abgewartet; keine Produktänderung/Abschwächung. Diagnoseproben entfernt. Frische finale Gates: Gesamtfrontend 666/666, Backend-Units 1996/1996, fokussiertes Frontend 59/59; gezieltes HTTP, erzwungene Backend-/Frontend-Spec-Typen, Backend-/Frontend-/Shared-Typechecks, Lint und Builds Exit 0. Ursprünglicher roter Gesamtfrontend-Gate bleibt historische Fehlerevidenz, keine Baseline-Ausnahme. Status ready-for-agent und alle 7 Kriterien ungeprüft bis zur unabhängigen Abnahme; keine Integration/kein Push/keine kombinierte UI-1b-Abnahme. Separater Korrekturbericht enthält genaue Kandidatenidentität, Hashes und direkte Logs/Receipts. Stopp für schmale Wiederprüfung durch die ursprünglichen zwei Achsen.
- 2026-11-10: Autorisierte Abnahmebuchung nach tatsächlicher Lektüre beider unabhängigen finalen K5b-Berichte: Spec PASS mit 0 Findings und Standards PASS0, jeweils exakt 814f2b45856f69c98e8d8fe816b444526b363ae2 / Tree 878d6773fbf93969382905502904bca4d29354da; frühere Planet-/Shared-/Typografie-Findings und separater Tutorial-Ausführungshold geschlossen. Status resolved, alle 7 Kriterien bestätigt; sämtliche früheren Kommentare einschließlich roter Gates und falschem Human-Handoff bleiben unverändert. Im bestehenden Worker wurde ausschließlich der unabhängig akzeptierte, bereits in MAIN integrierte UI-1b-Stand 88dfa9ca27685da165859d304880a7db557e4a77 per gewöhnlichem nicht umschreibendem Zwei-Eltern-Merge kombiniert: c652681125ef3deb7ca89cbb514e4d0f166da800 / Tree 67094f93b4b7e237a6c47f529113c470d9d23310. Die disjunkte Union umfasst 27 Pfade; alle 25 Code-/Testdateien behalten exakt die akzeptierten Bytes. Frische kombinierte direct-gate.py-Gates jeweils Exit 0: fokussiertes Frontend 5 Dateien / 75 Tests, Gesamtfrontend 93 Dateien / 670 Tests ohne Skips, erzwungene Backend-/Frontend-Spec-Typen mit --force, Shared-Build, Frontend-Lint (0 Fehler / 110 Warnungen) und Frontend-Build. Akzeptierte Backend-Runtime-Evidenz (214 Suites / 1996 Tests / 1 Snapshot; gezieltes HTTP 55 = 51 Produktion + 4 Kompatibilität) wird ausschließlich über unveränderte Quellen übertragen, nicht als frische kombinierte Backend-/PostgreSQL-Ausführung bezeichnet. Neuer Bericht .workmux/tmw-K5b-combined-candidate-report-20261110.md dokumentiert Commit-/Tree-/Union-Identität und direkte Evidenz. MAIN bleibt unverändert auf 88dfa9ca; kein MAIN-Merge/Push. Kombinierter Kandidat wartet weiterhin auf die schmale Integration-Delta-Prüfung der ursprünglichen zwei Sol-Achsen und anschließend autorisiertes MAIN-Fast-forward durch den Koordinator.
