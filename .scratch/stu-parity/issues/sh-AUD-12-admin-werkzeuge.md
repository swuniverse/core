# Admin-Werkzeuge: Livekarte, Wetterbericht, Schiff aufladen, Einzel-Ticks, Korrekturskripte, Spielerliste

**Status:** needs-triage
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

Der SWU-Admin hat Kacheln für Tick, „Alle Bauten fertig“, Spielstatus, News, Spieler, Fraktionen, Awards, Massennachricht und Karteneditor. Gegenüber STU fehlen Werkzeuge für Support und Tests. Für Spieler ist das unkritisch, für Betrieb und Testen aufwendig.

Fehlend (je ein Kandidat für ein Teilticket):
1. **Livekarte** (`admin/liveMap.twig`, `ShowLiveMapData`): alle Schiffe live, auch getarnte, mit Spurenfilter und Ionensturm-Bearbeitung.
2. **Wetterbericht** (`admin/overview.twig`): Ionensturmkarten je Ebene auf der Admin-Übersicht.
3. **Spacecraft aufladen** (`scripts.twig`, `ChargeSpacecraftResources`): EPS, Antrieb, Schilde, Reaktor, Batterie; einzeln und als Bulk für Schiffe und Stationen.
4. **Einzel-Ticks** (`ticks.twig`, `ManualColonyTick`, `DoManualSpacecraftTick`, `DoManualProcessTick`, `DoManualMaintenance`): Kolonie-Tick je Kolonie/Gruppe, Schiffstick je Schiff, Process-Tick und Wartung manuell. SWU hat nur die drei globalen Jobs (`TICK_RUN_TYPES`).
5. **Korrekturskripte** (`scripts.twig`, `DoColonyCorrection`, `ClearFaultyBBCodes`, `CreateMissingUserWards`, `RecalculateBuildplanCrewUsage`, `CreateCrew`): Kolonie-Korrektur, BB-Code-Bereinigung, fehlende Awards, Crewbedarf der Baupläne neu berechnen, Crew erstellen. Kolonie-Korrektur und fehlende Awards können die Handler aus sh-AUD-11a/b manuell auslösen.
6. **Spielerliste** (`admin/playerList.twig`): Avatar, Allianz, Profil- und PM-Link fehlen in `admin-users.tsx`.
7. Optional: **Forschungsbaum je Fraktion** (`admin/researchTree.twig`).

Triage: in Teiltickets der Größe S/M aufteilen und priorisieren. Livekarte zeigt getarnte Schiffe – Zugriff strikt auf Admin beschränken. Admin-Textfehler („abschliessen“, „ausloesen“, „fuer“ in `admin.tsx`) sind Teil von sh-AUD-14.

## STU-Quellen

- `src/html/admin/liveMap.twig`, `src/Module/Admin/View/Map/LiveMap/ShowLiveMap.php`, `ShowLiveMapData.php` (Z. ~87–89)
- `src/html/admin/overview.twig`, `src/Module/Admin/View/Overview/Overview.php`
- `src/html/admin/scripts.twig` (Z. ~135–183), `src/Module/Admin/Action/ChargeSpacecraftResources.php`, `ClearFaultyBBCodes.php`, `CreateMissingUserWards.php`, `RecalculateBuildplanCrewUsage.php`, `CreateCrew.php`
- `src/html/admin/ticks.twig`, `src/Module/Admin/Action/Ticks/Colony/ManualColonyTick.php`, `Ticks/DoManualSpacecraftTick.php`, `Ticks/DoManualProcessTick.php`, `Ticks/DoManualMaintenance.php`, `Ticks/DoColonyCorrection.php`
- `src/html/admin/playerList.twig`, `src/Module/Admin/View/Playerlist/`
- `src/html/admin/researchTree.twig`, `src/Module/Admin/View/ResearchTree/`

## SWU-Pfade

- `apps/frontend/src/pages/admin.tsx` (Kacheln Z. ~17–77), `admin-ticks.tsx`, `admin-ships.tsx`, `admin-users.tsx`
- `apps/frontend/src/pages/starmap-admin-fullmap.tsx`, `components/starmap-admin-fullmap/OverlayToggles.tsx` (Z. ~3–11, keine Schiffe/Stürme)
- `apps/backend/src/modules/tick/tick.controller.ts`, `tick-admin.service.ts`, `tick.service.ts`; `packages/shared/src/lib/common/index.ts` (`TICK_RUN_TYPES`)
- `apps/backend/src/modules/starmap/starmap.controller.ts` (Admin-Routen Z. ~322–750)
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts`
- `apps/backend/src/modules/anomaly/ion-storm.handler.ts`
- `apps/backend/src/modules/auth/auth.controller.ts` (Admin-Spielerliste)

## Akzeptanzkriterien

- [ ] Triage: Teiltickets (S/M) je Werkzeug mit Priorität angelegt; nicht gewollte Werkzeuge als bewusste Abweichung in `map.md` vermerkt.
- [ ] Jedes Werkzeug ist nur für Admins erreichbar (Guard + Test) und schreibt eine Laufhistorie bzw. Ergebnis-Meldung.
- [ ] Einzel-Ticks laufen mit derselben Logik wie der reguläre Tick (keine Kopie), für eine Kolonie bzw. ein Schiff.
- [ ] Spielerliste zeigt Avatar, Allianz sowie Profil- und PM-Link.
- [ ] Backend- und Frontend-Tests je Teilticket.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt C (Zeile Admin).
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), G8, Seitenabgleich `admin/*.twig`, „Kleine Abweichungen“ (Spielerliste, Einzel-Ticks, Forschungsbaum) und „Unsicherheiten – nachgeprüft“ (Livekarte/Wetterbericht fehlen).
- PO-Linie 2026-11-17 „wie STU“. Kein bisheriges Ticket (Inventur: „fehlt“ bzw. „STU-spezifisch“).

## Comments
