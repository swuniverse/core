# Maintenance: Kolonie-/Spacecraft-Korrektur, defekte Flotten, Noobzone-Hinweis

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** sh-AUD-11a, sc-AUD-05a

## Ziel

Weitere STU-Wartungshandler ohne SWU-Gegenstück (ohne Piraten/Quests/Orion, ohne Betriebshandler):

1. **Kolonie-Korrektur** (`ColonyCorrectorHandler` → `ColonyCorrector::correct`): berechnet je Kolonie Arbeiter, Wohnraum, Lager, EPS-Maximum usw. aus den aktiven Gebäuden neu und korrigiert abweichende gespeicherte Werte (Log der Korrekturen).
2. **Spacecraft-Korrektur** (`SpacecraftCorrectorHandler` → `SpacecraftCorrector::correctAllSpacecrafts`): wendet je Spieler-Bauplan die Modulwerte erneut auf alle Schiffe an und loggt Abweichungen (z. B. nach Datenänderungen an Rümpfen/Modulen).
3. **Defekte Flotten** (`CorruptFleetDeletion`): löst Nicht-NPC-Flotten ohne Schiffe oder über 100 Crew auf (Schiffe verlassen die Flotte, Führungskennzeichen entfernt). Die 100-Crew-Regel selbst kommt mit sc-AUD-05a; dort ist auch der Umgang mit Bestandsflotten festzulegen. Dieses Ticket setzt den Wartungshandler danach um.
4. **Noobzone-Hinweis** (`UserInformation`): Systemnachricht an Spieler mit Kolonie in einer Noobzone-Ebene, wenn die Registrierung genau 4 bzw. 5 Monate (Tagesfenster) zurückliegt, mit Hinweis auf das Ende der Noobzone-Kolonisierung. SWU begrenzt die Noobzone-Kolonisierung bereits über das Kontoalter (`STARTER_NOOBZONE_MAX_ACCOUNT_AGE_MS`); Fristen und Text an diesen Wert anpassen, Star-Wars-Wortlaut.

Bewusst nicht übernommen bzw. bereits abgedeckt (im Ticket nur dokumentieren): `DatabaseBackup` (Betrieb), `OldTachyonScanDeletion` (SWU hat keine Scan-Tabelle, Tachyon-Scan läuft mit Ablaufzeit im Laufzeitsystem), `OldFlightSignatureDeletion` (SWU löscht im Haupttick über `FlightSignatureService#deleteExpired`), `CreateInterstellarMedia` (sc-AUD-12a), `GameRequestCleanUp` (kein GameRequest-Log), `BeginPirateRound`, `PirateWrathDecreaser`, `OrionSlaveTrade` (out of scope).

## STU-Quellen

- `src/Module/Maintenance/services.php` (Z. 30–53)
- `src/Module/Maintenance/ColonyCorrectorHandler.php`, `src/Module/Colony/Lib/ColonyCorrector.php`
- `src/Module/Maintenance/SpacecraftCorrectorHandler.php`, `src/Module/Spacecraft/Lib/Creation/SpacecraftCorrector.php`
- `src/Module/Maintenance/CorruptFleetDeletion.php`, `src/Component/Game/GameEnum.php` (`CREW_PER_FLEET = 100`)
- `src/Module/Maintenance/UserInformation.php` (4/5 Monate, `getNoobzoneLayerNames`)

## SWU-Pfade

- `apps/backend/src/modules/tick/tick.module.ts` (`MAINTENANCE_HANDLERS`), `maintenance.service.ts`
- `apps/backend/src/modules/colony/colony-stats.service.ts` (`calculateSummary`, `syncLegacyColonySnapshot`), `colony/entities/colony-stats.entity.ts`, `colony-changeable.entity.ts`
- `apps/backend/src/modules/shipbuilding/` (`ShipbuildingCoreService`, `applyStats`), `apps/backend/src/modules/spacecraft/entities/spacecraft.entity.ts`
- `apps/backend/src/modules/spacecraft/entities/fleet.entity.ts`, `fleet-leadership.ts`
- `apps/backend/src/modules/colonization/colonization.service.ts` (`STARTER_NOOBZONE_MAX_ACCOUNT_AGE_MS` Z. ~169, Noobzone-Status Z. ~877–935), `apps/backend/src/modules/starmap/entities/layer.entity.ts` (`isNoobzone`)
- `apps/backend/src/modules/messaging/` (`sendSystem`)

## Akzeptanzkriterien

- [ ] Handler `colony-corrector`: berechnet abgeleitete Kolonie-Maxima aus aktiven Gebäuden mit derselben Funktion wie die Live-Berechnung neu und korrigiert Abweichungen; jede Korrektur wird mit Kolonie-ID und Feld geloggt.
- [ ] Handler `spacecraft-corrector`: berechnet abgeleitete Schiffswerte aus Bauplan/Modulen neu und korrigiert Abweichungen; Log je Schiff. Laufende Zustände (aktuelle Hülle, EPS, Schilde) werden nur auf das neue Maximum gekappt, nicht aufgefüllt.
- [ ] Handler `corrupt-fleets`: löst Nicht-NPC-Flotten ohne Schiffe oder über dem Crewlimit aus sc-AUD-05a auf; Besitzer erhält eine Systemnachricht.
- [ ] Handler `user-information`: Noobzone-Hinweis an die Spieler im jeweiligen Tagesfenster, genau einmal je Schwelle; Fristen aus dem SWU-Kontoalterlimit abgeleitet und im Ticket festgehalten.
- [ ] Die nicht übernommenen STU-Handler sind mit Begründung im Ticket-Kommentar und in `map.md` unter „Entscheidungen“ dokumentiert.
- [ ] Backend-Tests je Handler: korrigierter und unveränderter Fall; leere/überfüllte Flotte; Hinweis genau im Tagesfenster und nur mit Noobzone-Kolonie.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt B7 („7 statt ~20 STU-Handler“).
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), G9 (Liste `CorruptFleetDeletion`, `ColonyCorrectorHandler`, `SpacecraftCorrectorHandler`, `UserInformation`, `OldTachyonScanDeletion`).
- PO-Linie 2026-11-17 „wie STU“, ohne Piraten/Quests (Leitplanke 3). Kein bisheriges Ticket.

## Comments
