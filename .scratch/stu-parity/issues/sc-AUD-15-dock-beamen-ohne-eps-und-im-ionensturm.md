# Beamen zwischen Station und angedocktem Schiff ohne EPS und im Ionensturm

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

SWU verlangt beim Beamen zwischen Station und angedocktem Schiff immer Transferenergie. STU behandelt das als Dock-Transfer: Er kostet kein EPS und ist der einzige Warentransfer, der im Ionensturm erlaubt bleibt. Außerdem fehlt im Dock-Kasten der Station ein Schiffsselektor für das Beamen zum gewählten angedockten Schiff; Beamen geht bisher nur über das NBS.

## STU-Quellen

- `src/Lib/Transfer/CommodityTransfer.php` (Z. ~79 `$epsUsage = $isDockTransfer ? 0 : …`, `isDockTransfer` Z. ~95–101)
- `src/Lib/Interaction/Member/SpacecraftMember.php` (Z. ~62–76, `EXPECT_TARGET_DOCKED_OR_NO_ION_STORM`)
- `src/html/spacecraft/spacecraft.twig` (Dock-Kasten, Z. ~215–260), `src/html/station/dockControl.twig`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/transfer.service.ts` (`chargeEnergy`, Z. ~438 HEAD / ~464 Arbeitsbaum)
- `apps/backend/src/modules/spacecraft/ship-colony-context.service.ts` (Z. ~91–98)
- `apps/backend/src/modules/spacecraft/nearby-interaction.ts` (`INTERACTION_HOOKS` leer, Kontext `sourceDocked`/`targetDocked`)
- `apps/backend/src/modules/anomaly/ion-storm-effects.ts`
- `apps/frontend/src/components/spacecraft/DockingPanel.tsx`, `TransferDialog.tsx`

## Akzeptanzkriterien

- [x] Transfer von Waren (und Torpedos, soweit STU dort ebenfalls den Dock-Fall kennt) zwischen Station und einem an ihr angedockten Schiff in beide Richtungen kostet 0 EPS; die Meldung nennt „Energieverbrauch: 0“.
- [x] Im Ionensturm sind Transfers blockiert, außer Dock-Transfers zwischen Station und an ihr angedocktem Schiff.
- [x] Der Dock-Kasten der Station bietet je angedocktem Schiff „Beamen“, das den `TransferDialog` mit diesem Ziel öffnet.
- [x] Backend-Tests für EPS 0 im Dock, EPS > 0 ohne Dock, Ionensturm mit/ohne Dock; Frontend-Test für den Einstieg im Dock-Kasten.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt H („Beamen zwischen Station und angedocktem Schiff kostet in SWU EPS“); [spacecraft.md](../audit-2026-11-17/spacecraft.md) kleine Abweichungen (DockingPanel, Beamen) und Unsicherheiten „Beamen der Station zu angedockten Schiffen“.
- PO-Linie „wie STU“ vom 2026-11-17. Der Ionensturm-Hook-Kontext aus [sc-WP-STAT-3a](sc-WP-STAT-3a-andocken-und-abdocken.md) ist vorhanden, aber ungenutzt.

## Comments

- `transfer.service.ts` wurde zuletzt parallel für SPEC-3/4 geändert; vor Beginn `git status` prüfen und auf dem aktuellen Stand aufsetzen.
- 2026-11-20 umgesetzt, Prüfung ausstehend (Commit `feat(spacecraft): free dock beaming and ion storm beam block (stu-parity sc-AUD-15)`). `transfer.service.ts`: `isDockTransfer` (ein Schiff an das andere angedockt) → Warentransfer 0 EPS, Antwort `{ message: "<n> <Ware> (Energieverbrauch: <eps>)" }`; `shipTransferBlockReason` lehnt Schiff↔Schiff-Transfers (Waren, Crew, Torpedos, Quote) bei Ionensturm am Zielort ab („Beamen nicht möglich während eines Ionensturms“), außer im Dock. Torpedos kosten in SWU ohnehin kein EPS. Kolonie-Transfers nicht angepasst: Ionenstürme liegen nur auf Galaxiefeldern, Kolonie-Orbits im System. Frontend: `DockingPanel` je angedocktem Schiff Beam-Buttons (an/von) → `TransferDialog`; Dialog zeigt die Transfermeldung. Checks: `transfer.service.spec.ts` (36 grün), `DockingPanel.spec.tsx` + `TransferDialog.spec.tsx` (7 grün), `nx typecheck lint` backend+frontend grün. Ausstehend: gesammelter Verifikationslauf (Diff-Review gegen AK, Backend-/Frontend-Suiten). Modell: Claude Opus 5.5 direkt (Sol/Luna in dieser Session nicht verfügbar).
- 2026-11-20 – **resolved nach Verifikation.** Review ok. Gesammelter Verifikationslauf 2026-11-20 (Claude Opus 5.5, Sol nicht verfügbar): Diff-Review gegen die Akzeptanzkriterien; `npm run lint` 0 Fehler, `npm run typecheck` grün, `npm run test` grün (Backend 2700/2700, Frontend 972/972), PostgreSQL-Integrationssuite inkl. aller Migrationen 1058/1062 – die 4 Fehler lagen in zwei veralteten Test-Fixtures (`profile-friends.int-spec.ts`: `shipRepo`-Mock ohne `manager` seit sc-AUD-13; `layer-access-http.int-spec.ts`: `MAP_EDITOR` nur im JWT, seit col-AUD-16a liest `JwtStrategy` Rechte aus der DB), korrigiert und erneut 54/54 grün. Browserprüfungen entfallen laut Nutzerentscheid vom 2026-11-20.
