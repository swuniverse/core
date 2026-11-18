# Modulfabrik mit STU-Informationsdichte (Bedarfsfilter, Accountbestand, Sammelbestellung)

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

In der SWU-Modulfabrik startet man jedes Modul einzeln und sieht nur das lokale Lager. „Welche Module brauche ich für Bauplan X?“ lässt sich nicht direkt beantworten. In STU filtert man nach Rumpf oder Bauplan und sieht „(Benötigt: n)“ je Modul. Dazu zeigt STU den accountweiten Bestand mit Link auf die Lagerorte und bestellt mehrere Module mit einem Knopf, mit Vorschau der Fehlmengen. Außerdem zeigt SWU Entwickler-Metadaten, die nicht in die Spieler-UI gehören. Die Fertigungsregeln (col-A2) bleiben unverändert.

## STU-Quellen

- `src/html/colony/menu/moduleFab.twig` (Rumpf-/Bauplanfilter mit „(Benötigt: n)“ Z. ~60–80, Spalten In Bau/Lagernd/Anzahl, Sammelknopf „Modulherstellung“, `#module-production-preview`)
- `src/Module/Colony/Lib/Gui/Component/ModuleFabProvider.php`
- `src/Module/Colony/View/ShowModuleFab/`
- `src/Module/Colony/Action/CreateModules/CreateModules.php` (mehrere Module in einer Aktion)
- `src/Module/Database/View/ShowCommoditiesLocations/` (Lagerorte)

## SWU-Pfade

- `apps/frontend/src/pages/colonies/components/PanelFabrication.tsx` (Freitextsuche Z. 375–381, Entwicklerinfo Z. 461–476, Einzelstart Z. 478–512, lokales Lager Z. 513–518)
- `apps/frontend/src/pages/colonies/components/CommodityLocationsDialog.tsx` (Lagerorte, tmw-D1)
- `apps/backend/src/modules/colony/colony-fabrication.service.ts`, `colony.controller.ts` (Fertigungsendpunkte)
- `apps/backend/src/modules/colony/entities/colony-ship-buildplan.entity.ts` (Bauplanmodule), `colony-shipyard.service.ts`

## Akzeptanzkriterien

- [ ] Filter „Rumpf“ und „Bauplan“ wie STU: Bei gewähltem Rumpf bzw. Bauplan werden nur passende Module gezeigt, je Modul mit „(Benötigt: n)“ aus dem Bauplan.
- [ ] Je Modul zeigt die Spalte „Lagernd“ den accountweiten Bestand. Ein Klick öffnet die Lagerorte (`CommodityLocationsDialog`). Der lokale Bestand bleibt erkennbar.
- [ ] Mengen lassen sich für mehrere Module eintragen und mit einem Knopf „Modulherstellung“ bestellen. Das Backend nimmt die Sammelbestellung in einer Transaktion an. Teilergebnisse meldet es je Modul wie STU `CreateModules` (welche Module, wie viele, wo es scheiterte).
- [ ] Vor dem Absenden zeigt eine Vorschau die Gesamtkosten (Waren, Energie) und die Fehlmengen je Ware.
- [ ] Die Entwickler-Metadaten („STU: rawName · Tech … · Bundle …“) erscheinen nicht mehr.
- [ ] Torpedo- und Komponentenfertigung im selben Panel funktionieren weiter.
- [ ] Backend-Tests: Sammelbestellung (alles ok, teilweise Mangel, EPS-Mangel), Bedarfszahlen je Bauplan, accountweiter Bestand.
- [ ] Frontend-Tests `PanelFabrication.spec.tsx`: Filter mit „Benötigt“, Vorschau mit Fehlmengen, Sammelknopf, keine Metadaten.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt C (Zeile „Modulfabrik / Werft“).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Seitenabgleich „Modulfabrik“, Große Abweichung Nr. 4, kleine Abweichung „Fabrikationspanel zeigt Entwickler-Metadaten“.
- col-A2 (resolved) bleibt für die Regeln maßgeblich. Dieses Ticket betrifft nur Informationsdichte und Bedienung.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“ (map.md Leitplanke 5: STU-typische Informationsdichte).

## Comments

- 2026-11-17: Aus dem Audit angelegt.
