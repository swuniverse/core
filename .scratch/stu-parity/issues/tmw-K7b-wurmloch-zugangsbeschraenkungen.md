# Wurmloch-Zugangsbeschränkungen

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K7a1, sc-WP-STAT-2

## Ziel

Wurmlöcher können für Spieler, Allianzen, Fraktionen oder einzelne Schiffe freigegeben oder gesperrt werden. Ein Verbot geht vor einer Erlaubnis, und geprüft wird über die zentrale Beziehungsauflösung (Integrationspunkt laut `alliance-stu-parity/map.md`). Offen ist, wer diese Regeln in SWU verwaltet.

## STU-Quellen

- `src/Module/Spacecraft/Action/AddWormholeRestriction/*`, `DeleteWormholeRestriction/*`, `View/ShowWormholeRestrictions/*`
- `src/Orm/Entity/WormholeRestriction.php`, `src/Component/Ship/Wormhole/WormholeEntryTypeEnum.php` (USER/ALLIANCE/FACTION/SHIP), `WormholeEntryModeEnum.php` (Erlauben/Verbieten)
- `src/Component/Ship/Wormhole/WormholeEntryPrivilegeUtility.php`
- In STU sind Wurmlocheingänge an Systemfelder gebunden. Die Verwaltung erfolgt über die Schiffsansicht am Eingang, zuständig ist der Betreiber der Station am Eingang.

## SWU-Pfade

- `WormholeAccessPolicy` aus tmw-K7a
- `apps/backend/src/modules/alliance/relationship-resolver.service.ts`, `.scratch/alliance-stu-parity/beziehungswirkungen-spec.md`
- `apps/backend/src/modules/starmap/entities/wormhole.entity.ts`, `starmap.controller.ts` (Admin-Endpunkte)
- Stationen: sc-WP-STAT-0 … sc-WP-STAT-3b

## Akzeptanzkriterien

- [x] Eine Entität „Wurmlochregel“ (Wurmloch, Zieltyp USER/ALLIANCE/FACTION/SHIP, Ziel-ID, Modus ALLOW/DENY) ist per Migration angelegt.
- [x] Die Policy-Implementierung gilt: Ohne Regeln ist alles erlaubt. Gibt es Regeln, gewinnt DENY vor ALLOW. Allianz und Fraktion werden über die zentrale Auflösung bzw. Mitgliedschaft geprüft, und Fehler führen zu einer geschlossenen Ablehnung.
- [x] Verwaltungs-UI und -API in der Stationsansicht (sc-WP-STAT-2): Nur der Betreiber einer Station auf dem Eingangsfeld darf Regeln listen, anlegen und löschen; andere Spieler erhalten 403.
- [x] Ein abgelehnter Einflug meldet „Du hast keine Berechtigung, in das Wurmloch einzufliegen“.
- [x] Backend-Tests für alle Zieltypen, die DENY-Priorität und die Betreiberrechte (Betreiber, Fremder, keine Station). Frontend-Test der Regelliste.

## Entscheidung

Vorgabe: Variante (b), wie STU. Der Betreiber einer Station auf dem Wurmloch-Eingangsfeld verwaltet die Regeln (über die Stationsansicht aus sc-WP-STAT-2). Keine Admin-Pflege als Spielelement; ohne Station am Eingang gibt es keine Regeln (alles erlaubt).

## Comments

- 2026-10-21 Product Owner: Option b – Wurmloch-Zugangsregeln verwaltet wie in STU der Betreiber einer Station auf dem Eingangsfeld; das Issue ist deshalb zusätzlich durch sc-WP-STAT-2 blockiert.
- 2026-11-09: Die Access-Policy wird im Backend-Kern tmw-K7a1 eingeführt; der Tracking-Split tmw-K7a ist kein Implementierungsnachweis.

### 2026-11-10 — K7b isolierter Implementierungskandidat

