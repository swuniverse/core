# Startseite bei Reload, doppelte Lagermeldung, getarnte geteilte Schiffe

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

Drei kleinere Abweichungen von STU:

1. **`default_view`:** SWU leitet nur direkt nach dem Login auf die Startseite um. Mit vorhandenem Token führt `/` immer zum Dashboard, und `PublicOnlyRoute` leitet `/login` fest auf `/`. STU wertet die Startseite auch bei jedem Aufruf ohne Ansicht aus. Außerdem bietet SWU nur 7 Startseiten, STU alle Module außer Game/Index/Notizen (also auch Stationen, KN, Handel, Allianz, Datenbank, History, Einstellungen, Profil).
2. **„Lager voll“ doppelt:** Beim Kappen fehlt ein `break`, beim nächsten Gut wird erneut `STORAGE_FULL` erzeugt. STU meldet höchstens einmal je Kolonie und Tick.
3. **Getarnte Schiffe mit geteilter Live-Position:** STU zeigt geteilte Schiffe unabhängig von Tarnung und Sensorabdeckung; SWU blendet getarnte fremde Schiffe auch bei geteilter Position aus.

## STU-Quellen

- `src/Module/Index/Action/Login/Login.php` (Z. 36–37), `src/Module/Game/View/Overview/Overview.php` (Z. 39–51)
- `src/Module/PlayerSetting/Lib/UserSettingWrapper.php` (Z. 56–68, `getFilteredViews`), `src/Component/Game/ModuleEnum.php`
- `src/Module/Tick/Colony/Component/ProceedStorage.php` (Z. 61–76, `break` nach beiden Meldungen)
- `src/Module/Starmap/View/ShowUserStarmapRealtime/ShowUserStarmapRealtime.php` (Z. ~419–435: Tarnfilter nur bei `!$isOwn && !$isShared`)

## SWU-Pfade

- `apps/frontend/src/pages/login.tsx` (Z. ~219–236, `routeByDefaultView`), `apps/frontend/src/app/app.tsx` (`PublicOnlyRoute` Z. ~71–75, Route `/`), `apps/frontend/src/pages/settings.tsx` (Z. ~577–588)
- `apps/backend/src/modules/settings/settings.service.ts` (`DEFAULT_VIEWS` Z. ~56–64)
- `apps/backend/src/modules/colony/colony-tick-processor.service.ts` (Z. ~494–504)
- `apps/backend/src/modules/spacecraft/starmap-visibility.service.ts` (Z. ~92, ~222), `apps/backend/src/modules/spacecraft/spacecraft-cloak.ts` (`isHiddenFromViewer` Z. ~33–38)
- Tests: `apps/frontend/src/pages/login.spec.tsx`, `apps/backend/src/modules/colony/colony-tick.spec.ts`, Starmap-Sichtbarkeitstests

## Akzeptanzkriterien

- [ ] Ein Aufruf von `/` (Reload, vorhandenes Token, `/login` mit Token) leitet einmal je Sitzung auf die gespeicherte Startseite um, wenn diese nicht das Dashboard ist; danach bleibt `/` das Dashboard (keine Endlosschleife, Navigation zum Dashboard weiterhin möglich).
- [ ] Startseiten wie STU: Dashboard, Kolonien, Schiffe, Stationen, Nachrichten, HoloNet, Forschung, Handel, Allianz, Datenbank, History, Sternenkarte, Einstellungen, eigenes Profil; Admin nur für Admins. Server und UI nutzen dieselbe Liste (Shared-Konstante).
- [ ] Je Kolonie und Tick entsteht höchstens eine Meldung „Das Lager der Kolonie ist voll“ (fehlendes `break` ergänzt); Test mit zwei lagerfähigen Gütern.
- [ ] Schiffe eines Spielers, der dem Betrachter die Live-Position teilt, erscheinen auf der Live-Karte auch getarnt (wie STU). Ohne Freigabe bleiben getarnte fremde Schiffe verborgen; RPG-versteckte Schiffe bleiben verborgen.
- [ ] Tests für alle drei Punkte (Frontend: Umleitung bei vorhandenem Token und Startseitenauswahl; Backend: Lagermeldung, Kartensichtbarkeit getarnt+geteilt / getarnt+nicht geteilt).

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt H („`default_view` greift nur direkt beim Login …“, „Die Meldung ‚Lager voll‘ kann zweimal je Tick entstehen …“, „Kontakte: Getarnte Schiffe mit geteilter Live-Position blendet SWU aus, STU zeigt sie.“); [social.md](../audit-2026-11-17/social.md) Kleine Abweichungen „`default_view` nur direkt nach dem Login“, „Lager-voll-Meldung doppelt“, „Live-Karte, getarnte geteilte Schiffe“, Unsicherheiten 2, 4, 5.
- `sh-AP-16` (resolved, „Gespeicherte Startansicht … wirksam gemacht“) deckt Reload/Token nicht ab.

## Comments
