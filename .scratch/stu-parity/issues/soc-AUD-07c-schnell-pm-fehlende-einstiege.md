# Schnell-PM: fehlende Einstiege wie STU

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** soc-AUD-07a

## Ziel

STU bietet die Schnell-PM an deutlich mehr Stellen an als SWU. Es fehlen Siedlerliste, alle Ranglisten, Handelspostenliste, Lizenzliste, Plotschreiber, Mitgliederliste der Allianzdetailseite und die Nachricht vom Schiff an eine Kolonie im Orbit. Alle neuen Einstiege nutzen das Popup aus soc-AUD-07a.

## STU-Quellen

- `src/html/macros.twig` (`pmWindow`, Z. 58–66)
- `src/html/database/userList.twig` (Z. ~78), `src/html/database/highscores/*.twig` (Z. ~20)
- `src/html/view/trade.twig` (Z. ~157), `src/html/trade/license/list.twig` (Z. ~12)
- `src/html/communication/plotdetails.twig` (Z. ~59)
- `src/html/view/alliance.twig` (`pmWindow` je Mitglied), `src/html/alliance/alliancemanagement.twig` (Z. ~17)
- `src/html/spacecraft/control/control_mid.twig` (Z. ~401, Schiff → Kolonie im Orbit, `openPmWindow` mit Typ COLONY)

## SWU-Pfade

- `apps/frontend/src/components/PmLink.tsx` (Popup-Auslöser aus soc-AUD-07a)
- `apps/frontend/src/pages/database.tsx` (`Settlers` Z. ~1149, `RankingView` Z. ~1180)
- `apps/frontend/src/pages/trade.tsx` (Z. ~413, ~459), `apps/frontend/src/components/trade/TradeLicensePanel.tsx` (Z. ~341)
- `apps/frontend/src/pages/rpg-plots.tsx` (`RpgPlotDetailPage`, Schreiberliste)
- `apps/frontend/src/pages/alliances.tsx` (`AllianceDetailPage`, Mitgliederliste Z. ~468–528)
- `apps/frontend/src/components/spacecraft/NearbySensorPanel.tsx` bzw. Orbit-/Koloniebereich der Schiffsansicht
- `apps/backend/src/modules/spacecraft/spacecraft-communication.service.ts` (`sendNearbyMessage` lädt heute nur Schiffe, Z. ~159–172)

## Akzeptanzkriterien

- [ ] PM-Einstieg (Popup, nicht für den eigenen Account) an: jeder Zeile der Siedlerliste, jeder Zeile aller Ranglisten mit Spielerbezug (anonyme Vielflieger-Rangliste ausgenommen), Handelspostenliste (Betreiber), Lizenzliste (Lizenznehmer), Plotschreibern im Plotdetail, jedem Mitglied auf der Allianzdetailseite.
- [ ] Schiff → Kolonie: In der Schiffsansicht gibt es für fremde Kolonien auf demselben Feld bzw. im Orbit eine Nachrichtenaktion mit Kontext Quelle SHIP/STATION, Ziel COLONY; der Server akzeptiert Kolonieziele (Besitzer = Empfänger, gleiches Feld) und vergibt Crew-XP nach den Regeln aus soc-AUD-07a.
- [ ] NPC-Empfänger sind erreichbar wie in STU (keine XP).
- [ ] Frontend-Tests je Einstieg (Link vorhanden mit korrekter Empfänger-ID, fehlt beim eigenen Account); Backend-Test für Kolonieziel inkl. Feldprüfung.
- [ ] (aus soc-AUD-07a, PO 2026-11-18) Allgemeiner Quick-PM-Kontext `source {type: SHIP|STATION|COLONY|USER, id}` / `target {type, id}`; der Server prüft Quelle = Absender und Zielbesitzer = Empfänger.
- [ ] (aus soc-AUD-07a, PO 2026-11-18) Crew-XP `FOREIGN_CONTACT_MESSAGE` auch für Kolonie des Empfängers als Ziel (Schiff/Station → Kolonie im Orbit), mit Tests.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt H („Schnell-PM fehlt in Siedlerliste, Ranglisten, Handelsposten, Lizenzliste, bei Plotschreibern und auf der Allianzseite, ebenso Schiff → Kolonie“) und M4 („Alle Schnell-PM-Einstiege aus H … nutzen dieses Popup“); [social.md](../audit-2026-11-17/social.md) Kleine Abweichungen „Schnell-PM, fehlende Einstiege“, Unsicherheit 1.
- PO-Entscheidung M4 vom 2026-11-17.
- `soc-A2-schnell-pm-ueberall.md` ist `resolved`, „überall“ trifft aber nicht zu.
- Die Siedlerliste selbst (Suche, Sortierung) ist Thema des Bereichs trade-map-world; hier nur der PM-Einstieg. Der PM-Link je Mitglied auf der Allianzdetailseite ist hier enthalten und in soc-AUD-11 nicht doppelt.

## Comments
