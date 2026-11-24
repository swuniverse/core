# Schnell-PM: fehlende Einstiege wie STU

**Status:** resolved
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

- [x] PM-Einstieg (Popup, nicht für den eigenen Account) an: jeder Zeile der Siedlerliste, jeder Zeile aller Ranglisten mit Spielerbezug (anonyme Vielflieger-Rangliste ausgenommen), Handelspostenliste (Betreiber), Lizenzliste (Lizenznehmer), Plotschreibern im Plotdetail, jedem Mitglied auf der Allianzdetailseite.
- [x] Schiff → Kolonie: In der Schiffsansicht gibt es für fremde Kolonien auf demselben Feld bzw. im Orbit eine Nachrichtenaktion mit Kontext Quelle SHIP/STATION, Ziel COLONY; der Server akzeptiert Kolonieziele (Besitzer = Empfänger, gleiches Feld) und vergibt Crew-XP nach den Regeln aus soc-AUD-07a.
- [x] NPC-Empfänger sind erreichbar wie in STU (keine XP).
- [x] Frontend-Tests je Einstieg (Link vorhanden mit korrekter Empfänger-ID, fehlt beim eigenen Account); Backend-Test für Kolonieziel inkl. Feldprüfung.
- [x] (aus soc-AUD-07a, PO 2026-11-18) Allgemeiner Quick-PM-Kontext `source {type: SHIP|STATION|COLONY|USER, id}` / `target {type, id}`; der Server prüft Quelle = Absender und Zielbesitzer = Empfänger.
- [x] (aus soc-AUD-07a, PO 2026-11-18) Crew-XP `FOREIGN_CONTACT_MESSAGE` auch für Kolonie des Empfängers als Ziel (Schiff/Station → Kolonie im Orbit), mit Tests.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt H („Schnell-PM fehlt in Siedlerliste, Ranglisten, Handelsposten, Lizenzliste, bei Plotschreibern und auf der Allianzseite, ebenso Schiff → Kolonie“) und M4 („Alle Schnell-PM-Einstiege aus H … nutzen dieses Popup“); [social.md](../audit-2026-11-17/social.md) Kleine Abweichungen „Schnell-PM, fehlende Einstiege“, Unsicherheit 1.
- PO-Entscheidung M4 vom 2026-11-17.
- `soc-A2-schnell-pm-ueberall.md` ist `resolved`, „überall“ trifft aber nicht zu.
- Die Siedlerliste selbst (Suche, Sortierung) ist Thema des Bereichs trade-map-world; hier nur der PM-Einstieg. Der PM-Link je Mitglied auf der Allianzdetailseite ist hier enthalten und in soc-AUD-11 nicht doppelt.

## Comments

- 2026-11-24 (Claude Opus 5.5, direkt umgesetzt; `ticket-coder`/Luna in dieser Session nicht verfügbar, Backend-Teil betrifft Autorisierung): umgesetzt, Prüfung ausstehend. Commit „feat(messaging): STU quick PM entry points and ship to colony message (stu-parity soc-AUD-07c)“.
  - PmLink (Popup, nicht für eigenen Account) in Siedlerliste, allen Spieler-Ranglisten (anonyme Vielflieger- und Handelsposten-Rangliste ohne Spielerbezug ausgenommen), Handelspostenliste und Posteninfo (Betreiber), Lizenzliste (Lizenznehmer), Plotschreibern, Allianzmitgliedern (Detail- und Verwaltungsseite, wie STU `alliancemanagement.twig`).
  - Schiff → Kolonie: `POST /spacecraft/:id/communications/nearby/:targetId` nimmt `targetType: 'COLONY'`; Server prüft eigene Quelle (Schiff/Station), Kolonie fremd, besetzt, nicht verlassen, gleiches Feld; Empfänger = Kolonie-Besitzer; Logeintrag `[DIRECT:COLONY:id]`, Crew-XP `FOREIGN_CONTACT_MESSAGE` nach 07a-Regeln (keine XP für NPC/Freund). Feldkontext liefert `colony.owner {id, name}`, Schiffsansicht zeigt dort den PM-Button.
  - Kontextmodell: Quelle USER = `/messages`, Quelle SHIP/STATION = Pfad-`:id` (Besitz geprüft), Ziel SHIP/STATION/COLONY per `targetType`. Quelle COLONY hat keinen Einstieg (wie 07a abgegrenzt) und ist nicht gebaut.
  - Checks: `nx typecheck` backend/frontend/shared grün; Backend `jest src/modules/spacecraft` 827/827 (6 neue Kolonie-Fälle); vitest `src/pages src/components` 958/958 (neue Tests je Einstieg); eslint 0 Fehler. Bestehender Verwaltungs-Test filtert den PM-Button jetzt heraus.
  - Ausstehend: gesammelter Verifikationslauf (volle `test-integration`, Workspace-Build); `colony.owner` im Feldkontext hat keinen eigenen Backend-Test.

- 2026-11-24 – **resolved.** Gesammelter Verifikationslauf (Claude Opus 5.5; Sol/Luna in dieser Session nicht verfügbar) auf `f1e0c2f2`: `nx run-many -t build typecheck lint` (backend, frontend, shared) grün; Unit Backend 2764/2764, Frontend 1028/1028; PostgreSQL-Integration 1045/1089 im Gesamtlauf – die 44 Fehler (6 Suiten) waren Test-Fixtures mit alten `sendSystem`-Argumentpositionen bzw. der historische Kolonie-Ereignis-Migrationstest nach dem Betreff-Wegfall (soc-AUD-07b), behoben in `f1e0c2f2`, betroffene Suiten danach 112/112 grün. Diff-Review ohne Befund; offener Punkt `colony.owner` ohne eigenen Backend-Test bleibt als bekannte Lücke (Frontend-Test deckt Anzeige/Versand ab).
