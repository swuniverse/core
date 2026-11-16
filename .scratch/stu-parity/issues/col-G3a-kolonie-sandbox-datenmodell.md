# Kolonie-Sandbox: Datenmodell und Kopie der Oberfläche

**Status:** resolved
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

STU bietet eine Kolonie-Sandbox: Der Spieler legt eine Planungskopie einer Kolonie an und kann darin Gebäude bauen, abreißen und schalten, ohne Ressourcen zu verbrauchen, um Produktion und Energie zu planen. SWU hat nichts davon. Dieses Teilpaket legt Datenmodell, Erzeugung (Kopie der Felder) und eine Sandbox-Liste an; Bau (col-G3b) und Produktionsvorschau (col-G3c) folgen.

## STU-Quellen

- `src/Module/Colony/Action/Sandbox/CreateSandbox/`
- `src/Module/Colony/View/Sandbox/`
- `src/html/colony/sandbox/*.twig`
- `src/Orm/Entity/ColonySandbox.php`, `PlanetFieldHost` (polymorph)

## SWU-Pfade

- `apps/backend/src/modules/colony/entities/` (neue Entities, z. B. `colony-sandbox.entity.ts`, Sandbox-Felder)
- `apps/backend/src/modules/colony/colony.controller.ts`, neuer `colony-sandbox.service.ts`
- `apps/frontend/src/pages/colonies/ColoniesPage.tsx`, `components/ColonyMap.tsx` (Wiederverwendung im Sandbox-Modus)

## Akzeptanzkriterien

- [x] Ein Spieler kann aus einer eigenen Kolonie eine benannte Sandbox erzeugen (Kopie aller Felder inkl. Gebäude, Aktivstatus, Feldtyp), auflisten, umbenennen und löschen; Höchstzahl je Spieler 3 (konfigurierbar), darüber Ablehnung mit Meldung.
- [x] Die Sandbox ist in der Kolonieseite über einen Umschalter erreichbar und zeigt die kopierte Karte schreibgeschützt.
- [x] Sandboxen sind für andere Spieler unsichtbar und beeinflussen weder Tick noch Ranglisten.
- [x] Backend- und Frontend-Tests.

## Answer

Eigenständige Sandbox-Entität mit JSONB-Snapshot aller Oberflächen-, Orbit- und Untergrundfelder samt Gebäude-, Aktivitäts-, Bau- und Terraformingzustand. Eigentümergeschützte API zum Erzeugen, Auflisten, Lesen, Umbenennen und Löschen; `COLONY_SANDBOX_LIMIT` begrenzt die Anzahl standardmäßig auf 3. Ein transaktionaler Spieler-Lock sichert das Limit auch bei parallelen Erzeugungen aus verschiedenen Kolonien.

Der Umschalter auf der Kolonieseite öffnet die Sandbox-Liste und die wiederverwendete, schreibgeschützte Koloniekarte. Die Kopie bleibt beim ursprünglichen Ersteller und überlebt das Löschen der Quellkolonie; Kontolöschung entfernt sie. Untergrundwissen wird bei der Ausgabe berücksichtigt. Eigene Tabelle statt Live-Kolonie/Felder: keine Tick-, Ressourcen- oder Ranglistenwirkung. Bau und Produktionsvorschau folgen in col-G3b/c.

## Entscheidung

Vorgabe: Variante (a), vollständig (col-G3a bis col-G3c). Höchstzahl Sandboxen je Spieler: Der Product Owner hat keinen Wert genannt; es gilt der Vorschlag aus der Empfehlung, **3**, als Konfigurationswert (änderbar ohne Codeänderung).

## Comments


- 2026-10-21 Product Owner: Option a – Die Kolonie-Sandbox ist gewünscht und wird vollständig umgesetzt (col-G3a bis col-G3c), mit niedriger Priorität.
- 2026-10-28 Blocker: Die vorgeschriebenen Prüfungen bleiben nach zwei ernsthaften Versuchen rot. `frontend:typecheck` scheitert bereits außerhalb dieses Issues an `apps/frontend/src/pages/database.tsx:1015` (`"REBEL" | "EMPIRE"` ist nicht `Faction`) und erzeugt danach zahlreiche TS6305-Folgefehler; der vollständige Frontend-Testlauf hat zusätzlich einen bestehenden Fehler in `src/pages/research.spec.tsx`. Die Sandbox-spezifischen Backend- und Frontend-Tests sowie `npx nx run-many --targets=build` waren grün. Bitte zuerst den Branch-Baseline-Fehler beheben oder bestätigen, dass bekannte unabhängige Fehler für diesen Durchlauf ausgenommen werden dürfen.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Frontend-Faction-/TS6305-Gate und Research-Test); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
- 2026-11-16: Vollständig umgesetzt und geprüft. `nx affected -t lint typecheck test --base=HEAD --parallel=2` grün: Backend 228 Suites / 2161 Tests, Frontend 109 Dateien / 781 Tests; inklusive 10 Sandbox-Service-Tests. Erneuter gezielter Frontend-Lauf: 17 Tests grün. PostgreSQL-Integration mit echten Migrationen: 5 Tests grün (unabhängige Kopie, paralleles Limit, Besitzerrechte/Kontolöschung, Quellkolonie-Löschung, Migration down/up). `nx run-many --targets=build` grün. Produktionsdatenbank wurde nicht verändert.
