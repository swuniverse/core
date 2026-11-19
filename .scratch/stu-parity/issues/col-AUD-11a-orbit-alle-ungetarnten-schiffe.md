# Orbit und Orbitalmanagement listen alle ungetarnten Schiffe wie STU

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

STU listet im Orbit-Kasten von „Informationen“, in der aufklappbaren Orbit-Schiffsliste und im Orbitalmanagement alle ungetarnten Schiffe am Kolonieort. Sie sind nach Flotten gruppiert und mit Besitzer angegeben. Auf fremde Schiffe wirken nur die erlaubten Aktionen, z. B. Batterie laden mit `isFriend`-Prüfung bei aktiven Schilden. SWU listet nur eigene Schiffe.

## STU-Quellen

- `src/Component/Colony/OrbitShipWrappersRetriever.php` (Z. 23–31)
- `src/Module/Colony/View/ShowOrbitManagement/ShowOrbitManagement.php` (Z. 34–35)
- `src/Module/Colony/View/ShowOrbitShiplist/`
- `src/html/ship/management/management.twig` (Z. 16–25, Gruppierung, Besitzer)
- `src/Lib/SpacecraftManagement/Manager/ManageBattery.php` (Z. 47 `isFriend`), `ManageCrew.php`, `ManageTorpedo.php`
- `src/Module/Colony/Action/ManageOrbitalSpacecrafts/ManageOrbitalSpacecrafts.php`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-orbit.service.ts` (`getManagement` Z. 211–220 `where: { userId }`, `executeManagement` Z. 299)
- `apps/backend/src/modules/colony/colony-projection.service.ts` (Orbit-Kasten Z. 336–345)
- `apps/backend/src/modules/spacecraft/spacecraft-cloak.ts` (`isCloaked`)
- `apps/frontend/src/pages/colonies/components/PanelOrbit.tsx`, `OrbitalManagementPanel.tsx`, `PanelInfo.tsx`

## Akzeptanzkriterien

- [x] Orbit-Kasten, Orbit-Schiffsliste und Orbitalmanagement zeigen alle nicht getarnten, nicht zerstörten Spacecraft am Kolonieort, gruppiert nach Flotte, mit Besitzername. Getarnte fremde Schiffe fehlen (`isCloaked`).
- [x] Je Schiff bietet das Orbitalmanagement nur die Aktionen an, die STU für fremde Schiffe erlaubt. Batterie laden bei fremden Schiffen mit aktiven Schilden nur für Freunde wie `ManageBattery`. Crew und Torpedos nur bei eigenen Schiffen wie STU. Das Backend prüft dieselben Regeln und lehnt Verstöße ab.
- [ ] ~~Beam-Knöpfe im Orbit-Kasten funktionieren bei fremden Schiffen mit den bestehenden Transferregeln.~~ → abgespalten nach [col-AUD-11c](col-AUD-11c-beamen-zu-fremden-orbitschiffen.md); Knöpfe für fremde Schiffe bis dahin gesperrt.
- [x] Backend-Tests: fremdes Schiff gelistet, getarntes fremdes Schiff nicht gelistet, verbotene Aktion auf fremdes Schiff abgelehnt, Batterie bei Freund mit Schild erlaubt.
- [x] Frontend-Tests `PanelOrbit.spec.tsx`/`PanelInfo.spec.tsx`: Gruppierung, Besitzer, gesperrte Aktionen.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt H „Kolonie“ (Orbit/Orbitalmanagement, vorher „gleich“, korrigiert).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Seitenabgleich „Orbitalmanagement“ (nachgeprüft), kleine Abweichung „Orbit-Kasten in Informationen“, Unsicherheit Nr. 5.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt. UI-Lücken des Orbitalmanagements stehen in col-AUD-11b.
- 2026-11-19 – umgesetzt, Prüfung ausstehend. Commit: `feat(colony): list foreign orbit ships like STU (col-AUD-11a)`.
  - PO-Entscheidung: Beamen zu/von fremden Schiffen abgespalten nach col-AUD-11c, weil SWU dafür keine Transferregeln hat (`requireContext` verlangt eigenes Schiff).
  - Orbit-Kasten/Schiffsliste: neue Projektion `foreignOrbitShips` (STU `OrbitShipWrappersRetriever`) mit nur öffentlichen Daten (Name, Klasse, Besitzer, Flotte); getarnte, zerstörte und RPG-verborgene fremde Schiffe fehlen. Eigene Gruppen tragen jetzt den Flottennamen statt `Flotte #id`. `PanelOrbit` gruppiert „<Flotte> von <Besitzer>“, zeigt fremde Schiffe ohne Hülle/Schilde/EPS/Crew und sperrt die Beam-Knöpfe.
  - Orbitalmanagement: listet eigene plus ungetarnte, intakte fremde Schiffe am Kolonieort (STU `getSpacecraftsWithoutCloak`); fremde ohne Crew-, Batterie-/Reaktorstand und Fracht (STU `isSelectable`). Crew nur bei eigenen Schiffen; das Backend lehnt Crew-Änderungen an fremden Schiffen jetzt ausdrücklich ab (vorher stillschweigend ignoriert, gilt auch an Stationen). Batterie/Reaktor bei aktiven Schilden nur für Freunde (Zieleigner-Sicht, `mayProvisionProtectedShip`, wie STU `ManageBattery`/`ManageReactor`); Eigner bekommt „Versorgung im Orbit“. `ColonyModule` importiert dafür `forwardRef(() => AllianceModule)`.
  - Abweichungen: Torpedos auf fremde Schiffe bleiben bei aktiven Schilden gesperrt (bestehende SWU-Regel, STU prüft beim Laden keine Schilde); geladene Torpedozahl fremder Schiffe wird nicht angezeigt. Stationsmanagement nutzt die Freund-Ausnahme noch nicht (unverändert).
  - Geprüft: `nx typecheck backend`/`frontend` grün; Backend-Unit `colony` + Stationsmanagement 427/427 plus neuer Projektionstest; neu `colony-orbit-management.spec.ts` (fremd gelistet, getarnt/zerstört nicht, Crew abgelehnt, Batterie bei Freund mit Schild erlaubt und bei Fremdem abgelehnt, Eignernachricht). Frontend `colonies`/`spacecraft` 386/386 inkl. neuer Tests in `PanelOrbit.spec.tsx` und `OrbitalManagementPanel.spec.tsx`. PostgreSQL: `colony-orbit-order-http` (bootet `AppModule`), `rpg-transponder`, Kolonie-Sandbox/Fabrikation, smoke grün. ESLint 0 Fehler.
  - Ausstehend: Browserprüfung (Orbit-Kasten mit fremdem Schiff, Orbitalmanagement-Gruppen, Freund-Batterie); `PanelInfo.spec.tsx` nicht erweitert, `PanelInfo` reicht die Liste nur durch.
  - Modell: Opus 5.5 direkt (Autorisierung/Datenfreigabe), keine Delegation.