- Kandidatenstatus: funktional vollständig, unabhängige Standards-/Security- und Spec-Reviews ausstehend. Triage bleibt `ready-for-agent`; nicht resolved und keine Human-Implementierungsblockade.
- Basis: `4e2da9569b996d5a18cd428142a34ce8555e0853`, Branch `agent-tmw-k7b-fast`; ausschließlich K7b mit notwendigen Shared-Verträgen und Registrierungen.
- Migration `20261110180000` persistiert WormholeRestriction mit Ziel-/Modus-Constraints, eindeutigem Wurmloch/Ziel und Cascade. App-, Integrations- und beide Migration-Metadatenpfade registrieren die neue Entity.
- Authentifizierte GET/POST/DELETE-Endpunkte `/spacecraft/:stationId/wormhole-restrictions[/:restrictionId]` prüfen Betreiber und kanonisches Eingangsfeld serverseitig; Fremder, Schiff statt Station und Station ohne Eingang erhalten 403. POST nimmt keine Client-Betreiberidentität an; DELETE bleibt auf verwaltete Wurmlöcher begrenzt.
- Regeln werden in der echten Passage-Transaktion vor allen Fleet-/Traktor-Teilnehmern als Snapshot gelesen. DENY gewinnt; konfigurierte Regeln benötigen passende ALLOW; keine Regeln oder keine Station erlauben. Fraktion und aktuelle Mitgliedschaft stammen aus dem zentralen AllianceStore im Transaktionsmanager, nicht aus JWT oder lokaler Haltung. Fehler verweigern geschlossen mit `Du hast keine Berechtigung, in das Wurmloch einzufliegen.`. Keine neue Rollen-/Richtungssemantik.
- Produktions-Stationsdetail zeigt Regelliste, Anlage und Löschung mit Shared-DTOs, zugänglichen text-xs-Steuerelementen und `formatNumber`; 403 zeigt keine Verwaltungssteuerung.
- Meaningful RED vor GREEN: fehlender HTTP-GET (404 statt 200), reale konfigurierte Passage (201 statt 400), fehlende Stations-Regelliste, erfolgreiche Eingabe nicht geleert und Resolver-Fehler ohne Domänenmeldung. Frühe fehlgeschlagene Fixture-Typchecks und ein ungültiger Vitest-CLI-Aufruf sind als Fehler erhalten, nicht als RED-Nachweis umgedeutet.
- Finale unveränderte Inputs: Backend 215 Suites/2008 Tests/1 Snapshot; Frontend 94 Dateien/674 Tests; gezielte disposable PostgreSQL-16-Migrations-/HTTP-/Passagesuite 2 Suites/81 Tests. Alle bestanden, null übersprungene Tests. Lint, Anwendungstypen, erzwungene Spec-Typen und Build bestanden (alle tatsächlichen Prozess-Exits 0).
- Warnungen: Lint 110 Frontend-/1438 Backend-Warnungen bei null Fehlern; ts-jest isolatedModules-/pg-query-Deprecations und Build-CSS-/Chunkgrößenwarnungen. Kein Baseline-Ausnahmelabel und kein vollständiger PG-Lauf.
- Automatische Evidenzprüfung `verify-evidence-fast.py`: 7 finale GREEN-Receipts, tatsächliche numerische Exits 0, Loghashes/Sourcebytes/HEAD+Diff identisch, 24 Codepfade, 1.079 s am 2026-11-10T17:38:24Z. Dies ist keine unabhängige Code-/Securityprüfung.
- Lokale Evidenz: `.workmux/gates/k7b-final-*.json`, `.workmux/tmw-K7b-fast-verification-20261110.json`, kompakter Handoff `.workmux/tmw-K7b-fast-report-20261110.md`; keine historischen Nachweise überschrieben.
- [ ] Unabhängiger Sol-Standards-/Security-Review durch den Coordinator.
- [ ] Unabhängiger Spec-Review durch den Coordinator und gegebenenfalls eng begrenzte Korrekturen.

### 2026-11-10 — Eng begrenzte Allianz-Lifecycle-Korrektur

