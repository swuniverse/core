# Orbit und Orbitalmanagement listen alle ungetarnten Schiffe wie STU

**Status:** ready-for-agent
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

- [ ] Orbit-Kasten, Orbit-Schiffsliste und Orbitalmanagement zeigen alle nicht getarnten, nicht zerstörten Spacecraft am Kolonieort, gruppiert nach Flotte, mit Besitzername. Getarnte fremde Schiffe fehlen (`isCloaked`).
- [ ] Je Schiff bietet das Orbitalmanagement nur die Aktionen an, die STU für fremde Schiffe erlaubt. Batterie laden bei fremden Schiffen mit aktiven Schilden nur für Freunde wie `ManageBattery`. Crew und Torpedos nur bei eigenen Schiffen wie STU. Das Backend prüft dieselben Regeln und lehnt Verstöße ab.
- [ ] Beam-Knöpfe im Orbit-Kasten funktionieren bei fremden Schiffen mit den bestehenden Transferregeln.
- [ ] Backend-Tests: fremdes Schiff gelistet, getarntes fremdes Schiff nicht gelistet, verbotene Aktion auf fremdes Schiff abgelehnt, Batterie bei Freund mit Schild erlaubt.
- [ ] Frontend-Tests `PanelOrbit.spec.tsx`/`PanelInfo.spec.tsx`: Gruppierung, Besitzer, gesperrte Aktionen.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt H „Kolonie“ (Orbit/Orbitalmanagement, vorher „gleich“, korrigiert).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Seitenabgleich „Orbitalmanagement“ (nachgeprüft), kleine Abweichung „Orbit-Kasten in Informationen“, Unsicherheit Nr. 5.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt. UI-Lücken des Orbitalmanagements stehen in col-AUD-11b.
