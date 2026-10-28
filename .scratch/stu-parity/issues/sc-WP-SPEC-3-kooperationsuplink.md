# Kooperationsuplink für fremde Crew

**Status:** needs-triage
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

## Comments
