# Kleinere Rahmenlücken: Umlaute/Emoji, Forum-Link, Navigation „Stationen“, Akzeptanz-Checkbox

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

Vier kleine Abweichungen im Spielrahmen, gebündelt:

1. **Umlaut-Reste und Emoji (sh-AP-13a nicht vollständig):**
   - `DashboardAttention` im Maindesk-Block „Handlungsbedarf“ nutzt Emoji-Icons ⚡ 👤 🛡 📦 (`dashboard.tsx` Z. ~259, 269, 283, 299, 311, 321) entgegen Konvention 3.6 (nur STU-Assets, keine Emoji/Unicode-Glyphen). sh-AP-13a hat nur die drei Alarm-Emoji entfernt. `DashboardFleet` nutzt laut Inventur 🔴🟡🟢 – mitprüfen.
   - Umschreibungen statt Umlaute: `login.tsx` („Gebaudetypen“ Z. ~445, „Schliessen“ Z. ~603), `settings.tsx` („geaendert“ Z. ~276/289, „rueckgaengig“/„geloescht“ Z. ~935–936, „Passwort bestaetigen“ Z. ~956), `admin.tsx` („fuer“ Z. ~34/321, „abschliessen“ Z. ~206/221, „ausloesen“ Z. ~265/279).
2. **Forum-Link:** STU hat im Spielkopf (`sitedefaults.twig`, Icon `menu_scripts0.png`) und auf der Landing einen Forum-Link. SWU hat Wiki und Discord, aber keinen Forum-Link.
3. **Navigation „Stationen“:** STU zeigt einen eigenen Eintrag „Stationen“ (`navigationComponent.twig`), sichtbar wenn der Spieler die Stationsforschung abgeschlossen hat (Award `RESEARCHED_STATIONS`), Crew auf einer fremden Station hat oder NPC ist (`GameTwigRenderer#hasStationsNavigation`). SWU listet Stationen nur als Tabelle auf `/spacecraft`. Das Asset `menu_station0/1.png` ist vorhanden.
4. **Akzeptanz-Checkbox bei der Registrierung:** STU verlangt die Bestätigung „Ich habe die Spielregeln und den Datenschutzhinweis gelesen und bin damit einverstanden.“ (`registration.twig` Z. ~195–210), sonst Fehlermeldung. SWU hat keine solche Checkbox.

Hinweis: `register.tsx`, `login.tsx` und `settings.tsx` werden durch `origin/main` (`da02e52f`) geändert (siehe sh-AUD-01). Punkte 1 (Login/Settings) und 4 nach dem Merge umsetzen bzw. dort konfliktarm halten.

## STU-Quellen

- `src/html/sitedefaults.twig` (Z. ~74–75, Forum-Link im Kopf)
- `src/html/index/index.twig`, `src/html/index/indexDefaults.twig` (Kopf-Links der Landing)
- `src/html/game/component/navigationComponent.twig` (Z. 5–7, „Stationen“)
- `src/Module/Control/Render/GameTwigRenderer.php` (Z. ~95–106, `hasStationsNavigation`)
- `src/html/view/stationList.twig`
- `src/html/index/registration.twig` (Z. ~195–210, Checkbox Spielregeln/Datenschutz)

## SWU-Pfade

- `apps/frontend/src/pages/dashboard.tsx` (`DashboardAttention`-Daten Z. ~255–325), `pages/dashboard/DashboardAttention.tsx`, `pages/dashboard/DashboardFleet.tsx`
- `apps/frontend/src/pages/login.tsx`, `pages/settings.tsx`, `pages/admin.tsx`
- `apps/frontend/src/components/layout/header.tsx` (Wiki-Link Z. ~385), `components/layout/sidebar.tsx` (Z. ~13–32), `components/layout/bottom-nav.tsx`
- `apps/frontend/src/pages/spacecraft.tsx` (`StationTable` Z. ~220 ff., Filter Z. ~82–83), `apps/frontend/src/app/app.tsx` (Routen)
- `apps/frontend/public/assets/navigation/menu_station0.png`, `menu_station1.png`
- `apps/backend/src/modules/awards/award.catalog.ts` (`RESEARCH_STATIONS`)
- `apps/frontend/src/pages/register.tsx`, `apps/backend/src/modules/auth/auth.service.ts#register`, `apps/backend/src/modules/auth/dto/register.dto.ts`
- `apps/frontend/src/pages/privacy.tsx`, `apps/frontend/src/pages/help.tsx` (Ziel der Links)

## Akzeptanzkriterien

- [ ] Maindesk „Handlungsbedarf“ (und `DashboardFleet`) verwendet STU-Assets aus `public/assets/buttons` bzw. Text statt Emoji; im Maindesk ist kein Emoji mehr vorhanden.
- [ ] Alle genannten Umschreibungen in `login.tsx`, `settings.tsx` und `admin.tsx` korrigiert; ein Frontend-Test oder Lint-Check findet in diesen Dateien keine `ae/oe/ue/ss`-Ersatzschreibungen der genannten Wörter mehr.
- [ ] Forum-Link im Spielkopf und auf der Landing (externes Ziel aus Konfiguration, z. B. `VITE_FORUM_URL`, mit sinnvollem Default auf das SWU-Forum bzw. Discord-Forum, wenn kein eigenes Forum existiert – im Ticket festhalten).
- [ ] Navigationseintrag „Stationen“ mit `menu_station`-Icon in Sidebar und mobiler Navigation, sichtbar nach STU-Regel (Award `RESEARCH_STATIONS`, Crew auf fremder Station, Admin/NPC). Ziel ist eine Stationsliste (eigene Route oder `/spacecraft` mit Stationsfilter).
- [ ] Registrierung verlangt die Checkbox „Ich habe die Spielregeln und den Datenschutzhinweis gelesen und bin damit einverstanden.“ mit Links auf Spielregeln (Wiki/Hilfe) und `/datenschutz`. Ohne Haken ist „Registrieren“ deaktiviert; das Backend lehnt Registrierungen ohne Bestätigung ab (DTO-Feld, Validierung).
- [ ] Frontend-Tests: keine Emoji im Handlungsbedarf, Forum-Link, Sichtbarkeit „Stationen“ je Bedingung, Checkbox-Pflicht. Backend-Test: Registrierung ohne Bestätigung abgelehnt; Sichtbarkeitsregel „Stationen“, falls serverseitig berechnet.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt D (sh-AP-13a, Umlaut-/Emoji-Reste) und Abschnitt E („Akzeptanz-Checkbox Regeln/Datenschutz bei Registrierung“).
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), Seitenabgleich (Landing, Registrierung, `game.twig`/Header, `navigationComponent.twig`) und „Kleine Abweichungen“ (Emoji in `DashboardAttention`, Umlaut-Reste, Forum-Link, Navigation „Stationen“, Akzeptanz-Checkbox).
- PO-Linie 2026-11-17 „wie STU“. sh-AP-13a ist resolved, das AK „deutsche UI-Texte vereinheitlicht“ und Konvention 3.6 sind nicht vollständig erfüllt.

## Comments
