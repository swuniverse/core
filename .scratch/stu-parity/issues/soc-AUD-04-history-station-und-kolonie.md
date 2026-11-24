# Globale History: STATION- und COLONY-Ereignisse schreiben

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Die globale History kennt die Typen STATION und COLONY, schreibt sie aber nie. Stationszerstörungen und -übernahmen landen als SHIP, weil `recordSpacecraft` überall mit `GameEventType.SHIP` aufgerufen wird. Zerstörte Koloniegebäude und verlassene Handelsposten erzeugen gar keinen Eintrag. Die Filter „Stationen“ und „Kolonien“ in `/events` sind deshalb immer leer. STU ordnet den Typ zentral nach dem Ziel zu (Station → STATION, Kolonie → COLONY) und erzeugt Einträge auch bei Gebäudezerstörung und beim Verlassen von Handelsposten.

## STU-Quellen

- `src/Module/History/Lib/EntryCreator.php` (`addEntry`: Typ aus Ziel ableiten)
- `src/Component/History/HistoryTypeEnum.php`
- `src/Module/Spacecraft/Lib/Battle/Weapon/EnergyWeaponPhase.php` und `ProjectileWeaponPhase.php` („Das Gebäude %s auf Kolonie %s wurde von der %s zerstört“)
- `src/Module/Spacecraft/Lib/Destruction/Handler/HistoryEntryCreation.php` (Zerstörung, Typ nach Ziel)
- `src/Module/Spacecraft/Lib/Interaction/ShipTakeoverManager.php` (Übernahme)
- `src/Component/Player/Deletion/Handler/TradepostDeletionHandler.php` („Der Handelsposten in Sektor … wurde verlassen.“)
- `src/html/view/history.twig`

## SWU-Pfade

- `apps/backend/src/modules/events/game-event.service.ts` (`recordSpacecraft`, `recordAlliance`; neu z. B. `recordColony`)
- `packages/shared/src/lib/common/index.ts` (`GameEventType`)
- `apps/backend/src/modules/spacecraft/spacecraft-destruction.service.ts` (Z. ~134, ~241)
- `apps/backend/src/modules/spacecraft/spacecraft-takeover.service.ts` (Z. ~133)
- `apps/backend/src/modules/spacecraft/hyperdrive-disruption.service.ts` (Z. ~159)
- `apps/backend/src/modules/combat/combat.service.ts` (`attackColony`, Gebäudeschaden)
- `apps/backend/src/modules/trade/player-trade-post.service.ts` (`destroyForStation`, `abandonOwnedBy`)
- `apps/frontend/src/pages/events.tsx`, `apps/backend/src/modules/events/events.int-spec.ts`, `game-event.service.spec.ts`

## Akzeptanzkriterien

- [x] `GameEventService` leitet den Typ für Raumfahrzeuge selbst aus `kind` ab (Station → STATION, sonst SHIP), wie STU `EntryCreator`; Aufrufer übergeben den Typ nicht mehr frei. Die bestehenden Aufrufer (Zerstörung, Übernahme, Hyperraum-Abfang) schreiben damit Stationsereignisse als STATION.
- [x] Neue Methode für Kolonieereignisse mit Ortsauflösung (System, Koordinaten) analog zu `recordSpacecraft`.
- [x] Ein bei einem Kolonieangriff auf Integrität 0 gebrachtes Gebäude erzeugt einen COLONY-Eintrag „Das Gebäude <Name> auf Kolonie <Name> wurde von der <Schiff> zerstört“ (je zerstörtem Gebäude, im selben Kampf-Transaktionskontext).
- [x] Das Verlassen bzw. Aufgeben eines Spieler-Handelspostens (Kontolöschung, `abandonOwnedBy`) erzeugt einen STATION-Eintrag „Der Handelsposten in Sektor <x|y> wurde verlassen.“.
- [x] Die Typfilter „Stationen“ und „Kolonien“ in `/events` zeigen die neuen Einträge, die Zähler stimmen, Ortslink funktioniert.
- [x] Keine Rückwirkung auf bestehende SHIP-Einträge (keine Datenmigration nötig; optional dokumentieren).
- [x] Backend-Tests: Stationszerstörung → STATION, Schiffszerstörung → SHIP, Gebäudezerstörung → COLONY, Postenaufgabe → STATION; Integrationstest für Filter.
- [x] Frontend-Test: Filter Stationen/Kolonien listen passende Einträge.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt B8 und E („History-Typen STATION/COLONY“); [social.md](../audit-2026-11-17/social.md) Große Abweichung 4.
- `map.md`, Duplikattabelle: „Fehlende Prestigequellen, History-Erzeuger je Bereich → im jeweiligen Fachissue (soc-H2)“. Dieser Querverweis wurde nicht eingelöst: `sc-WP-COMBAT-3-zerstoerungsfolgen.md` und `sc-WP-CREW-4b` setzen nur SHIP um. Dieses Ticket übernimmt die History-Erzeuger für STATION/COLONY zentral; der map.md-Eintrag soc-H2 ist damit für die History überholt.

## Comments

### 2026-11-24 – umgesetzt, Prüfung ausstehend

Commit: `feat(events): STU station and colony history entries (stu-parity soc-AUD-04)`.

- `GameEventService.recordSpacecraft(text, ship, manager?)` leitet den Typ aus `kind` ab (STATION/SHIP), Typ-Parameter entfernt; Aufrufer (Zerstörung, Selbstzerstörung, Übernahme, Hyperraum-Abfang) angepasst.
- Neu: `recordColony(text, colony, manager?)` (SpaceLocation über `systemFieldId`, Fallback `resolveColonyLocation`) und `recordStation(text, locationId, manager?)`.
- `CombatService.attackColony`: je Feld mit Status `DESTROYED` ein COLONY-Eintrag „Das Gebäude <Name> auf Kolonie <Name> wurde von der <Schiff> zerstört“, nach dem Speichern der Felder (attackColony hat keine eigene Transaktion). `EventsModule` in `CombatModule` importiert.
- `PlayerTradePostService.abandonOwnedBy`: STATION-Eintrag „Der Handelsposten in Sektor x|y wurde verlassen.“ in der Löschtransaktion; `EventsModule` in `TradeModule`.
- Bestehende SHIP-Einträge bleiben unverändert, keine Datenmigration.
- Frontend unverändert (Labels Station/Kolonie entsprechen STU `HistoryTypeEnum`), Filtertest ergänzt.

Checks gelaufen: `nx typecheck backend` grün; Jest unit (events, combat.service, spacecraft-destruction/-takeover, hyperdrive-disruption) 68/68; Jest integration (events.int-spec inkl. neuem STATION/COLONY-Filtertest, player-trade-post-lifecycle mit STATION-Eintrag, player-trade-post, trade-deletion, foreign-crew, trade-auctions, row-lock-relations) 38/38; vitest `events.spec.tsx` 7/7; eslint geänderte Backend-Dateien 0 Fehler; `nx lint frontend` grün.

Offen: gesammelter Verifikationslauf (volle Backend-Unit-/Integrationssuite, Review des Diffs gegen die AK).

Modell: Claude Opus 5.5 direkt implementiert (Sol/Luna in dieser Session nicht verfügbar).

