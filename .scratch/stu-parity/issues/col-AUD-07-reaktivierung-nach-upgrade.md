# Reaktivierung nach Upgrade wie STU

**Status:** resolved
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

Wird in STU ein aktives Gebäude ausgebaut, das Orbitalwartung (Ware 1801) liefert, schaltet STU alle Orbitalgebäude ab, die diese Wartung verbrauchen. Diese Felder merkt es sich in `reactivate_after_upgrade = <Feld-ID>`. Ist das Upgrade fertig und ließ sich aktivieren, schaltet STU genau diese Felder wieder ein und meldet „Es wurden %d Orbitalgebäude reaktiviert“. Konnte das Upgrade nicht aktiviert werden, löscht STU die Markierungen.

SWU setzt `reactivateAfterUpgrade` nur am Upgrade-Feld selbst und liest den Wert nirgends. Die Verbraucher laufen während der Bauzeit ohne Wartung weiter. Danach bleiben sie aus, und der Spieler muss jedes Orbitalgebäude von Hand einschalten.

## STU-Quellen

- `src/Module/Colony/Lib/BuildingActionEffects.php` (`handleOrbitalMaintenanceRemovalForUpgrade`, Z. 181–211)
- `src/Component/Building/ColonyBuildingEffects.php` (Z. 136–147, Markierung `reactivate_after_upgrade`)
- `src/Component/Building/BuildingReactivationHandler.php` (`handleAfterUpgradeFinish`, Z. 18–39, 75–92)
- `src/Module/Colony/Action/UpgradeBuilding/UpgradeBuilding.php`
- `src/Orm/Entity/PlanetField.php` (`reactivate_after_upgrade`, Z. 51/322)

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-construction.service.ts` (`upgradeBuilding` Z. 1084–1114; `deactivateDependentBuildings` Z. 757–775, bisher nur bei Abriss Z. 837 und Deaktivierung Z. 1151)
- `apps/backend/src/modules/colony/building-lifecycle.service.ts` (`finishBuilding` Z. 29–52; Rücksetzen Z. 184)
- `apps/backend/src/modules/colony/colony-abandonment.service.ts` (Z. 122), Sandbox-Snapshot (`colony-sandbox.service.ts`)
- `apps/backend/src/modules/colony/entities/colony-field.entity.ts` (`reactivateAfterUpgrade`)
- Spielermeldungen des Kolonie-/Bau-Ticks (`apps/backend/src/modules/tick/tick.service.ts`)

## Akzeptanzkriterien

- [x] Beim Upgrade eines aktiven Gebäudes, das Orbitalwartung liefert, schaltet SWU alle aktiven Verbraucher der Orbitalwartung ab, so wie `deactivateDependentBuildings` es beim Abriss tut. Jedes betroffene Feld erhält `reactivateAfterUpgrade = <ID des Upgrade-Felds>`.
- [x] Das Upgrade-Feld selbst wird nicht mit dem eigenen ID-Wert markiert, sondern verhält sich wie in STU (Aktivierung nach Fertigstellung über `activateAfterBuild`).
- [x] Bei Fertigstellung und erfolgreicher Aktivierung des Upgrades schaltet SWU alle Felder mit `reactivateAfterUpgrade = <Feld-ID>` wieder ein (nur wenn Aktivierung möglich ist: Energie, Arbeiter, Schaden). Danach wird die Markierung gelöscht. Der Spieler erhält die Meldung „Es wurden n Orbitalgebäude reaktiviert“.
- [x] Ließ sich das Upgrade nicht aktivieren oder wurde es abgebrochen bzw. das Feld abgerissen, werden die Markierungen ohne Reaktivierung gelöscht.
- [x] Die Logik gilt auch für die minütliche Fertigstellung (`tick.service.ts`).
- [x] Backend-Tests: Upgrade einer Wartungsquelle schaltet Verbraucher ab und markiert sie; Fertigstellung reaktiviert und meldet; Fertigstellung ohne Aktivierung löscht die Markierungen; Upgrade eines Gebäudes ohne Wartungsfunktion ändert nichts an anderen Feldern.
- [x] Frontend: Die Meldung erscheint im Meldungsbereich. Wenn der Upgrade-Dialog dazu einen Hinweis bekommt („n Orbitalgebäude werden während des Ausbaus abgeschaltet“), wird er getestet.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt H „Kolonie“ (Keine Reaktivierung nach Upgrade).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Große Abweichung Nr. 5, Unsicherheit Nr. 6.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt.

- 2026-11-18: **Umgesetzt und geprüft.** Beim Upgrade einer aktiven Quelle von Orbitalwartung (1801) werden aktive Verbraucher abgeschaltet und mit der tatsächlichen ID des Quellfelds markiert. Das Quellfeld selbst bleibt unmarkiert; `activateAfterBuild` erhält seinen Aktivierungszustand. Untergrundlogistik (1802), zuvor inaktive Gebäude und Markierungen anderer Upgrade-Quellen werden nicht übernommen.
- Der gemeinsame Bauabschluss prüft die vorhandenen Aktivierungsregeln und reaktiviert markierte, fertige Verbraucher einzeln unter Berücksichtigung von Arbeitern, Energie, Schaden und verfügbarer Wartung. Anschließend werden alle zur Quelle gehörenden Markierungen entfernt, einschließlich alter Selbstmarkierungen. Bei deaktiviertem bzw. nicht aktivierbarem Upgrade, bei Ersatz einer Baustelle und beim Abriss werden Markierungen ohne unzulässige Reaktivierung bereinigt. Die bestehende Abgabe-Bereinigung löscht bereits sämtliche Markierungen. Fertigstellung liefert einen optionalen `reactivatedCount` im bestehenden `BUILDING_FINISHED`-Ereignis; persistierte Kolonienachricht und Meldungsbereich zeigen „Es wurden n Orbitalgebäude reaktiviert“. Der minütliche Runner verwendet unverändert denselben gemeinsamen Bauabschluss. Kein zusätzlicher Upgrade-Dialoghinweis erforderlich.
- **Prüfnachweis:** 15 neue Tests in `building-upgrade-reactivation.spec.ts` prüfen Markierung/Abschaltung, erfolgreiche Reaktivierung, deaktivierte und nicht aktivierbare Quellen, Arbeiter-/Energie-/Schadens-/Wartungsgrenzen, alte Selbstmarkierungen, Abbruch durch Ersatz, abgerissene Verbraucher sowie Nachricht und Socket-Ereignis aus dem echten minütlichen Runner. Zusammen mit den bestehenden Kolonie-/Reparatur-, Nachrichten- und Modulgraph-Tests: 253 Backend-Tests und ein Snapshot erfolgreich. Vier Frontend-Tests prüfen die echte `AppShell`-Meldungsanzeige, einschließlich summierter Reaktivierungen bei weiteren Tick-Ereignissen, sowie bestehende Rahmenfunktionen. `npx nx run-many --targets=typecheck --projects=backend,frontend,shared`, Frontend-/Shared-Lint und gezielter Backend-ESLint sowie `npx nx run-many --targets=build` erfolgreich. Lint ohne Fehler (bestehende Warnungen); Builds mit bestehenden CSS-/Chunk-Warnungen. Frontend-Meldung in gerenderten DOM-Tests geprüft; kein Live-Spieldaten- oder PostgreSQL-Test behauptet.
- **Routing/Modelle:** Wegen der Spielregeln, Markierungslebensdauer und Tick-Anbindung direkt im aktiven Sitzungsmodell geplant, umgesetzt und abschließend gegen Akzeptanzkriterien und Diff geprüft. GPT-6.1 Sol ist in dieser laufenden Sitzung nicht umschaltbar; Workflow-Fallback verwendet, kein Luna-Codingauftrag. Keine messbaren Token-/Einsparungszahlen verfügbar. Vorhandene Workspace-Änderungen bleiben erhalten; in `colony-tick.spec.ts` werden ausschließlich die zwei veralteten Erwartungen einer Selbstmarkierung angepasst.
