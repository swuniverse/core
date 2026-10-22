# Alarmreaktion beim Einflug

**Status:** needs-info
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-COMBAT-2

## Ziel

Fliegt ein Schiff auf ein Feld, auf dem fremde Schiffe mit Alarmstufe Gelb oder Rot stehen, greifen diese wie in STU automatisch an: Gelb nur bei Haltung „Feind“, Rot gegen alle außer Freunden. Zieht der Einfliegende ein Schiff per Traktor, erhalten Betroffene den Trojanisches-Pferd-Hinweis.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Lib/Battle/AlertDetection/{AlertDetection,AlertedShipsDetection,SkipDetection,TrojanHorseNotifier,AlertReactionFacade}.php`
- `Module/Spacecraft/Lib/Battle/AlertLevelBasedReaction.php`
- `Module/Spacecraft/Lib/Movement/Component/Consequence/Flight/AlertStateConsequence.php`
- `Module/Spacecraft/Action/InterceptShip` (Alarmreaktion nach Abfangen)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`navigate`, `flyGalaxy`, `enterSystem`, `leaveSystem`, `processMovement`)
- `apps/backend/src/modules/spacecraft/hyperdrive-disruption.service.ts`
- `apps/backend/src/modules/combat/combat.service.ts` (Parteienkampf aus sc-WP-COMBAT-2)
- `apps/backend/src/modules/alliance/relationship-resolver.service.ts`, `CONTEXT.md` (Haltung)
- `apps/frontend/src/components/spacecraft/NavigationPanel.tsx`, `CombatReportDialog.tsx`

## Akzeptanzkriterien

- [ ] Nach jedem Feldwechsel (auch Flotte, auch Ankunft aus dem Hyperraum) wird das Zielfeld auf alarmierte fremde Schiffe geprüft.
- [ ] Gelb reagiert nur auf Haltung „Feind“, Rot auf alle Nicht-Freunde (STU `SkipDetection`); Freunde, eigene Schiffe und Urlauber werden nie angegriffen.
- [ ] Ein Traktor-Gespann eines Freundes löst keinen Angriff aus; betroffene Spieler erhalten den Trojanisches-Pferd-Hinweis (aktiv, sobald sc-WP-TRACT-1a existiert).
- [ ] Getarnte Einflieger lösen keine Reaktion aus (aktiv, sobald sc-WP-CLOAK-1a existiert).
- [ ] Der Flug endet mit dem Kampfbericht; zerstörte Einflieger fliegen nicht weiter, Flotten brechen den Flug ab.
- [ ] Backend-Tests je Alarmstufe und Haltung, Flug-Abbruch; Frontend-Test zeigt den Bericht nach Flug.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-10-22 Blocker: Die Akzeptanzkriterien verlangen Alarmreaktion nach jedem Feldwechsel einschließlich Flottenflug, Hyperraumankunft, Traktor-Trojanerhinweis und getarnten Einfliegern. Die dafür vorausgesetzten Mechaniken sc-WP-TRACT-1a und sc-WP-CLOAK-1a sind noch nicht umgesetzt; zugleich liefert die bestehende Navigations-API nur ein `Spacecraft` und hat keinen Vertrag für einen Kampfbericht. Bitte entscheiden, ob dieses Issue bis zu diesen Abhängigkeiten blockiert werden soll oder ob ein Teilscope mit neuem Movement-Result-DTO zulässig ist.

- 2026-10-21 Hinweis aus soc-B1b (Option b): Ein persönlicher Feind-Kontakt ergibt Haltung „Feind“ auch innerhalb derselben Fraktion. Die Alarmreaktion liest die Haltung ausschließlich über den Relationship-Resolver und braucht dafür keine Sonderlogik.
