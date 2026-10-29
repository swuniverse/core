# In-Universe-Datum

**Status:** needs-info
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

- [ ] Neue Formatierer (z. B. `formatGameDate`/`formatGameDateTime`) in `apps/frontend/src/lib/format.ts` rechnen das reale Jahr in „n NSY“ um (reales Jahr − 2023), Tag/Monat/Uhrzeit bleiben real.
- [ ] Verwendet für Ereignisse, Nachrichten, HoloNet und Logbuch; reale Daten bleiben dort, wo sie rechtlich oder organisatorisch nötig sind (Registrierung, Sperren, Urlaub, Löschfristen, Tickzeiten, Impressum).
- [ ] Unit-Tests für Jahreswechsel und Formatierung; die Entscheidung steht in `map.md` (bereits eingetragen).

## Entscheidung

Vorgabe: Variante (a). Jahr „n NSY“ (nach der Schlacht von Yavin), berechnet als reales Jahr − 2023 (z. B. 2026 → „3 NSY“), nur für Spielereignisse (Ereignisse, Nachrichten, HoloNet, Logbuch). Reale Daten bleiben bei Registrierung, Sperren, Urlaub, Löschfristen, Tickzeiten und Impressum.

## Comments

- 2026-10-21 Product Owner: Option a – SWU zeigt Spieldaten als In-Universe-Jahr „n NSY“ (reales Jahr − 2023) für Spielereignisse an; rechtlich oder organisatorisch nötige Daten bleiben real.
- 2026-10-29 Agent: Produktänderungen nach zwei Prüfversuchen verworfen. `npx nx affected -t lint typecheck test --base=HEAD` bleibt im bestehenden Frontend-Typecheck rot: `apps/frontend/src/pages/database.tsx:1015` übergibt `"REBEL" | "EMPIRE" | null` an `PlayerAvatar`, das `Faction | null` erwartet; danach entstehen zahlreiche TS6305-Folgefehler. `npx nx run-many --targets=build` ist grün. Bitte den bestehenden Typecheck-Blocker beheben oder ausdrücklich freigeben, bevor dieses Issue erneut bearbeitet wird.
