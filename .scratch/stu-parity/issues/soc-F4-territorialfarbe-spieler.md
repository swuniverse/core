# Territorialfarbe des Spielers

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Spieler speichern wie STU eine eigene RGB-Farbe (`#RRGGBB`), die als Territorialfarbe für allianzlose Spieler im Kartenvertrag bereitsteht. Die Darstellung auf der Sternenkarte übernimmt tmw-K4 (Overlays); dieses Issue liefert Einstellung, Validierung und API-Feld.

## STU-Quellen

- `src/Module/PlayerSetting/Action/ChangeRgbCode/ChangeRgbCode.php`
- `src/Module/PlayerSetting/Lib/UserSettingEnum.php` (`RGB_CODE`)
- `src/Module/Starmap/Lib/ExplorableStarMapItem.php`, `src/Module/Admin/View/Map/ShowMapInfluenceAreas.php` (Verbraucher)

## SWU-Pfade

- `apps/backend/src/modules/settings/settings.service.ts` (`rgb_code`)
- `apps/backend/src/modules/starmap/influence.service.ts` / `GET layers/:id/influence` (Farbe je Spieler bereitstellen)
- Integrationsvertrag Territorialfarbe in `.scratch/alliance-stu-parity/map.md`
- `apps/frontend/src/pages/settings.tsx`

## Akzeptanzkriterien

- [x] Einstellung `rgb_code` akzeptiert leer oder `#` + 6 Hex-Zeichen (Groß-/Kleinschreibung egal, normalisiert auf Kleinbuchstaben); sonst 400 „Ungültiger Farbcode“.
- [x] Einstellungs-UI mit Farbwähler und Vorschau, „zurücksetzen“ leert den Wert.
- [x] Der Einfluss-/Territoriumsvertrag liefert für Spielerparteien ohne Allianz die Spielerfarbe (Allianzfarbe hat Vorrang gemäß Allianzvertrag).
- [x] Backend-Tests: Validierung, Normalisierung, Auslieferung im Vertrag. Frontend-Test: Formular.

## Comments

- Verifiziert: fokussierte Backend-/Frontend-Tests und Postgres-Integration (isoliertes Schema), TypeScript für Apps/Shared, ESLint und `git diff --check`. Nx ist unter npm wegen `pnpm-lock.yaml`/fehlender `.modules.yaml` blockiert; direkte Befehle verwendet. Testprojekt-Typechecks melden bestehende Fehler in fremden Specs. Vollständige Migrationen benötigen das fehlende private `game-data`.
