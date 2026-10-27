# Admin-Seite „Ticks“ mit Einzeljobs und Fehlerbenachrichtigung

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** sh-AP-07a

## Ziel

Admins sehen auf einer Seite „Ticks“ die letzten Läufe aller Tick-Typen mit Status, Dauer und Fehler und können Einzeljobs manuell starten (Haupttick, Bauabschluss, Warp-Ankunft, Maintenance). Scheitert ein Lauf, erhalten alle Admins eine Systemnachricht.

## STU-Quellen

- `src/Module/Admin/View/Ticks/ShowTicks.php`, `src/html/admin/ticks.twig`
- `src/Module/Admin/Action/Ticks/*` (`DoManualProcessTick`, `DoManualSpacecraftTick`, `DoManualMaintenance`, `Colony/*`)
- `src/Component/Admin/Notification/FailureEmailSender.php`

## SWU-Pfade

- `apps/backend/src/modules/tick/tick.controller.ts` (`@Controller('admin')`, `tick/trigger`, `colony/complete-all-builds`), `tick.service.ts` (`finishTick`)
- `apps/backend/src/modules/tick/entities/game-tick-state.entity.ts`
- `apps/backend/src/modules/messaging/messaging.service.ts#sendSystem`
- `apps/frontend/src/pages/admin.tsx`, neue Seite `apps/frontend/src/pages/admin-ticks.tsx`, Route in `apps/frontend/src/app/app.tsx` (Admin-geschützt)
- `packages/shared/src/lib/common/index.ts` (DTO)

## Akzeptanzkriterien

- [ ] `GET /admin/ticks?limit=50` (nur Admin) liefert die letzten Läufe (Typ, Tick-Nummer, geplant, Start, Ende, Dauer, Status, Fehler gekürzt).
- [ ] `POST /admin/ticks/:type/run` für `MAIN`, `BUILDING_COMPLETION`, `WARP_ARRIVAL` (falls ohne eigenen State: nur ausführen), `MAINTENANCE`; Antwort mit Ergebnis bzw. Hinweis, wenn der Lauf schon existiert.
- [ ] Wechselt ein Lauf auf FAILED, erhält jeder Admin genau eine Systemnachricht (`deliveryKey` `tick-failed:<type>:<tickNumber>`) mit Typ, Tick-Nummer und Fehlertext.
- [ ] Admin-Seite im Tabellenstil nach UI-Konventionen 3.4 (Status als Farbpunkt, keine Emoji), Buttons je Job mit Bestätigung, Link aus der Admin-Übersicht.
- [ ] Backend-Tests: Admin-Pflicht, Liste sortiert, Fehlernachricht genau einmal. Frontend-Test: Tabelle und Auslösen eines Jobs.

## Comments
