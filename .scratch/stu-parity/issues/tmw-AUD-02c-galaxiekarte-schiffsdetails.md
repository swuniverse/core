# Galaxiekarte: Schiffsdetails mit Schilden, Energie und Antrieb

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

STU zeigt für eigene und verbündete Schiffe auf der Sternenkarte Rumpfbild, Rumpf, Besitzer, Ort, Hülle, Schilde, Energie, Warpantrieb und Alarmstufe. `StarmapContactPanel` zeigt in SWU für eigene Schiffe nur Status, Alarm, Hülle und Crew. Ergänzt werden Rumpfbild und -name, Schilde, Energie (EPS) und Hyperantriebsladung.

## STU-Quellen

- `src/Public/static/js/userStarmap.js` (`buildSpacecraftDetailsHtml`)
- `src/Module/Starmap/View/ShowUserStarmapData/ShowUserStarmapData.php`

## SWU-Pfade

- `packages/shared/src/lib/spacecraft/index.ts` (`StarmapContactManagementDto` Z. 614–621)
- `apps/backend/src/modules/spacecraft/starmap-visibility.service.ts` (Befüllung von `management`)
- `apps/frontend/src/components/starmap/StarmapContactPanel.tsx` (Z. ~104)
- `apps/frontend/src/lib/assets.ts` (`shipImage`)
- Tests: `apps/backend/src/modules/spacecraft/starmap-visibility.service.spec.ts`, Frontend-Test für `StarmapContactPanel`

## Akzeptanzkriterien

- [ ] `StarmapContactManagementDto` enthält zusätzlich Schilde (aktuell/max), EPS (aktuell/max), Hyperantriebsladung (aktuell/max) sowie Rumpf-Id/-Key/-Name.
- [ ] Die Werte werden nur dort geliefert, wo heute `management` geliefert wird (keine neuen Sichtbarkeiten für fremde Schiffe).
- [ ] Das Kontaktpanel zeigt Rumpfbild, Rumpfname und die neuen Werte.
- [ ] Backend-Test: Felder befüllt für eigene Schiffe, nicht für fremde. Frontend-Test: Anzeige der neuen Werte.

## Herkunft

- Audit: [README.md](../audit-2026-11-17/README.md) Abschnitt C „Sternenkarte – Feldinfo“; [trade-map-world.md](../audit-2026-11-17/trade-map-world.md) „Große Abweichungen 2“ („`StarmapContactPanel.tsx` zeigt für eigene Schiffe nur Status, Alarm, Hülle und Crew“).
- Entscheidung zur Ticketerstellung 2026-11-17: separat von tmw-AUD-02a/b, weil unabhängig umsetzbar.

## Comments
