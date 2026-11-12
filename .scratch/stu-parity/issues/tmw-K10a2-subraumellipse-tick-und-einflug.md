# Anomalien: Subraumellipse, Tick- und Einflugwirkung

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Implementiert die Subraumellipse als ersten konkreten Anomalietyp auf Basis des Frameworks aus `tmw-K10a1`: Erzeugungsprüfung, Lebensdauer, Schildwirkung, Einflugfolgen und Benachrichtigungen.

## STU-Quellen

- `src/Component/Anomaly/Type/SubspaceEllipseHandler.php`
- `src/Orm/Repository/LocationRepository.php#getForSubspaceEllipseCreation`
- `src/Module/Spacecraft/Lib/Movement/Component/Consequence/PostFlight/AnomalyConsequence.php`

## SWU-Pfade

- Anomalie-Handler und Tick-Integration aus `tmw-K10a1`
- `apps/backend/src/modules/spacecraft/spacecraft-runtime-state.service.ts` (Schildintegrität)
- Flugfolgen-Pipeline `onEnterField` aus `tmw-K1a`
- Feldsperre `NO_ANOMALIES` aus `tmw-K3c`
- Nachrichten/Events für betroffene Schiffseigner

## Akzeptanzkriterien

- [x] Schiffsklassen erhalten explizites Integerfeld `anomalyMass`. Eindeutig zugeordnete STU-Rümpfe übernehmen `tractor_mass`; SWU-eigene Klassen erhalten bewusst gepflegte Werte, nicht aus Kampfwerten abgeleitete Werte.
- [x] Der Score folgt STU: mobile Schiffe zählen mit voller `anomalyMass`, Stationen mit `anomalyMass / 10`, hinzu kommen `Crewzahl × Anzahl aktiver Systeme × 100`. NPC-/Systemschiffe, Schiffe im Bau und Schiffe mit aktivem Hyperraumantrieb zählen nicht.
- [x] Bei Score oberhalb `33_333_333` beträgt die Erzeugungschance pro Haupttick `clamp(5 + ceil(Überschuss / 1_000_000), 0, 100)` Prozent. `NO_ANOMALIES`-Felder erzeugen nie eine Anomalie.
- [x] Der injizierbare RNG steuert die Chance mit der festgelegten inklusiven Probe `roll <= chance` sowie die Schildemitterschäden von 1–50; Tests kontrollieren beide Ergebnisse deterministisch.
- [x] Die Lebensdauer beträgt einen Tick: Nach der Erzeugung wirkt die Ellipse im folgenden Haupttick auf alle Schiffe am Ort und verschwindet anschließend.
- [x] Bei Wirkung werden Schilde abgeschaltet und auf 0 gesetzt; das Schildsystem nimmt 1–50 Schaden. Besitzer werden bei Erzeugung und Wirkung benachrichtigt.
- [x] Einflugfolgen laufen über die `tmw-K1a`-Pipeline. Backend-Tests decken Scoregrenzen, Ausschlüsse, RNG, Schildwirkung, `NO_ANOMALIES`, Ablauf und Benachrichtigungen ab.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

`anomalyMass`, Scoreformel, Schwelle `33_333_333`, Erzeugungschance, RNG-Verhalten, inklusive Prozentprobe und Ein-Tick-Lebensdauer entsprechen den am 2026-10-30 dokumentierten Product-Owner-Entscheidungen in `tmw-K10a`. Keine fehlenden Schiffsklassenwerte erfinden; nicht eindeutig gemappte Werte bei der Umsetzung als fehlende autoritative Datenquelle behandeln.

## Comments

