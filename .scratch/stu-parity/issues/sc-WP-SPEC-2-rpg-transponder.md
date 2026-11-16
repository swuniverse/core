# RPG-Transponder mit Admin-Unsichtbarkeit

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** soc-E3a

## Ziel

Ein RPG-Transponder bildet das STU-RPG-Modul ab. Er kennzeichnet ein Spacecraft als Teil einer administrierten RPG-Szene; Administratoren können es für die Szenenvorbereitung vollständig aus Spieler-Sensorik und Kartenanzeige ausblenden und später wieder einblenden. Die Unsichtbarkeit ist kein spielerseitiges Tarnsystem und gewährt keine taktischen Vorteile.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/SetRpgModuleInvisibility/SetRpgModuleInvisibility.php`
- `Component/Spacecraft/System/Type/RPGShipSystem.php`
- `Component/Spacecraft/System/Data/RpgModuleSystemData.php`
- Sichtbarkeitsfilter in `Orm/Repository/MapRepository.php` und `Orm/Repository/ShipRepository.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/`
- `apps/backend/src/modules/starmap/`
- `apps/backend/src/modules/admin/`
- `apps/frontend/src/pages/admin.tsx`
- `packages/shared/`
- `game-data/data/modules/special.yaml`

## Akzeptanzkriterien

- [ ] RPG-Transponder kann nur über administrierte RPG-Inhalte vergeben beziehungsweise verwendet werden.
- [ ] Nur Administratoren können die RPG-Unsichtbarkeit umschalten.
- [ ] Unsichtbare RPG-Spacecrafts fehlen in Spieler-Sensorik, Kartenbelegung und Echtzeitereignissen; Administratoren können sie weiterhin verwalten.
- [ ] Beim Wiedereinblenden wird der aktuelle Zustand wieder veröffentlicht.
- [ ] Das System beeinflusst keine Tarn-, Kampf- oder Haltungsregeln.
- [ ] Service- und Integrationstests decken Rechte und sämtliche Sichtbarkeitspfade ab.

## Triage und Umsetzungsvertrag

RPG-Plots (`soc-E3a`) existieren, aber weder Transponderzustand noch Admin-Unsichtbarkeit sind implementiert. `isHiddenFromViewer` schützt heute nur fremde getarnte Schiffe; `FlightSignatureService.createMovement` speichert reale Bewegungen. Diese Pfade allein reichen für vollständige RPG-Unsichtbarkeit nicht aus.

STU `SetRpgModuleInvisibility` prüft Adminrolle, eigenes Schiff und eingebautes RPG-System und publiziert Removal/State. Übernehmen: nur Administratoren verwalten den Transponder ihrer eigenen Szenenschiffe; kein Spielerbau-/Fertigungsangebot und keine Vergabe durch Plot-Mitgliedschaft. Einen administrierten RPG-Bezug im Admin-Vertrag explizit erfassen; bestehende öffentliche Plots bekommen dadurch keine zusätzlichen Steuerrechte. Das System kostet 0 EPS und ist unabhängig von `CLOAK`.

## Ergänzte Akzeptanzkriterien

- [ ] Admin-API vergibt/entfernt den Transponder und schaltet Unsichtbarkeit nur für eigene administrierte Szenenschiffe; Rollen-, Eigentums- und RPG-Bezug werden serverseitig geprüft. Entfernen beendet Unsichtbarkeit.
- [ ] Ein separates persistiertes Merkmal und eine gemeinsame Sichtbarkeitsprüfung werden auch für Spieler-Eigentumslisten, direkte Detail-/Zielabfragen, NBS, LSS-Zählungen, Kolonie-/Orbit-Scan, geteilte Positionen, Kartenbelegung und Spieler-Echtzeitereignisse benutzt. Adminverwaltung behält Zugriff.
- [ ] Ausblendung publiziert Entfernung nach Commit an bisherige Zuschauer, Einblendung veröffentlicht den aktuellen Zustand. Verdeckte Bewegung erzeugt keine für Spieler lesbaren neuen Flugsignaturen; vorhandene historische Signaturen werden nicht nachträglich umgeschrieben.
- [ ] Unsichtbare Szenenschiffe nehmen nicht an automatisch ausgelösten Spieler-Kämpfen/Alarmreaktionen teil und erlauben keine Spieler-Fernaktionen als Quelle oder Ziel. Normale Tarnung/Haltung und Kampfregeln sichtbarer Schiffe bleiben erhalten.
- [ ] HTTP-Rechtetests sowie Sichtbarkeits-/Websockettests decken Abwesenheit von IDs und Zählungen, Umschalten, Rollback und Wiederveröffentlichung ab; Frontend testet Adminaktion und unveränderte Spieleransicht.

## SWU-Anker

`spacecraft-cloak.ts`, `starmap-visibility.service.ts`, `nearby-interaction.ts`, `spacecraft.service.ts` (Scans/Listen), `flight-signature.service.ts`, `websocket/game.gateway.ts`, `rpg/rpg-plot.service.ts` und bestehende Admin-Guards. Kein eigener Tarnungsmechanismus.

## Comments

- 2026-11-16 – Triage: Technische Abgrenzung und Admin-/Sichtbarkeitsvertrag konkretisiert; Umsetzung offen, Voraussetzungen erfüllt. Beschränkt auf die schon geforderte administrative Szenenfunktion. Siehe [Audit](../triage-2026-11-16.md).
