# Anomalie-Framework mit Subraumellipse

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

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

Dieses Parent-Ticket ist ein Tracking-Split; die Umsetzung erfolgt in drei geordneten Child-Issues:

- [ ] `tmw-K10a1`: Anomalie-Datenmodell, Migration, Handler-Registry und Lebenszyklus.
- [ ] `tmw-K10a2`: Subraumellipse, Tick-/Einflugwirkung und Backend-Tests.
- [ ] `tmw-K10a3`: Scan- und UI-Verträge für LSS, Feldkontext und Kolonie-Umgebungsscan.

## Comments

- 2026-10-28: Blockiert durch fehlende Produktentscheidung zur Subraumellipse. Die STU-Referenz verwendet eine Schwellwertformel über Crew und `rump.mass`, während SWU-Schiffsklassen aktuell keine persistierte Masse besitzen. Zusätzlich verlangt das Issue eine 1–50-Schadensverteilung, legt aber weder Zufallsquelle/Determinismus noch den Lebensdauer- und Erzeugungsmodus für den Anomalietyp fest. Bitte festlegen: (1) welches SWU-Masseäquivalent bzw. welche Klassenmetrik und welcher Schwellwert gelten, (2) ob Schildemitterschaden deterministisch oder zufällig ist und wie getestet wird, (3) Lebensdauer und Erzeugungswahrscheinlichkeit/-häufigkeit der Subraumellipse.
- 2026-10-30 Product Owner: Option 1. Jede Schiffsklasse erhält den expliziten Integerwert `anomalyMass`. Bei eindeutig zugeordneten STU-Rümpfen wird er aus `tractor_mass` übernommen; SWU-eigene Klassen benötigen einen bewusst gepflegten Wert und dürfen nicht still aus Kampfwerten abgeleitet werden. Der Score folgt STU: mobile Schiffe zählen mit voller `anomalyMass`, Stationen mit `anomalyMass / 10`, hinzu kommen `Crewzahl × Anzahl aktiver Systeme × 100`; NPC-/Systemschiffe, Schiffe im Bau und Schiffe mit aktivem Hyperraumantrieb zählen nicht. Schwelle ist `33_333_333`. Oberhalb davon beträgt die Chance je Haupttick `clamp(5 + ceil(Überschuss / 1_000_000), 0, 100)` Prozent. Ein injizierbarer RNG wird sowohl für diese Chance als auch für zufällige `1–50` Schildemitterschäden verwendet; Tests steuern ihn deterministisch. Anders als der fehlerhafte strikte STU-Vergleich gilt eine explizite Prozentprobe `roll <= chance`. Lebensdauer ist ein Tick: Erzeugung erfolgt nach Verarbeitung bestehender Anomalien, Wirkung im folgenden Haupttick, danach verschwindet die Ellipse. Das Issue ist `ready-for-agent`.
- 2026-10-30: Abbruch nach zwei ernsthaften Umsetzungsversuchen ohne Produktcode-Fortschritt. Der Scope umfasst gleichzeitig neues Persistenzmodell und Migration, ein Handler-Register, globale Tick-Orchestrierung, Flugpipeline-Integration, Schiffsklassen-Massendaten, Benachrichtigungen sowie drei Anzeigeverträge. Das ist nicht sicher als einzelnes M-Issue test-first abschließbar; deshalb wurde die Aufteilung in geordnete Teilissues vorgeschlagen.
- 2026-11-06 Product Owner: Bestätigt den Tracking-Split in drei geordnete Child-Issues. `tmw-K10a1` umfasst Datenmodell, Migration, Handler-Registry und Lebenszyklus; `tmw-K10a2` die Subraumellipse mit Tick-/Einflugwirkung; `tmw-K10a3` die Scan-/UI-Verträge. Kind 2 hängt von Kind 1 ab, Kind 3 von Kind 2. Das Parent-Ticket bleibt `resolved` als Tracking-Split.
