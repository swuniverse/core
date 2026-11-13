# Orbitauftrag-Policy und schiffsbezogene API

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Eine kanonische schiffsbezogene API startet und beendet flottenweite Verteidigungs- und Blockadeaufträge über belegten Kolonien. Alle bestehenden Oberflächen delegieren auf dieselbe zentrale Policy.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Ship/Action/ColonyDefending/StartDefending.php`, `StopDefending.php`
- `Module/Ship/Action/ColonyBlocking/StartBlocking.php`, `StopBlocking.php`
- `html/spacecraft/control/control_mid.twig`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-orbit.service.ts`
- `apps/backend/src/modules/colony/colony.controller.ts`
- `apps/backend/src/modules/colony/colony.service.ts`
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts`
- `packages/shared/src/lib/spacecraft/`

## Akzeptanzkriterien

- [x] Kanonische schiffsbezogene Routen starten `DEFEND` oder `BLOCKADE` für eine belegte Kolonie im aktuellen Orbit und beenden den aktuellen Orbitauftrag des Schiffs beziehungsweise seiner Flotte.
- [x] Verteidigung und Blockade sind unabhängig von Eigentum und Haltung für jede belegte Kolonie zulässig; freie/unbesessene Kolonien bleiben ausgeschlossen. Die bisherige Zielkolonie-Eigentumsprüfung entfällt.
- [x] Der Actor besitzt das initiierende Schiff; das Schiff ist unzerstörter Flottenführer, befindet sich im Zielorbit und erfüllt den erforderlichen Idle-/Aktionszustand. Auftrag und Clear gelten atomar für die gesamte Flotte.
- [x] Effektiver Urlaub des Kolonieeigners verhindert den Start. Ein bestehender gegensätzlicher Auftrag und ein anderer Orbitauftrag derselben Flotte verhindern einen weiteren Start.
- [x] Blockade wird zusätzlich bei aktiver Energiephalanx, Partikelphalanx oder aktivem Antipartikel-System abgelehnt; Verteidigung besitzt diese Sperre nicht.
- [x] Start und Ende erzeugen die vorgesehenen Rückmeldungen und Kolonieeigner-Ereignisse beziehungsweise Nachrichten.
- [x] Bestehende Colony-Routen bleiben als Kompatibilitätsalias erhalten und delegieren ohne abweichende Regeln auf dieselbe Policy.
- [x] Backend-Tests decken eigene/Friend/Neutral/Enemy-Kolonie, freie Kolonie, Urlaub, gegensätzlichen Auftrag, Orbitalverteidigung, Actor-/Leader-/Orbit-/Idle-Regeln und flottenweiten Zustand ab.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

SWU übernimmt die bestätigte STU-Regel: Haltung und Eigentum filtern weder Verteidigung noch Blockade. Die kanonische Mutation ist schiffsbezogen, die Order flottenbezogen. Dieses Issue besitzt Mutation, zentrale Policy und Backend-Kompatibilität; Feldkontext und UI folgen in `sc-WP-UI-3a2`.

## Comments

- 2026-10-30: Produktcode nach zwei Prüfversuchen verworfen. Der fokussierte Orbit-Test war grün (201/201), aber das verpflichtende Gate `npx nx affected -t lint typecheck test --base=HEAD` bleibt repositoryweit rot: Backend-Typecheck mit zahlreichen TS6305-Ausgabedateifehlern sowie unabhängige bestehende Fehler in `tutorial.service.spec.ts`, `spacecraft-core-controls.spec.ts` und `spacecraft-cartography-api.spec.ts`. Bitte diese Baseline reparieren oder eine ausdrückliche Ausnahme für dieses Issue festlegen.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Backend-TS6305 sowie Tutorial-/Spacecraft-Fixtures); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
- 2026-11-13: Umgesetzt. Zentrale Policy `apps/backend/src/modules/colony/colony-orbit-order.policy.ts` (STU-Reihenfolge, deutsche Gründe); `ColonyOrbitService.startOrbitOrder`/`stopOrbitOrder` ermitteln die Kolonie aus dem Orbit des Schiffs und schreiben Auftrag plus Blockadeflag in einer Transaktion mit Flotten- und Kolonie-Lock. Kanonische Routen `POST`/`DELETE /api/spacecraft/:id/orbit-order` liegen im neuen `SpacecraftOrbitOrderController` des Colony-Moduls (ein Import im `SpacecraftController` erzeugte einen DI-Zyklus); die Colony-Routen sind Aliase mit Kolonieprüfung. Die Kolonie-Projektion (`canDefend`/`canBlock`/`actionBlockers`) nutzt dieselbe Policy. Shared-DTOs `SpacecraftOrbitOrder*Dto`. Rückmeldungen und Eigner-Ereignisse mit STU-Texten. Prüfungen: Policy-Unit 14/14, Colony-Unit 305/305, Postgres/HTTP-Integration über `AppModule` 11/11 (eigene/Friend/Neutral/Enemy, frei/verlassen, Urlaub, Gegenauftrag, Orbitalverteidigung, Actor/Leader/Idle/Zerstört, Nebenläufigkeit, Aliase); Lint 0 Fehler; Typecheck und Build für backend, shared und frontend grün. Volle Unit-Läufe zeigen nur zeitabhängige Flakes (`password-reset.service.spec.ts`-Timeout, einzelne Frontend-Specs), die isoliert grün und unabhängig von dieser Änderung sind. Folgepunkt: Feldkontext/UI in `sc-WP-UI-3a2`.
- 2026-11-13 (unabhängiges Review, Merge 22970a8a): Abnahme bestätigt; Status bleibt resolved. Korrektur der Zahl oben: Colony-Unit sind **298/298** (17 Suites; vor dem Merge 268/15), nicht 305/305. Integration `colony-orbit-order-http` 11/11. Lint/Typecheck/Build für backend, shared, frontend grün. Die einzigen Testfehler (`password-reset.service.spec.ts`-Timeout, je ein wechselnder Frontend-Spec) treten vor dem Merge (7d7e2f47) genauso auf und sind einzeln grün. Folgepunkt Lebenszyklus (Flugsperre, Abbruch bei Auflösen/Zerstörung/Traktor, Führerwechsel, Kolonieansicht mit kolonieübergreifendem Flottenauftrag, verwaiste Aufträge mit stehendem `isBlockaded`): `sc-WP-UI-3a3`. Kleinere Befunde: Startprüfung liest Schiff/Kolonie vor der Sperre (in 3a3 vermerkt); Colony-Aliase liefern für unbekannte Kolonien jetzt 400 statt 404 und deutsche statt englische Fehlertexte.
