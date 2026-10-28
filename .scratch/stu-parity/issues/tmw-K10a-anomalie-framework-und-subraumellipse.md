# Anomalie-Framework mit Subraumellipse

**Status:** needs-info
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K1a, tmw-K3c

## Ziel

SWU bekommt ein Anomalie-Framework nach STU-Vorbild: Entität (Typ, Ort, Restticks, Daten, Eltern/Kinder), registrierbare Typ-Handler mit Erzeugungsprüfung, Tick-Verarbeitung, Einflugwirkung und Verschwinden, dazu die Anzeige in LSS und Feldkontext. Der erste Typ ist die Subraumellipse: Sie entsteht an Orten mit hoher Schiffs- und Crewmasse und entlädt dort die Schilde und beschädigt die Schildemitter. Dieses Issue ist kanonischer Eigentümer und ersetzt `sc-WP-SENS-3` (zusammen mit tmw-K10b/c). Die Typauswahl für SWU ist damit festgelegt: Subraumellipse, Ionensturm, saisonale Anomalien.

## STU-Quellen

- `src/Component/Anomaly/AnomalyCreation.php`, `AnomalyHandling.php` (`processExistingAnomalies`, `createNewAnomalies`, `handleIncomingSpacecraft`, `decreaseLifespan`)
- `src/Component/Anomaly/Type/AnomalyHandlerInterface.php`, `AnomalyTypeEnum.php`, `SubspaceEllipseHandler.php` (`MASS_CALCULATION_THRESHOLD`, Schilde aus und auf 0, Schildsystem-Schaden 1–50)
- `src/Orm/Entity/Anomaly.php`, `AnomalyType.php`, `src/Orm/Repository/LocationRepository.php#getForSubspaceEllipseCreation`
- `src/Module/Tick/Spacecraft/ManagerComponent/AnomalyProcessing.php`, `AnomalyCreationCheck.php`
- `src/Module/Spacecraft/Lib/Movement/Component/Consequence/PostFlight/AnomalyConsequence.php`
- `src/Lib/Map/VisualPanel/Layer/Render/AnomalyLayerRenderer.php`, Assets `st-universe/assets/anomalies/1.png`, `2.png`

## SWU-Pfade

- `apps/backend/src/modules/tick/tick.service.ts` (Haupttick), `apps/backend/src/modules/starmap/entities/space-location.entity.ts`
- Pipeline (`onEnterField`) aus tmw-K1a, `FieldEffectQuery` (`NO_ANOMALIES`) aus tmw-K3c
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`getLocalMap`, `getFieldContext`), `spacecraft-runtime-state.service.ts` (Schildsystem `integrity`)
- `apps/backend/src/modules/colony/colony-environment-scan.service.ts` (liefert heute `anomalies: []`)
- `apps/frontend/src/components/spacecraft/LssMap.tsx`, `FieldContextPanel.tsx`, Asset-Ablage `swuniverse/assets/anomalies/`

## Akzeptanzkriterien

- [ ] Die Entitäten Anomalie und Anomalietyp sind per Migration angelegt. Eine Anomalie hat Typ, Ort (nullable für Wurzelobjekte), Restticks, JSON-Daten und Eltern/Kinder.
- [ ] Ein Handler-Register: Jeder Typ implementiert `checkForCreation`, `handleTick`, `handleIncomingSpacecraft` und `onDisappear`. Der Haupttick ruft erst die Verarbeitung bestehender Anomalien auf (Restticks −1, Entfernen bei 0), dann die Erzeugungsprüfung.
- [ ] Die Einflugfolgen laufen über die Pipeline aus tmw-K1a. Felder mit `NO_ANOMALIES` erhalten nie eine Anomalie.
- [ ] Subraumellipse: entsteht an Orten, deren berechnete Masse (Crew × aktive Systeme, Masse der Schiffe; SWU-Äquivalent der STU-Formel, dokumentiert) den Schwellwert übersteigt. Je Tick werden für alle Schiffe am Ort die Schilde abgeschaltet und auf 0 gesetzt, und das Schildsystem nimmt 1–50 Schaden. Die Besitzer werden bei Entstehung und bei Wirkung benachrichtigt.
- [ ] LSS, Feldkontext und Kolonie-Umgebungsscan zeigen Anomalien (Icon aus `/assets/anomalies/<typ>.png`, Name, Restdauer). Fehlende Assets sind dokumentiert.
- [ ] Backend-Tests: Lebenszyklus (Erzeugen, Ticken, Verschwinden), Handler-Register, Subraumellipse (Schwelle, Schildwirkung), Sperre `NO_ANOMALIES`. Frontend-Tests: `LssMap` und `FieldContextPanel` zeigen die Anomalie.

## Comments

- 2026-10-28: Blockiert durch fehlende Produktentscheidung zur Subraumellipse. Die STU-Referenz verwendet eine Schwellwertformel über Crew und `rump.mass`, während SWU-Schiffsklassen aktuell keine persistierte Masse besitzen. Zusätzlich verlangt das Issue eine 1–50-Schadensverteilung, legt aber weder Zufallsquelle/Determinismus noch den Lebensdauer- und Erzeugungsmodus für den Anomalietyp fest. Bitte festlegen: (1) welches SWU-Masseäquivalent bzw. welche Klassenmetrik und welcher Schwellwert gelten, (2) ob Schildemitterschaden deterministisch oder zufällig ist und wie getestet wird, (3) Lebensdauer und Erzeugungswahrscheinlichkeit/-häufigkeit der Subraumellipse.
