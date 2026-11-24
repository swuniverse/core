# Stationen auf eigener Seite mit Menüpunkt wie STU

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

STU `stationList.twig` und Menüpunkt „Stationen“ (`navigationComponent.twig`, sichtbar bei `hasStationsNavigation`, `GameTwigRenderer.php` Z. 95: NPC, Award `RESEARCHED_STATIONS`, Crew auf fremder Station).

## Entscheidung (2026-11-24)

SWU vergibt `RESEARCH_STATIONS` noch durch keine Forschung (kein `awardKey` in game-data). Damit niemand den Zugang zu eigenen Stationen verliert, zählt in SWU zusätzlich eine eigene, nicht zerstörte Station. Admins sehen den Menüpunkt immer.

## Akzeptanzkriterien

- [x] Seite `/stations` listet nur Stationen (Rolle, Position, Hülle, Schilde, EPS, Crew, Andockbelegung), Klick öffnet die Station; leer: „Du besitzt derzeit keine Stationen“.
- [x] Menüpunkt „Stationen“ (Icon `menu_station`) in Sidebar hinter „Schiffe“ und im Mobil-Menü „Mehr“, nur bei `hasStationsNavigation` (oder Admin).
- [x] `GET /auth/me` liefert `hasStationsNavigation` (NPC, Award, eigene Station, Crew auf fremder Station).

## Comments

### 2026-11-24 — umgesetzt, Prüfung ausstehend

- Tests: neu `stations.spec.tsx` (2), `navigation.spec.tsx` +1, PostgreSQL `stations-navigation.int-spec.ts` (5: ohne, NPC, Award, eigene/zerstörte Station, Crew auf fremder Station). Jest `modules/auth` 60/60; `nx typecheck` ✓.
- Hinweis: Der Login-Response liefert das Feld nicht; die Sidebar lädt `/auth/me` nach (für Nicht-Admins), Admins sehen den Punkt ohnehin.
- Modell: Claude Opus 5.5 direkt.

- 2026-11-24 – **Prüfung bestanden, resolved.** Gesammelter Verifikationslauf auf `83bca5c5`: Lint 0 Fehler (geänderte Dateien ohne neue Warnung), `nx typecheck` und `nx build` alle Projekte grün, Unit Backend 2739/2739, Frontend 1003/1004 (Ausreißer `research.spec.tsx` einzeln 15/15 grün, nicht berührt), PostgreSQL-Integration 1081/1081. Diff-Review ohne Befund (Flottenbefehle nur über eignergeprüfte Einzelschiff-Endpunkte, Doppelklick-Sperre, Stationsregel nur fürs eigene Profil). Übergangsregel „eigene Station“ und Admin-Sonderfall werden mit sc-AUD-28 an STU angeglichen. Modell: Opus 5.5 direkt.
