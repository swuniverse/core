# Allianzdepot zuordnen und lösen

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** sc-WP-STAT-2

## Ziel

Umsetzung des Integrationsvertrags „Allianzdepots“: Der Eigner ordnet eine geeignete Depotstation seiner Allianz zu oder löst sie; Präsident und Vize sehen Besitzer, Standort und Bestand. Eigentum und Entnahmerechte ändern sich nicht.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Station/Action/{AddToAlliance,DeleteFromAlliance}`

## SWU-Pfade

- `.scratch/alliance-stu-parity/allianz-infrastruktur-spec.md` (Integrationsvertrag Allianzdepots, Bereinigung)
- `apps/backend/src/modules/alliance/alliance-context-cleanup.ts`, Allianzverwaltung im Frontend (`pages/alliances.tsx`)
- `CONTEXT.md` (**Allianzdepot**)

## Akzeptanzkriterien

- [x] Nur der Eigner ordnet eine Station mit Depotrolle zu; ungeeignete Stationen erzeugen einen Fehler (kein Erfolg, STU-Bug nicht übernehmen).
- [x] Austritt, Rauswurf, Demontage und Allianzauflösung lösen die Zuordnung gemäß Vertrag.
- [x] Verwaltung zeigt Präsident/Vize alle Depots mit Besitzer, Standort und Bestand.
- [x] Backend-Tests je Bereinigungsfall, Frontend-Test.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-10-29: Blockiert nach zwei ernsthaften Verifikationsläufen. Der Produktpfad mit Zuordnung, Cleanup-Consumer, Verwaltungsansicht und Migration ließ sich bauen; der Frontend-Test wurde grün. Der vorgeschriebene Backend-Testlauf scheitert jedoch bereits beim Laden bestehender STU-Entities an `ReferenceError: Cannot access 'StarSystem' before initialization`, und der Frontend-Typecheck scheitert an bereits vorhandenen issue-fremden Fehlern (`database.tsx`-Faction-Typ sowie zahlreiche TS6305-Artefakte). Produktänderungen wurden gemäß Ralph-Abbruchregel verworfen.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Entity-Initialisierung und Frontend-Typecheck); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.

## Answer

- Eigenständige `AllianceDepot`-Entity mit einer Zuordnung pro Station, Allianz und Eigentümer. Stations-, Allianz- und Benutzerreferenzen sind kaskadierend; Eigentum, Fracht und bestehende Zugangsrechte werden nicht verändert.
- Eigentümergeschützte `GET/PUT/DELETE /spacecraft/:id/alliance-depot`-API: Nur eigene betriebsbereite Versorgungsdepots (`DEPOT_SMALL`) und Logistikzentren (`DEPOT_LARGE`) können der aktuellen eigenen Allianz zugeordnet werden. Schiffe, Konstrukte, andere Stationsrollen, Bau-/Demontage-/Zerstörungszustände und fehlende Mitgliedschaft erzeugen Fehler. Wiederholte Zuordnung bleibt idempotent; Lösen benötigt kein Allianzamt.
- Stationsansicht zeigt Zuordnung, aktuelle Allianz und den Grund einer möglichen Sperre sowie Zuordnen/Lösen. Die Bestandsansicht in der Allianzverwaltung ist ausschließlich für Präsident und Vize sichtbar und über `GET /alliances/:id/depots` entsprechend geschützt. Sie zeigt Stationsname, Eigentümer, System-/Galaxiestandort und tatsächliche Warenbestände mit Namen und Lagerkapazität; Aktualisierung ist möglich. Kein Zugriff auf Steuerung oder Entnahme fremder Depots.
- `AllianceContextCleanup` löst die Zuordnungen eines austretenden/entfernten Mitglieds sowie alle Zuordnungen bei Auflösung oder Reset innerhalb der auslösenden Transaktion. Ein geteilter Allianz-Lock koordiniert die Zuordnung mit den vorhandenen Allianz-Lebenszyklen; die Stationssperre verhindert konkurrierende Zuordnungs-/Demontageänderungen. Rollen und Mitgliedschaften werden bei jeder Abfrage erneut geprüft; nach Besitzerwechsel oder ungültiger Mitgliedschaft erscheinen die alten Depots nicht in der Verwaltung.
- Die Demontage aus `sc-WP-STAT-6a` entfernt die Zuordnung über die kaskadierende Stationsreferenz beim Abschluss. Derselbe Mechanismus gilt bei Stationszerstörung und anderen Löschpfaden. PostgreSQL prüft den tatsächlichen Demontage-Tick einschließlich Rollback bei fehlgeschlagener Abschlussnachricht.

## Validation

- 2026-11-16: `npx nx affected -t lint typecheck test --base=HEAD --parallel=2` grün. Backend 239 Suites / 2308 Tests; Frontend 121 Dateien / 840 Tests. Sämtliche Lint-/Typecheck-Targets erfolgreich; bekannte Lint-Warnungen ohne Fehler.
- `npx nx run backend:test-integration --runInBand --testPathPatterns=alliance-depot`: 18 PostgreSQL-Tests grün. Eigentum, beide Depotrollen, ungeeignete Klassen/Zustände, fehlende Mitgliedschaft, Ämterzugriff, Bestände/Standorte, echte Austritts-/Rauswurf-/Auflösungs-Lebenszyklen, Reset, Cleanup-Rollback, parallele Zuordnung/Austritt, Besitzerwechsel, Stations-Cascade und tatsächlicher Demontageabschluss mit Rollback.
- Acht neue Paneltests für Zuordnen/Lösen, Sperren, API-Fehler, Bestandsanzeige, Aktualisierung und fehlende Berechtigung; zusätzlicher Test über `AllianceEditPage` für die eingebundene Bestandsansicht. Bestehende Seiten-Testfixtures um die neue leere Depotabfrage ergänzt.
- `npx nx run-many --targets=build`: alle drei Projekte grün. Backend-Deklarationsausgaben nach Webpack separat wiederhergestellt.
- Migration `AddAllianceDepots20261116180000` in der lokalen Dev-Datenbank auf Port 5490 erfolgreich angewendet. Migrationseintrag und alle drei kaskadierenden Fremdschlüssel separat abgefragt. Keine Bestandsdaten zurückgesetzt.

## Abschlussnotiz

- 2026-11-16 Agent: Allianzdepot-Zuordnung und geschützte Verwaltungsansicht umgesetzt. Transaktionale Kontextbereinigung und FK-Cascade schließen auch die vorbereitete Depotbereinigung aus sc-WP-STAT-6a ab. Vollständige Pflichtprüfungen und PostgreSQL-Fälle grün.
