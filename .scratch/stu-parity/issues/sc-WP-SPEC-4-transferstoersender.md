# Transferstörsender gegen Waren- und Crewtransfer

**Status:** needs-info
**Priority:** P3
**Size:** S
**Blocked by:** sc-WP-ENG-2c

## Ziel

Ein Transferstörsender bildet den STU-Beam-Blocker ab. Das passive, dauerhaft aktive Spacecraft-System verhindert Waren- und Crewtransfer zum beziehungsweise vom ausgerüsteten Spacecraft, ohne Docking, Kampf oder normale Kommunikation zu sperren.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Component/Spacecraft/System/Type/BeamBlockerShipSystem.php`
- Transferprüfungen für `SpacecraftSystemTypeEnum::BEAM_BLOCKER` im STU-Transfermodul

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/`
- `apps/frontend/src/pages/spacecraft/`
- `packages/shared/`
- `game-data/data/modules/special.yaml`

## Akzeptanzkriterien

- [ ] Transferstörsender ist nach Einbau immer aktiv und hat keinen manuellen Schalter oder EPS-Verbrauch.
- [ ] Alle Waren-, Reaktorladungs- und Crewtransferpfade prüfen Quelle und Ziel zentral und lehnen bei intaktem Störsender atomar ab.
- [ ] Zerstörung des Systems hebt die Sperre auf; Reparatur aktiviert sie wieder.
- [ ] Die Ablehnung nennt den Transferstörsender als Grund und die Spacecraft-UI zeigt den passiven Zustand.
- [ ] Service- und Integrationstests decken sämtliche Transferarten, beide Richtungen und den Schadenszustand ab.

## Triage

Die SWU-Interaction-Policy hat noch keinen Transferstörsender. Waren-/Crewtransfer läuft über `TransferService`; Kolonietransfers, Reaktorladung (`SpacecraftEngineeringService`) und Handelspostenkonten (`TradeAccountTransferService`) besitzen zusätzliche Einstiegspunkte. Reiner Ausbau der Nearby-Schaltfläche wäre unvollständig.

STU `BeamBlockerShipSystem` belegt nur Dauerbetrieb und 0 EPS. `SpacecraftSystemCreation.getDefaultSystems` vergibt es automatisch an Stationen. In der untersuchten aktuellen STU-Quelle fand sich außerhalb Typ/Registry/Erzeugung keine explizite Beamblocker-Transferprüfung. Die im SWU-Ticket verlangte atomare Sperre bleibt der maßgebliche Funktionsvertrag; eine vermeintlich vollständige STU-Transfermatrix wird nicht behauptet.

## Offene Frage

Wie wird der Störsender in SWU verfügbar? STU-Default für Stationen würde beim erweiterten Ticketvertrag jede Station vom Waren-/Crewtransfer ausschließen.

**Empfehlung zur Freigabe:** optionales herstellbares Spezialmodul für beide Fraktionen und für Schiffe/Stationen, keine automatische Ausstattung vorhandener oder neuer Stationen. Ein eingebautes intaktes Modul ist immer aktiv; Abschalten erfolgt durch Ausbau. Einstiegskosten/Rezeptur wie Crewtransport-Modul Stufe I: 8.000 Credits, 300 Durastahl, 30 Kyber-Kristalle, 80 Tibanna-Gas, 200 kristallines Silizium, 100 Energiemodule, Bauzeit 100; Forschung Transporttechnik I. Dies sind vorgeschlagene neue Spieldaten, noch keine Entscheidung.

## Vorbereiteter Restauftrag nach Freigabe

- [ ] Zentrale Prüfung unter den bestehenden Ressourcen-/Schiffssperren: beide Seiten bei Schiff↔Schiff (Waren, Torpedolagerware, Crew, Reaktorladung), die Schiffseite bei Kolonie↔Schiff und Schiff↔Handelspostenkonto; bei stationärem Posten auch dessen Stationsschiff. Menüs/Quotes zeigen denselben Grund, die Mutation prüft nochmals.
- [ ] Sammelwaren-/Reaktor-Eigenverbrauch, EPS-Transfer, Entsorgung, Schiff-/Stationsproduktion, Demontage, Rettungsevakuierung und rein kontobasierter Handel ohne beteiligtes Schiff sind keine Waren-/Crewtransferaktion. Keine globale Lager- oder Dockingsperre einführen. Wrackbergung prüft das bergende Schiff; der zerstörte Sender des Wracks sperrt nicht mehr.
- [ ] Passive Laufzeit benutzt Integrität > 0, ohne manuellen Toggle/Activation-Kosten. Zerstörung hebt die Sperre auf, Reparatur stellt sie wieder her.
- [ ] PostgreSQL-Matrix prüft beide Richtungen, gemischte Warenzeilen, Crew/geladenen Reaktor, Quelle/Ziel, Defekt/Reparatur, Parallelität und vollständigen Rollback. UI-Ablehnungsgrund und fehlender Toggle getestet.

## Comments

- 2026-11-16 – Triage: Funktionsmatrix konkretisiert. Neue Ausstattungs-/Fertigungsentscheidung erforderlich; optionales Modul statt automatischem Stationssystem vorgeschlagen, daher needs-info. Siehe [Audit](../triage-2026-11-16.md).
