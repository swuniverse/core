# Kooperationsuplink für fremde Crew

**Status:** needs-info
**Priority:** P3
**Size:** M
**Blocked by:** sc-WP-CREW-3c, sc-WP-STAT-3b

## Ziel

Ein Kooperationsuplink bildet den STU-Uplink ab und erlaubt berechtigten fremden Spielern, eine begrenzte Zahl eigener Crewmitglieder auf einer Station zu stationieren. Der Uplink arbeitet nur mit ausreichender Crew des Eigentümers, verbraucht im Betrieb Energie und schaltet sich passend zum Crewbestand ein oder aus.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Component/Spacecraft/System/Type/UplinkShipSystem.php`
- `Lib/Transfer/Wrapper/SpacecraftStorageCrewLogic.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/`
- `apps/backend/src/modules/crew/`
- `apps/frontend/src/pages/spacecraft/`
- `packages/shared/`
- `game-data/data/modules/special.yaml`

## Akzeptanzkriterien

- [ ] Intakter Kooperationsuplink erlaubt auf Stationen Crew genau der Spieler, die nach den Dockingrechten berechtigt sind.
- [ ] Höchstens drei fremde Spieler sind gleichzeitig vertreten; je fremdem Spieler ist zunächst genau ein Crewmitglied zugelassen.
- [ ] Aktivierung verlangt mindestens die reguläre Sollcrew des Eigentümers und mindestens ein fremdes Crewmitglied.
- [ ] Der Uplink verbraucht im Betrieb 5 EPS je Haupttick und schaltet sich ohne fremde Crew aus beziehungsweise bei erfüllten Bedingungen wieder ein.
- [ ] Crewtransfer meldet verständlich verweigerte Rechte, defekten Uplink, belegte Fremdspielerplätze und fehlende Eigentümercrew.
- [ ] Shared-DTOs und verdichtete Stations-UI zeigen Zustand und Belegung.
- [ ] Service- und Integrationstests decken Transfer, Rechte, Limits, Aktivierung und Tickverbrauch ab.

## Triage

Crew-Eigentum und exklusive Ortszuweisung sind vorhanden (`CrewAssignment`, `SpacecraftCrewService`, `EscapePodService`); Dockingrechte existieren. Ein Uplink-System, Fremdspielerlimit und Tickverbrauch fehlen. `CrewEnhancementService` bearbeitet zugewiesene Slots, während die bestehende Slotverwaltung eigene Crew am eigenen Schiff verlangt: Fremdcrew darf nicht still als Eigentümer-Sollcrew oder mit neuen Bonusregeln gezählt werden.

STU `SpacecraftSystemCreation` stattet **Sensorstationen** mit Uplink aus. `UplinkShipSystem` verlangt Eigentümer-Sollcrew und Fremdcrew, kostet 0 EPS zur Aktivierung und 5 EPS pro Tick. `SpacecraftStorageCrewLogic` prüft Dockingrechte beim Hinzufügen, höchstens drei Fremdspieler und einen Crewman pro Spieler. Ein eindeutiger nachträglicher Entzug-/Evakuierungsvertrag fehlt in diesen Quellen.

## Offene Frage

Welche Stationen erhalten den Uplink, und was geschieht mit schon stationierter Fremdcrew nach Rechteentzug oder Systemausfall?

**Empfehlung zur Freigabe:** als kostenloses eingebautes System nur an Sensorphalanx-Stationen (Rolle `SENSOR`, beide Fraktionen), auch für vorhandene Sensorstationen; keine frei montierbare Erweiterung aller Stationsrollen. Nach Rechteentzug bleiben Crew-Eigentum und Ort erhalten, weitere Einlieferung ist gesperrt. Der Crew-Eigner darf seine Crew an einem eigenen erreichbaren Schiff weiterhin abziehen, auch bei defektem/deaktiviertem Uplink oder entzogenem Dockingrecht; Positions-/Schild-/Transportsicherheitsregeln und ein vorhandener Transferstörsender gelten weiter. Keine sofortige automatische Evakuierung allein durch Rechteentzug/EPS-Mangel. Bei echter Stationszerstörung die vorhandene Rettungskapsel-Evakuierung für alle Eigner nutzen; Demontage/Aufgabe darf keine fremde Crew still löschen. Dies ist ein Vorschlag, noch keine Freigabe.

## Vorbereiteter Restauftrag nach Freigabe

- [ ] Drei verschiedene Fremdeigner, je ein Crewmitglied, zusätzlich normale Gesamtquartiergrenze; nur der Crew-Eigner liefert seine Crew ein/zieht sie ab, der Stationsbesitzer erhält keine Verfügungsrechte über fremde Crew.
- [ ] Neue Aufnahme prüft aktuelle Dockingrechte, intakten Uplink, freie Plätze und ausreichend Eigentümercrew unter gemeinsamen Sperren. Fremdcrew zählt nicht zur Eigentümer-Sollcrew; keine neuen Stationsbonus-/XP-Regeln aus diesem Ticket ableiten.
- [ ] System läuft automatisch genau bei intaktem Uplink, ausreichender Eigentümercrew und mindestens einem Fremdcrewmitglied. Je Tick 5 EPS; bei unzureichender EPS kein negativer Bestand. Nach wieder erfüllten Bedingungen Wiederaufnahme; Zustands-/Crewänderungen werden erneut geprüft.
- [ ] Crew-Eigner sieht seine stationierte Fremdcrew mit Ort und Abziehen-Aktion, Stationseigner sieht Belegung mit Eignern und Ablehnungsgründen. Kein Eigentümerwechsel durch Transfer.
- [ ] PostgreSQL prüft konkurrierende Aufnahme des dritten/vierten Eigners, doppelte Crew, Quartiergrenze, Rechteentzug, Defekt, EPS-Mangel, Rückholung, Zerstörung/Demontage und Rollback; Tick-/Frontendtests prüfen 5-EPS-Verbrauch und Belegungsanzeige.

## Comments

- 2026-11-16 – Triage: STU-Rollenbindung und offene Crew-Rückholregeln identifiziert. Konkreter Vorschlag liegt vor, aber verfügbare Stationsrollen und Entzugspolitik sind Produktentscheidungen: needs-info. Siehe [Audit](../triage-2026-11-16.md).
