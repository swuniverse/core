# Signaturmaskierung für Flugsignaturen

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** sc-WP-NAV-2a, tmw-D6b

## Ziel

Eine Signaturmaskierung bildet die falsche STU-Warpsignatur im feldweisen SWU-Galaxieflug ab. Ein Schiff kann gegen EPS für fünf Minuten das Signaturprofil eines dem Spieler bekannten Spacecraft-Rumpfs emittieren; währenddessen neu erzeugte Flugsignaturen zeigen Beobachtern diesen Rumpf statt des tatsächlichen.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Ship/Action/FakeWarpSignature/FakeWarpSignature.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/`
- `apps/backend/src/modules/starmap/`
- `apps/frontend/src/pages/spacecraft/`
- `packages/shared/`
- `game-data/data/modules/special.yaml`

## Akzeptanzkriterien

- [ ] Ein geeignetes Schiff kann nur einen persönlich entdeckten, von seinem echten Rumpf verschiedenen Spacecraft-Rumpf wählen.
- [ ] Aktivierung kostet `25 × Antriebsstufe` EPS und hält fünf Minuten; fehlende EPS oder ein defekter Antrieb verhindern sie.
- [ ] Nur nach der Aktivierung erzeugte Flugsignaturen tragen den maskierten Rumpf; Eigentümer-, Zeit- und Richtungsdaten bleiben unverändert.
- [ ] Nach Ablauf oder Deaktivierung werden wieder echte Rumpfdaten verwendet; bestehende Signaturen bleiben historische Snapshots.
- [ ] Shared-DTOs und Schiff-UI zeigen Auswahl, Kosten und verbleibende Dauer.
- [ ] Service- und Integrationstests decken Wissen, Kosten, Ablauf und Signaturdarstellung ab.

## Triage und Umsetzungsvertrag

`FlightSignatureService.createMovement` speichert bereits historische Rumpf-ID/-Namen; Maskierungszustand fehlt. Persönliche Schiffsrumpfkenntnis existiert in `ship_class_discoveries`/`ShipClassDiscoveryService`. Stationskenntnis liegt separat vor und ist kein gültiger Ersatz für Schiffsrumpfkenntnis.

Die STU-Quelle berechnet `25 × defaultLevel(WARPDRIVE)` des **imitierten Rumpfs**, nicht des eigenen eingebauten Antriebs. So ist die bisher ungenaue Formulierung „Antriebsstufe“ auszulegen. Fünf Minuten werden per Ablaufzeit geprüft. Nach ADR-0006 gibt es keinen zeitbasierten Warpflug mehr; qualifiziert ist ein mobiles Schiff mit intaktem aktivem Hyperantrieb im Galaxieraum. Kein neues separat herstellbares Maskierungsmodul erforderlich: STU bindet die Aktion an den Antrieb.

## Ergänzte Akzeptanzkriterien

- [ ] Auswahl stammt aus persönlicher Schiffsrumpfentdeckung und enthält nur mobile Rümpfe mit vorhandenem positivem Standard-Antriebslevel; keine Stationen, unbekannten IDs, eigener Rumpf oder stiller Level-Fallback. Das Standardlevel wird über die zugeordnete STU-Rumpf-ID aus `game-data/data/ship-building/stu-rump-module-rules.yaml` (`HYPERDRIVE.level`) und `GameDataService` bezogen, nicht aus `warpdriveBase`. SWU-eigene Rümpfe ohne ausdrücklichen Regelwert stehen nicht zur Auswahl.
- [ ] API liefert Vorschau der exakt aus dem Zielrumpf berechneten Kosten. Aktivierung prüft Eigentum, Ort, Antriebszustand und EPS unter Schiffssperre; Fehlschlag verändert weder EPS noch Maskierungszustand.
- [ ] Zustand speichert Zielrumpf-ID und Ablaufzeit. Deaktivierung ist kostenlos; erneute Aktivierung berechnet erneut volle Kosten und ersetzt das Zeitfenster. Ein defekter/abgeschalteter Antrieb beendet die Maskierung; Reparatur aktiviert sie nicht von selbst.
- [ ] Sämtliche Signatur-Erzeuger verwenden dieselbe Snapshot-Funktion (System-/Galaxieflug, Ein-/Austritt, Wurmloch, Sonderbewegungen soweit dort der Antrieb qualifiziert ist). Vor Erzeugung werden Ablauf und Antriebszustand geprüft. Alterung, Tarnungsredaktion, Besitzer und Richtungen bleiben erhalten.
- [ ] Tests mit fester Uhr prüfen einen Zielrumpf mit anderer Antriebsstufe, Wissensschutz, EPS-Rollback, Ablaufgrenze, Deaktivierung, Defekt und unveränderte alte Snapshots; Frontend testet Kostenwahl und Aktivierung.

## SWU-Anker

`flight-signature.service.ts`, `entities/flight-signature.entity.ts`, `entities/ship-class-discovery.entity.ts`, `ship-class-discovery.service.ts`, `game-data.service.ts`, `spacecraft-runtime-state.service.ts` und `ShipQuickActions.tsx`.

## Comments

- 2026-11-16 – Triage: Kostenbasis anhand STU geklärt, vorhandene Wissens-/Snapshot-Infrastruktur identifiziert. Kein Produktentscheid oder neues Modul nötig; keine Feature-Fertigstellung behauptet. Siehe [Audit](../triage-2026-11-16.md).