- 2026-11-06: Zweites geordnetes Child aus `tmw-K10a`; setzt `tmw-K10a1` voraus.
- 2026-11-11: Vorgänger `tmw-K10a1` ist nach Integration in `stu-parity` auf `resolved` gesetzt; dessen ursprüngliche Abhängigkeit ist damit erfüllt. Ticket wieder im `ready-for-agent`-Frontier.
- 2026-11-11: Von der Koordination für die Implementierung beansprucht (`claimed`).
- 2026-11-11: Implementierungs-WIP; Status bleibt `claimed`, keine Abnahme. Die zehn freigegebenen Massen und Quell-IDs sind in `anomaly-mass.ts` dokumentiert; sie ändern keine Klassenprofile. ADR 0004 nennt für Rebellen-Großdepot/Raumwerft ältere Profilreferenzen 10021/10031, während die freigegebenen Massenquellen 10023/10033 sind. Das `game-data`-Submodul ist hier nicht initialisiert (Gitlink `0c195e180469abff0eb40b721ffe32f1985e61aa`); für die übrigen aus dem übernommenen WIP stammenden Massen fehlt im Worktree unabhängig prüfbare `tractor_mass`-Evidenz. Diese Werte sind nicht abschließend bestätigt. Kein Zugriff auf ein anderes Repo oder externe Dienste.
- 2026-11-11: Test-first: PostgreSQL-RED/GREEN für Erzeugung (0 statt 1 Anomalie), `NO_ANOMALIES` (1 statt 0), Schildwirkung (50 statt 0), Legacy-Backfill (`null` statt 18.500.000), Dopplung (2 statt 1), gleichzeitigen Abflug (veraltete Schildänderung) und Einflug (fehlender Adapter, danach Überschreiben von Energie und Runtime-Systemen). Einflug-Adapter isoliert getestet, vollständiger Flug-/Flottenpfad und Lock-Reihenfolge noch nicht ausreichend validiert; weitere Schwellen-, Ausschluss-, Lebenszyklus- und Rollback-Tests vorhanden. Bereits im WIP vorhandene Tests bzw. bereits implementierte Ausschluss-/Scorefälle hatten keinen neu aufgezeichneten RED.
- 2026-11-11: Validierung (alle Testprozesse mit `env -u DATABASE_URL -u INTEGRATION_DATABASE_URL`; PG über Testcontainers `postgres:16-alpine`, echte Migrationen, `synchronize: false`):
  - `TS_NODE_COMPILER_OPTIONS='{"moduleResolution":"node10","module":"commonjs","customConditions":null}' ./node_modules/.bin/jest --config apps/backend/jest.integration.config.cts --rootDir apps/backend --runInBand --runTestsByPath apps/backend/src/testing/integration/subspace-ellipse.int-spec.ts apps/backend/src/testing/integration/anomaly-mass.int-spec.ts apps/backend/src/testing/integration/anomaly-tick.int-spec.ts`: Exit 0, 3 Suiten/22 Tests, 0 Skips; Warnungen: veraltetes `ts-jest isolatedModules` und paralleles `pg client.query`.
  - `NX_DAEMON=false ./node_modules/.bin/nx run-many --target=typecheck --all --skip-nx-cache`: Exit 0, 3 Projekte. Ein früherer paralleler Build/Typecheck kollidierte und schlug mit TS6305 bzw. ENOTEMPTY fehl; danach seriell wiederholt.
  - `NX_DAEMON=false ./node_modules/.bin/nx run backend:build --skip-nx-cache`: Exit 0, Webpack `4dea4d3d914ce3f3`.
  - `NX_DAEMON=false ./node_modules/.bin/nx run-many --target=lint --all --skip-nx-cache`: Exit 0, 3 Projekte; 110 Frontend- und 1438 Backend-Warnungen (0 Fehler). `./node_modules/.bin/eslint apps/backend/src --max-warnings=0`: Exit 1, 0 Fehler/1436 Warnungen. `./node_modules/.bin/eslint apps/backend/src/modules/anomaly apps/backend/src/modules/spacecraft/anomaly-mass.ts apps/backend/src/modules/spacecraft/ship-class.service.ts apps/backend/src/modules/spacecraft/entities/ship-class-def.entity.ts apps/backend/src/database/migrations/20261111110000-add-anomaly-mass.ts apps/backend/src/testing/integration/anomaly-mass.int-spec.ts apps/backend/src/testing/integration/subspace-ellipse.int-spec.ts --max-warnings=0`: Exit 0, 0 Warnungen; `spacecraft.module.ts` ist in diesem eng begrenzten Befehl nicht enthalten.
  - `NX_DAEMON=false ./node_modules/.bin/nx run backend:test --skip-nx-cache --runInBand`: Exit 1, 213 Suiten bestanden, 1 fehlgeschlagen, 1 übersprungen; 1973 Tests bestanden, 34 fehlgeschlagen, 1 übersprungen. Fehler in `game-data.service.spec.ts` bei fehlendem `game-data`-Submodul.
- 2026-11-11: Vor Abnahme verbleiben vollständige Flight-Entry-/Flotten- und Transaktions-/Nebenläufigkeitsnachweise, Nachweis der unbestätigten Massen, vollständige grüne Backend-Tests und strict lint. Kein Merge/Push.
- 2026-11-12: Abgeschlossen. Gegenüber dem WIP auf STU-Semantik korrigiert: (1) Der Score aggregiert je Ort – Schiffsmasse + Stationsmasse/10 + Gesamtcrew × Gesamtzahl aktiver Systeme × 100 (STU `getForSubspaceEllipseCreation`); vorher wurde Crew × Systeme je Schiff summiert, wodurch die Schwelle praktisch nur über Masse erreichbar war. (2) Einflug: Die `AnomalyFlightConsequence` verteilt über die `tmw-K1a`-Pipeline an `handleIncomingSpacecraft`; die Ellipse wirkt dort wie in STU nicht, sondern nur im folgenden Haupttick. Ohne Anomalie am Ort öffnet der Einflug keine Transaktion. (3) Tick nach STU `handleSpacecraftTick`: Besitzer im Urlaubsmodus, Schiffe ohne Schildsystem sowie entladene Schiffe mit zerstörtem Emitter werden übersprungen; Schaden nur bei Emitter-Integrität > 0; je Besitzer ein gebündelter Bericht, getrennt nach Schiffs- und Stationsordner, Betreff mit Sektor. Erzeugungsnachricht an alle Nicht-NPC-Besitzer am Ort. Massenwerte: In STU-Testdaten nachprüfbar sind Aerie 133.000 (6501), Außenposten 34.500.000 (10053) und Workbee 2 (161) – alle übereinstimmend; die übrigen bleiben wie freigegeben dokumentiert in `anomaly-mass.ts`.
  - Prüfungen: Anomalie-Integrationstests (Testcontainers PG, 3 Suiten/27 Tests) grün; `nx run-many -t lint typecheck build -p backend shared` grün (0 Fehler, 1438 bestehende Warnungen, unverändert); strict lint auf geänderten Dateien 0 Warnungen; `backend:test` 2007/2008 grün, der eine Timeout (`password-reset.service.spec.ts`, fachfremd, lastbedingt) isoliert grün. `game-data`-Submodul im Worktree lokal initialisiert.
  - Offener Folgepunkt (nicht im Scope): STU vergibt Crew-Erfahrung `SUBSPACE_ELLIPSE_TICK` je betroffenem Schiff; SWU hat dafür noch keinen Skill-Auslöser.
