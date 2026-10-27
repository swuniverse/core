# Ebenenkenntnis je Spieler und Kartenzyklus

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Spieler sehen nur noch Kartenebenen, die sie kennen, wie STU `UserLayer`. Die Ebenen-API, die Sternenkarte und der Ebenenfilter der Datenbank zeigen nur bekannte Ebenen. Für unbekannte Ebenen antwortet die API mit 403. Ist eine Ebene vollständig erkundet, wechselt sie für den Spieler in den Status „erkundet“ (STU `MAPTYPE_LAYER_EXPLORED`). Den Award der Ebene hängt soc-G2b an das hier ausgelöste Ereignis.

## STU-Quellen

- `src/Orm/Entity/UserLayer.php` (`mapping_type`), `src/Component/Map/MapEnum.php`
- `src/Component/Player/Register/PlayerDefaultsCreator.php#createDefaultUserLayer` (Startebene bei Registrierung)
- `src/Module/Spacecraft/View/ShowSpacecraft/ShowSpacecraft.php#createUserLayerIfNecessary` (Ebene wird bekannt, sobald ein eigenes Schiff dort ist)
- `src/Module/Starmap/View/ShowSection/*` (`hasSeen`, sonst Zugriff verweigert)
- `src/Module/Maintenance/MapCycle.php`: Ist alles kartiert, gilt `LAYER_EXPLORED`. STU **löscht** dabei den persönlichen Nebel (`truncateByUserAndLayer`) und vergibt den Award der Ebene.
- `src/Module/Database/View/Category/*` (`getKnownByUser`)

## SWU-Pfade

- `apps/backend/src/modules/starmap/starmap.controller.ts` (`GET layers` ~Z. 93, alle `layers/:layerId/*`), `starmap.service.ts#getLayers` (filtert heute nur `isHidden`)
- `apps/backend/src/modules/starmap/exploration.service.ts`, `entities/exploration-state.entity.ts` (TERRAIN/FULL), `entities/layer.entity.ts`
- `apps/backend/src/modules/onboarding/onboarding.service.ts` (Startebene)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (Positionswechsel, später Wurmloch tmw-K7a)
- `apps/frontend/src/pages/starmap.tsx`, `apps/frontend/src/pages/database.tsx` (Auswahlfeld „Kartenebene“)
- Wartungsgerüst: sh-AP-07

## Akzeptanzkriterien

- [ ] Eine Entität „bekannte Ebene“ (Spieler × Ebene, Status `KNOWN | EXPLORED`, Zeitpunkt) ist per Migration angelegt. Bestandsspieler erhalten alle Ebenen, auf denen sie Kolonien, Schiffe oder Erkundungsdaten haben.
- [ ] Ebenen werden bekannt durch die Startebene beim Onboarding bzw. bei der Fraktionswahl und automatisch, sobald ein eigenes Schiff die Ebene erreicht (alle Positionswechsel inkl. Wurmloch aus tmw-K7a).
- [ ] `GET starmap/layers` liefert nur bekannte, nicht versteckte Ebenen. Alle `layers/:layerId/*`-Endpunkte antworten für unbekannte Ebenen mit 403. Admins bzw. Karteneditoren sind ausgenommen.
- [ ] Die Datenbankfilter (Sternensysteme, Systemtypen, Planetentypen) bieten nur bekannte Ebenen an.
- [ ] Ein täglicher Wartungsjob (sh-AP-07, falls vorhanden, sonst eigener Cron) setzt `EXPLORED`, sobald alle Felder der Ebene erkundet sind, löscht die persönlichen Felderkundungsdaten dieser Ebene und löst einmalig je Spieler und Ebene das interne Ereignis „Ebene vollständig erkundet“ aus. Die Award-Vergabe folgt in soc-G2b.
- [ ] Für Ebenen im Status `EXPLORED` liefern die Karten-Endpunkte die Ebene wie vollständig erkundet (STU `hasExplored`); Systementdeckungen und Kartographiepläne bleiben unverändert.
- [ ] Eine ADR `docs/adr/<nächste freie Nummer>-ebenenkenntnis-und-kartenzyklus.md` (Format wie bestehende ADRs) beschreibt Ebenenkenntnis, Kartenzyklus und das Verhältnis zu ADR-0002/0003; `CONTEXT.md` führt die Begriffe „bekannte Ebene“ und „erkundete Ebene“.
- [ ] Backend-Tests: Bekanntwerden, 403 für unbekannte Ebenen, Migration der Bestandsdaten, Zyklus (Status, Löschung der Feldeinträge, Ereignis genau einmal, Karte danach vollständig sichtbar, Systementdeckung unverändert). Frontend-Tests: Die Ebenenauswahl zeigt nur bekannte Ebenen.

## Entscheidung

Vorgabe:
1. Bekanntwerden (a), wie STU: Startebene bei Fraktionswahl bzw. Onboarding, danach automatisch, sobald ein eigenes Schiff die Ebene erreicht (Galaxieflug, Wurmloch). Keine Freigabe über Forschung oder Admin (Admins bzw. Karteneditoren sehen ohnehin alle Ebenen).
2. Kartenzyklus (a), wie STU `MapCycle`: Hat ein Spieler alle Felder einer Ebene erkundet, wird der Status `EXPLORED` gesetzt, die persönlichen Felderkundungsdaten (Nebel-Einträge) dieser Ebene werden gelöscht und das Ereignis „Ebene vollständig erkundet“ ausgelöst (Award über soc-G2b). Semantik wie STU: Eine Ebene im Status `EXPLORED` gilt für den Spieler als vollständig aufgedeckt (STU `hasExplored`), die Kartendarstellung hängt dann nicht mehr an den gelöschten Feldeinträgen. Persönliche Systementdeckung und Kartographie (ADR-0002/0003) bleiben unberührt. Weil damit das persönliche Kartenwissen berührt wird, ist eine ADR nötig.

## Comments

- 2026-10-21 Product Owner: Option 1a, 2a – Ebenen werden wie in STU bekannt (Startebene beim Onboarding, danach automatisch, sobald ein eigenes Schiff die Ebene erreicht, 1a). Der Kartenzyklus wird wie in STU übernommen: Status „erkundet“, Ereignis für den Award und Löschen der persönlichen Felderkundung der Ebene (2a).
