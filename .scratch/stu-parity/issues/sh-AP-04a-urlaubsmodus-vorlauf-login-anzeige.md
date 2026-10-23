# Urlaubsmodus: 48-h-Vorlauf, Login beendet Urlaub, Anzeige

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Der Urlaubsmodus bekommt die STU-Grundregeln, auf denen alle Spielwirkungen aufsetzen: Er wird erst 48 h nach der Aktivierung wirksam, die Aktivierung meldet den Spieler ab, ein Login beendet den Urlaub, und wirksame Urlauber werden mit „(Urlaub)“ angezeigt. Die eigentlichen Schutz- und Tickwirkungen folgen in sh-AP-04b und sh-AP-04c.

Die 7-Tage-Sperrfrist bleibt in diesem Issue unverändert (SWU: ab Urlaubsende); ihre Angleichung an STU ist in sh-AP-04c offen.

## STU-Quellen

- `src/Orm/Entity/User.php#isVacationRequestOldEnough`, `#getName` (Zusatz „(UMODE)“)
- `src/Module/PlayerSetting/Lib/UserConstants.php` (`VACATION_DELAY_IN_SECONDS` = 2 Tage)
- `src/Module/PlayerSetting/Action/ActivateVacation/ActivateVacation.php` (Logout nach Aktivierung)
- `src/Lib/Session/SessionLogin.php` (Z. 143 ff., 196 ff.: Login beendet Urlaub)

## SWU-Pfade

- `apps/backend/src/modules/auth/user.entity.ts` (`vacationMode`, `vacationStartedAt`, `vacationEndedAt`)
- `apps/backend/src/modules/settings/settings.service.ts#activateVacation`, `#deactivateVacation`
- `apps/backend/src/modules/auth/auth.service.ts#login`
- `packages/shared/src/lib/auth/index.ts` (neue reine Funktion `isVacationEffective(user, now)` und Konstante `VACATION_DELAY_MS`)
- `apps/frontend/src/pages/settings.tsx` (Urlaubsabschnitt), `apps/frontend/src/stores/auth.store.ts`
- Anzeige: `apps/frontend/src/pages/player-profile.tsx`, Siedler-/Online-Listen in `apps/backend/src/modules/database/*` bzw. `pages/database.tsx`

## Akzeptanzkriterien

- [x] `isVacationEffective` ist genau dann wahr, wenn `vacationMode` aktiv ist und `vacationStartedAt` mehr als 48 h zurückliegt; Unit-Tests für Grenzwerte.
- [x] `POST /user/vacation/activate` löscht nach Erfolg das gespeicherte Refresh-Token; das Frontend meldet den Spieler danach ab und zeigt auf dem Login den Hinweis „Urlaubsmodus aktiviert. Er wird in 48 Stunden wirksam.“
- [x] Ein erfolgreicher Login beendet einen aktiven Urlaub (`vacationMode=false`, `vacationEndedAt=now`) und meldet das dem Client (Feld im Login-Response, Toast „Urlaubsmodus beendet“).
- [x] Profil und Spielerlisten zeigen bei wirksamem Urlaub den Zusatz „(Urlaub)“ in `text-swu-warning` neben dem Namen; DTOs liefern dazu `onVacation: boolean` (nur der wirksame Zustand, kein Zeitstempel).
- [x] Der Einstellungsabschnitt erklärt Vorlauf und Wirkung und zeigt „wirksam ab <Datum>“.
- [x] Backend-Tests: Aktivierung invalidiert Refresh-Token, Login beendet Urlaub, DTO-Flag nur nach 48 h. Frontend-Tests: Logout nach Aktivierung, Namenszusatz im Profil.

## Comments

- 2026-10-23: 48-h-Vorlauf zentral in `packages/shared` ergänzt; Aktivierung invalidiert die Sitzung und führt zum Login-Hinweis, Login beendet Urlaub, und Datenbankliste sowie Profil kennzeichnen wirksamen Urlaub. Einstellungen erklären Vorlauf und Wirksamkeitszeitpunkt. Schutz- und Tickwirkungen bleiben in sh-AP-04b/c.
