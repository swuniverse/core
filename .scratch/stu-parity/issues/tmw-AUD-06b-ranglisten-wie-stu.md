# Ranglisten wie STU: Avatar, Erklärtext, eigener Punktestand

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

`RankingView` zeigt jede Rangliste als nackte Tabelle. STU zeigt je Eintrag Avatar, Name und PM-Link, über jeder Liste einen Erklärtext, bei der Entdeckerliste einen Datums-Tooltip und bei allen Listen (auch der anonymen Vielflieger-Liste) den eigenen Punktestand.

- Je Spielerzeile Avatar. Der PM-Link je Zeile ist Teil von soc-AUD-07c und wird hier nicht gebaut.
- Erklärtext je Rangliste nach STU-Vorlage (sinngemäß, SWU-Begriffe: Aurodium statt Latinum usw.).
- Entdeckerliste: Tooltip mit dem Datum des Punktestands (STU `topDiscover.twig`).
- **Vielflieger:** „Dein eigener Punktestand“ wie STU `FlightRanking.php:43`. Die Liste bleibt anonym (Fraktion, Felder, Schiffe).

## STU-Quellen

- `src/html/database/highscores/*.twig` (u. a. `topDiscover.twig` Z. 16–20 Datum/PM, Z. 34 eigener Punktestand; `topFlights.twig`)
- `src/Module/Database/View/FlightRanking/FlightRanking.php` (Z. 43), `DiscovererRating/DiscovererRanking.php`

## SWU-Pfade

- `apps/backend/src/modules/database/database.service.ts` (`getRanking` Z. 906, Vielflieger `currentUser: null` Z. ~919, `getFlightRanking` Z. 1083)
- `apps/frontend/src/pages/database.tsx` (`RankingView` Z. 1180, Ausblendung bei `anonymous` Z. ~1211)
- `apps/frontend/src/components/PlayerAvatar.tsx`
- Tests: `apps/backend/src/modules/database/database-ranking.spec.ts`, `apps/frontend/src/pages/database.spec.tsx`

## Akzeptanzkriterien

- [ ] Ranglisten-Einträge mit Spielerbezug liefern Avatar und Spieler-Id; die UI zeigt den Avatar (die Id ermöglicht den PM-Link aus soc-AUD-07c).
- [ ] Jede Rangliste hat einen Erklärtext.
- [ ] Die Entdeckerliste liefert und zeigt das Datum des Punktestands als Tooltip.
- [ ] Die Vielflieger-Liste liefert und zeigt den eigenen Punktestand, ohne andere Spieler zu de-anonymisieren.
- [ ] Backend-Test: Vielflieger `currentUser` gesetzt. Frontend-Tests: Avatar, Erklärtext, eigener Punktestand bei anonymer Liste.

## Herkunft

- Audit: [README.md](../audit-2026-11-17/README.md) Abschnitt H „Handel und Datenbank: In der Vielflieger-Rangliste fehlt der eigene Punktestand“, „Schnell-PM fehlt in … Ranglisten“, M4; [trade-map-world.md](../audit-2026-11-17/trade-map-world.md) Seitenabgleich `highscores/*.twig`, Kleine Abweichungen „Ranglisten“ und „Rangliste Vielflieger (nachgeprüft)“.
- PM-Link je Rangliste: kanonisch in soc-AUD-07c (PO-Entscheidung M4, 2026-11-17).
- Teil von tmw-AUD-06. Die Rangliste „Höchstes Prestige“ entfällt in tmw-AUD-11 und braucht hier keine Erweiterung.

## Comments
