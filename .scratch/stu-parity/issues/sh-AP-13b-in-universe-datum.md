# In-Universe-Datum

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

STU zeigt alle Spieldaten mit einem In-Universe-Jahr (reales Jahr + 370, `d.m.Y` bzw. `d.m.Y H:i`). SWU zeigt das reale Datum über `formatDate`/`formatDateTime` (de-DE). Ob SWU ebenfalls ein In-Universe-Datum bekommt, ist eine Abweichungsentscheidung.

## STU-Quellen

- `src/Module/Control/StuTime.php#transformToStuDate`
- Verwendung in Twig über `stuDate`-Filter (z. B. `src/html/game/component/serverTimeAndVersionComponent.twig`)

## SWU-Pfade

- `apps/frontend/src/lib/format.ts` (`formatDate`, `formatDateTime`)
- alle Verwender dieser Funktionen

## Akzeptanzkriterien

- [x] Neue Formatierer (z. B. `formatGameDate`/`formatGameDateTime`) in `apps/frontend/src/lib/format.ts` rechnen das reale Jahr in „n NSY“ um (reales Jahr − 2023), Tag/Monat/Uhrzeit bleiben real.
- [x] Verwendet für Ereignisse, Nachrichten, HoloNet und Logbuch; reale Daten bleiben dort, wo sie rechtlich oder organisatorisch nötig sind (Registrierung, Sperren, Urlaub, Löschfristen, Tickzeiten, Impressum).
- [x] Unit-Tests für Jahreswechsel und Formatierung; die Entscheidung steht in `map.md` (bereits eingetragen).

## Entscheidung

Vorgabe: Variante (a). Jahr „n NSY“ (nach der Schlacht von Yavin), berechnet als reales Jahr − 2023 (z. B. 2026 → „3 NSY“), nur für Spielereignisse (Ereignisse, Nachrichten, HoloNet, Logbuch). Reale Daten bleiben bei Registrierung, Sperren, Urlaub, Löschfristen, Tickzeiten und Impressum.

## Comments

- 2026-10-21 Product Owner: Option a – SWU zeigt Spieldaten als In-Universe-Jahr „n NSY“ (reales Jahr − 2023) für Spielereignisse an; rechtlich oder organisatorisch nötige Daten bleiben real.
- 2026-10-29 Agent: Produktänderungen nach zwei Prüfversuchen verworfen. `npx nx affected -t lint typecheck test --base=HEAD` bleibt im bestehenden Frontend-Typecheck rot: `apps/frontend/src/pages/database.tsx:1015` übergibt `"REBEL" | "EMPIRE" | null` an `PlayerAvatar`, das `Faction | null` erwartet; danach entstehen zahlreiche TS6305-Folgefehler. `npx nx run-many --targets=build` ist grün. Bitte den bestehenden Typecheck-Blocker beheben oder ausdrücklich freigeben, bevor dieses Issue erneut bearbeitet wird.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Frontend-Faction-/TS6305-Gate); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
- 2026-11-14: Umgesetzt (f2f18dab); Kürzel NSY auf Rückfrage bestätigt (statt ABY).
  - `formatGameDate`/`formatGameDateTime` in `apps/frontend/src/lib/format.tsx`: Tag, Monat und Uhrzeit lokal und real (über `formatToParts`), Jahr = lokales Jahr − 2023 als „n NSY“ (z. B. „14.11.3 NSY, 18:30“); Jahre vor 2023 als „n VSY“. Kürzel als Konstante `GAME_ERA`.
  - Verwendet für Ereignisse (Ereignisseite, Maindesk), Nachrichten (Liste ab 7 Tagen, Korrespondenz), HoloNet (Beiträge, Kommentare, Maindesk-Teaser) und das Schiffslogbuch (`CommunicationDrawer`).
  - Real bleiben Registrierung, Sperren, Urlaub, Löschfristen, Tickzeiten, Admin-Seiten, Kontakt-/Ignorierlisten, Profilbesuche.
  - Tests: `format.spec.tsx` (Formatierung, Jahr 0, VSY, Jahreswechsel um lokale Mitternacht); `DashboardLowerSections.spec.tsx` auf NSY angepasst.
  - Gates: Lint 0 Fehler (Frontend-Warnungen 110 unverändert), Typecheck und Build grün, Frontend 758/758. Backend unberührt.
- 2026-11-14: Auf Wunsch zusätzlich das Allianzforum und das Forum-Widget im Maindesk auf NSY umgestellt (38945807).
