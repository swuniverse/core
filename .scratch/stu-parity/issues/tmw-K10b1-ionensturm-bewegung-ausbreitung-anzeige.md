# Ionensturm: Erzeugung, Bewegung, Ausbreitung und Anzeige

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K10a3

## Ziel

Erstes Child aus `tmw-K10b`. Der Ionensturm entsteht als zweiter Anomalietyp mit Wurzelobjekt (Richtung, Geschwindigkeit, Bewegungstyp, Polarität, Intensität) und Sturmfeldern als Kinder. Er bewegt sich, breitet sich über Restticks aus, verschwindet wieder und wird in LSS und Feldkontext mit Intensität angezeigt. Die Wirkung auf Schiffe folgt in `tmw-K10b2`.

## STU-Quellen

- `src/Component/Anomaly/Type/IonStorm/IonStormHandler.php` (`checkForCreation`, `getMaxIonStormCount`, `handleSpacecraftTick` ohne `damageSpacecrafts`)
- `.../IonStormData.php`, `IonStormMovement.php`, `IonStormMovementType.php`, `IonStormPropagation.php`, `LocationPool.php`, `LocationPoolFactory.php`
- `src/Component/Anomaly/AnomalyHandling.php` (`decreaseLifespan` von Wurzel und Kindern), `src/Module/Control/StuRandom.php` (Normalverteilung)
- STU-Testdaten `stu_anomaly_type`: Ionensturm-Lebensdauer 1000 Ticks
- Asset `assets/map/anomalies/ion_storm.png` (aus STU `anomalies/2.png`, liegt bereits vor)

## SWU-Pfade

- `apps/backend/src/modules/anomaly/` (Handler, Registry, `AnomalyService`, `AnomalyQueryService`)
- `apps/backend/src/modules/starmap/entities/galaxy-field.entity.ts`, `space-location.entity.ts`, `layer.entity.ts`
- `packages/shared/src/lib/starmap/anomalies.ts`
- `apps/frontend/src/components/starmap/AnomalyMarker.tsx`, `components/spacecraft/LssMap.tsx`, Navigation zum LSS-Ziel

## Akzeptanzkriterien

- [x] Der Ionensturm-Handler (`ION_STORM`, „Ionensturm") ist im Register eingetragen. Die maximale Sturmzahl je Ebene ist `ceil(Breite × Höhe / ION_STORM_LOCATIONS_PER_STORM)` (Konfiguration, Standard 3000). Fehlende Stürme entstehen auf zufälligen passierbaren Galaxiefeldern der Ebene ohne `NO_ANOMALIES` und ohne bestehenden Ionensturm.
- [x] Wurzel ohne Ort mit Sturmdaten nach STU `IonStormData::createRandomInstance` (Intensität 50–200, Geschwindigkeit 1–5 normalverteilt um 2, Richtung 1–360°, 10 % variabler Bewegungstyp); Wurzel und erstes Sturmfeld erhalten 1000 Restticks.
- [x] Bewegung: Jedes Sturmfeld verschiebt sich um `round(sin(Richtung) × v)` / `round(cos(Richtung) × v)`. Liegt das Ziel außerhalb der Ebene, ist es nicht passierbar, `NO_ANOMALIES` oder bereits Ionensturm, verschwindet das Sturmfeld. Variable Stürme würfeln danach Richtung und Geschwindigkeit neu.
- [x] Ausbreitung: Die Wurzel überträgt je Sturmfeld 1–3 % ihrer Restticks. Sturmfelder mit mindestens 10 Restticks geben an ein zufälliges passierbares Nachbarfeld ohne `NO_ANOMALIES` 10–90 % (neues Sturmfeld) bzw. 20–70 % (bestehender Ionensturm) ab. Die Wurzel bleibt mit Kindern am Leben und verschwindet ohne Kinder.
- [x] LSS und Feldkontext zeigen Sturmfelder als „Ionensturm" mit Intensität und Restdauer; das LSS-Icon ist `ion_storm.png`. Die Navigation warnt, wenn das gewählte Ziel in einem Ionensturm liegt.
- [x] Backend-Tests mit deterministischem Zufall: Erzeugung (Anzahl je Ebene, Feldfilter, Konfiguration), Bewegung (verschieben, verschwinden, variable Richtung), Ausbreitung (Übertrag, Split neu/bestehend, Wurzel am Leben/Ende), Anzeige-Vertrag. Frontend-Test: Darstellung im LSS und Navigationswarnung.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Product Owner, 2026-11-12: `tmw-K10b` wird in Mechanik/Anzeige (dieses Issue) und Wirkung (`tmw-K10b2`) geteilt.

## Comments

- 2026-11-12: Aus `tmw-K10b` abgespalten.
- 2026-11-12: Umgesetzt. `IonStormHandler` (`anomaly/ion-storm.handler.ts`) mit STU-Daten (`ion-storm-data.ts`) und STU-Zufallsport (`stu-random.ts`, Normalverteilung per Rejection-Sampling wie `StuRandom`). Wurzel ohne Ort mit `layerId` in den Daten; nur die Wurzel bewegt und verbreitet ihre Sturmfelder, die Felder selbst sind im generischen Tick inert, sodass `AnomalyService` Wurzel und Felder wie STU `decreaseLifespan` je einmal herunterzählt. Dichte über `ION_STORM_LOCATIONS_PER_STORM` (Standard 3000, in `.env.example` dokumentiert). Bewegungsziele und Splits bleiben auf passierbaren Feldern der Ebene ohne `NO_ANOMALIES`. Anzeige: optionaler Handler-Hook `present` liefert die Intensität aus der Wurzel; `AnomalyViewDto.intensity`; LSS/Feldkontext/Umgebungsscan zeigen „Ionensturm (Intensität …, noch … Ticks)", LSS-Icon `ion_storm.png`; die Navigation warnt im Zielhinweis vor Ionensturm.
  - Abweichung (bewusst, gering): Ein in diesem Tick per Split neu entstandenes Sturmfeld wird erst im nächsten Tick heruntergezählt, weil der generische Tick die Anomalien zu Tickbeginn erfasst; STU zählt es sofort. Wirkung: neue Fragmente leben einen Tick länger.
  - Prüfungen: `ion-storm.int-spec.ts` (7 Tests: Erzeugung mit Feldfilter und Dichte, Bewegung inkl. Verschwinden am Rand/unpassierbar, variable Neuausrichtung, Übertrag und Split neu/bestehend/`NO_ANOMALIES`, Wurzel am Leben/Ende, Anzeigevertrag); Mutationsprobe (sin/cos vertauscht) lässt 4 Tests scheitern. Alle Anomalie-Suiten 5/36 grün. `nx run-many -t lint typecheck build -p shared backend frontend` grün (Warnungen unverändert); Frontend 688/688; Backend 2007/2008 – einziger Ausfall erneut `password-reset.service.spec.ts` (echtes bcrypt überschreitet unter Volllast das 5-s-Jest-Timeout), isoliert grün; fachfremd, Kandidat für die Triage zusammen mit `sh-AP-22`.