- Beide initialen unabhängigen Reviews des Originalkandidaten `7d662cd43057f7aab7581806023074461b8ecc70` sind abgeschlossen und melden denselben bestätigten P2: Allianz-Zielregeln überleben Auflösung/Reset. Keine weiteren Findings gemeldet; die initialen HOLD-/BLOCKED-Berichte bleiben erhalten. Historische Review-Checkboxen werden nicht als Annahme umgedeutet.
- `WormholeRestrictionService` registriert jetzt `AllianceContextCleanup`: Auflösung entfernt ausschließlich ALLIANCE-Regeln der Zielallianz; Reset entfernt sämtliche ALLIANCE-Regeln. Beide schreiben über den vom Lifecycle gelieferten EntityManager in derselben Transaktion, analog zum bestehenden Docking-Consumer und ADR 0004:53. Keine neue Produkt-/Rollen-/Passagepolicy.
- Meaningful RED `k7b-correction-lifecycle-red`: echte AppModule-Services löschten Auflösung/Reset-Allianzen, doch GET zeigte die verwaiste alleinige Regel weiterhin (2 Fehler; 28 durch Fokusfilter ausgeschlossene Tests). Erst danach wurde der Consumer implementiert; vollständige HTTP-GREEN-Läufe folgen. Der RED-Beleg bleibt unverändert.
- Sechs neue Produktionsgraph-PG-Fälle prüfen Auflösung und Reset: alleinige Regel aus persistierter Regelliste entfernt und realer Einflug wieder erlaubt; USER/FACTION/SHIP-Regeln und bei Auflösung andere Allianz-Ziele erhalten; später fehlschlagender Consumer sieht die Löschung im Caller-Manager, dann Rollback mit erhaltenen Regeln, Allianz/Mitgliedschaft, unveränderter HTTP-Liste und weiterhin atomar abgelehntem Einflug. Asset-Storage ist als Output-Boundary in-memory ersetzt; keine echten Assets werden gelöscht.
- Stabile finale Backend-Gates: 215 Suites/2008 Tests/1 Snapshot; gezielte disposable PostgreSQL-16-Passage-/HTTP-/Migrationssuite 2 Suites/87 Tests; null übersprungene Tests. Backend-Lint (0 Fehler/1438 Warnungen), Anwendungstypen, erzwungene Backend-Spec-Typen und Backend-Build bestanden; sämtliche tatsächlichen Exits numerisch 0, Sourcebytes unverändert. Keine vollständige PG-Suite.
- Frontend/Shared und Repository-Konfiguration unverändert zum Originalkandidaten. Originale Frontend-Evidenz (94 Dateien/674 Tests sowie ausschließlich Frontend-/Shared-Anteile von Lint/Types/Forced-Specs/Build) per exakter Byteidentität übertragen, nicht erneut ausgeführt; alte Backend-Anteile ausdrücklich durch neue Gates ersetzt.
- Automatische Prüfung einmal: unverändertes `verify-evidence-fast.py` verifiziert 6 neue Backend-Receipts (0.821 s); enger Wrapper verifiziert zusätzlich 5 originale Transfer-Receipts/Loghashes und Scope-Byteidentität (insgesamt 5.767 s), `2026-11-10T18:06:14Z`. Checkpoint Original-HEAD plus exakt zwei Backend-Codepfade; spätere Issue-Metadaten ausgenommen. Kein unabhängiger Review der Korrektur behauptet.
- Korrekturevidenz: `.workmux/gates/k7b-correction-final-*.json`, `.workmux/tmw-K7b-fast-correction-verification-20261110.json`, `.workmux/tmw-K7b-fast-correction-report-20261110.md`. Originalcommit, Berichte und fehlgeschlagene Logs erhalten; neuer lokaler Follow-up, kein Amend/Merge/Push.
- Status bleibt `ready-for-agent`: technisch grüner korrigierter Kandidat, unabhängige Korrekturannahme/Integration durch den Coordinator ausstehend; nicht resolved.
- [ ] Unabhängige Annahme der Lifecycle-Korrektur durch Standards/Security und Spec beziehungsweise Coordinator.

### 2026-11-10 — Unabhängig angenommener K7b-Kandidat (Bookkeeping)

- Technisch angenommen und Status jetzt `resolved`, gemäß ausdrücklichem Coordinator-Auftrag. Beide ursprünglichen unabhängigen Korrekturachsen akzeptieren exakt `84b9e257aa7561d9e0d6999bf704b2bbfcb48774`, Tree `54488f25520e7f60f04ce5a77c83aa13257991e4`: Standards/Security PASS0 und Spec PASS0. Das ursprüngliche gemeinsame P2 ist geschlossen; keine verbleibenden Findings.
- [x] Unabhängiger Standards-/Security-Review einschließlich Lifecycle-Korrektur angenommen (PASS0): `.workmux/local-inputs/k7b-fast-correction-standards-review-20261110.md`.
- [x] Unabhängiger Spec-Review einschließlich Lifecycle-Korrektur angenommen (PASS0): `.workmux/local-inputs/k7b-fast-correction-spec-review-20261110.md`.
- [x] Alle fünf Akzeptanzkriterien und die transaktionale Auflösungs-/Reset-Korrektur technisch angenommen. Die vorstehenden offenen Review-Checkboxen bleiben als historische Momentaufnahmen unverändert; diese aktuelle Annahme ersetzt ihren damaligen ausstehenden Zustand, nicht die dokumentierten initialen HOLD-/BLOCKED-Ergebnisse.
- Originale HOLD-/BLOCKED-Berichte, Fehler-/RED-Belege und sämtliche Gate-/Transfer-Evidenz bleiben erhalten. Diese separate Phase ändert ausschließlich dieses Issue; kein Sourcechange und kein Gate-Rerun. Ein begrenzter Git-Scope-Check bestätigt unveränderte Codebytes zum akzeptierten Korrekturkandidaten.
- Keine MAIN-Integration erfolgt: MAIN bleibt `4e2da9569b996d5a18cd428142a34ce8555e0853`. Die separat zugewiesene serielle Integration durch den ursprünglichen Sol-Reviewer steht noch aus; `resolved` dokumentiert technische Annahme, nicht Merge oder Deployment.

