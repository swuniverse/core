# Orbitalmanagement: Rumpfbild, Torpedoreserven, Typauswahl, Shuttle-Transfer, PanelOrbit-Callbacks

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** col-AUD-11a

## Ziel

Im SWU-Orbitalmanagement fehlen das Rumpfbild, die Torpedoreserven der Kolonie je Typ und die Spalte „Shuttle-Transfer“. Den Torpedotyp gibt man über ein Zahlenfeld für die Typ-ID ein, statt ihn aus den möglichen Typen zu wählen. `PanelOrbit` bekommt die Callbacks `onTransferShuttles`, `onDisassembleShip`, `onDefendShip`, `onBlockadeShip` und `onClearOrbitOrder`, nimmt sie aber nicht entgegen. Deshalb ist der Shuttle-Transfer Kolonie↔Schiff aus der Kolonie nicht erreichbar.

## STU-Quellen

- `src/html/colony/menu/orbitalmanagement.twig`
- `src/html/ship/management/management.twig` (Rumpfbild, Torpedo-Spalte, Shuttle-Transfer Z. 14/114–129)
- `src/Module/Colony/Action/ManageOrbitalShuttles/`, `src/Module/Colony/View/ShowShuttleManagement/`, `src/Module/Colony/Lib/ShuttleManagementItem.php`
- `src/Module/Colony/Action/ChangeTorpedoType/ChangeTorpedoType.php`
- `src/Lib/SpacecraftManagement/Manager/ManageTorpedo.php`, `ManageTorpedoReserves.php`

## SWU-Pfade

- `apps/frontend/src/pages/colonies/components/OrbitalManagementPanel.tsx` (Typ-ID-Zahlenfeld Z. 346–381)
- `apps/frontend/src/pages/colonies/components/PanelOrbit.tsx` (Callbacks Z. 17–21 deklariert, Z. 31–38 nicht entgegengenommen)
- `apps/frontend/src/pages/colonies/ColoniesPage.tsx` (Übergabe der Callbacks)
- `apps/backend/src/modules/colony/colony.controller.ts` (`POST :id/orbit/ships/:shipId/shuttles` Z. 514)
- `apps/backend/src/modules/colony/colony-orbit.service.ts` (`getManagement`, `executeManagement` mit `torpedoTypeId`/`torpedoLoad`)

## Akzeptanzkriterien

- [ ] Jede Zeile des Orbitalmanagements zeigt das Rumpfbild.
- [ ] Die Kolonie-Torpedoreserven werden je Typ angezeigt. Der Torpedotyp wird per Auswahlliste aus den für das Schiff möglichen und auf der Kolonie vorhandenen Typen gewählt, nicht per ID-Eingabe. Das Backend liefert die möglichen Typen.
- [ ] Spalte bzw. Dialog „Shuttle-Transfer“ wie STU: Shuttles zwischen Kolonie und eigenem Schiff transferieren, Kapazität und Bestand sichtbar, Aufruf von `POST :id/orbit/ships/:shipId/shuttles`.
- [ ] `PanelOrbit` nimmt alle übergebenen Callbacks entgegen und bietet die Aktionen an (Shuttle-Transfer, Demontage-Einstieg, Verteidigen, Blockieren, Orbitauftrag aufheben). Nicht benötigte Callbacks werden entfernt statt ungenutzt deklariert.
- [ ] Backend-Test: mögliche Torpedotypen je Schiff, Shuttle-Transfer in beide Richtungen.
- [ ] Frontend-Tests `PanelOrbit.spec.tsx` und ein Test für `OrbitalManagementPanel` (Bild, Reserven, Typauswahl, Shuttle-Transfer).

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt H „Kolonie“ (Orbit/Orbitalmanagement).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Seitenabgleich „Orbitalmanagement“, kleine Abweichung „Orbit-Kasten in Informationen“ (Callbacks), Unsicherheit Nr. 5.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt.
