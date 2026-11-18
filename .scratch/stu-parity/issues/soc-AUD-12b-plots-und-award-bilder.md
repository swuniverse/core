# Plotliste/-detail und Award-Bilder wie STU

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

- **Plotliste:** Es fehlen die Beitragszahl („n Beiträg(e) von m Spieler(n)“), die Mitglieder-Avatare und das Enddatum („Beendet am …“). SWU zeigt nur „Beendet“.
- **Plotdetail:** Beiträge erscheinen als einfache Liste ohne KN-Kartenaufbau, Bewertung und Kommentare. Schreiber haben keinen Avatar (PM-Link je Schreiber: soc-AUD-07c). „Beitrag-ID hinzufügen“ am Plot fehlt.
- **Award-Bilder:** Alle Awards zeigen `/favicon.ico`; sie sind optisch nicht unterscheidbar. Laut `map.md` (soc-G1) war das ein vorläufiger Platzhalter.

## STU-Quellen

- `src/html/communication/plot/plotList.twig`, `src/html/communication/plot/userPlots.twig`, `src/html/communication/plot/plots.twig`
- `src/html/communication/plotdetails.twig`, `src/Module/Communication/View/ShowKnPlot/ShowKnPlot.php`, `src/Module/Communication/View/ShowPlotList/ShowPlotList.php`
- `src/Module/Communication/Action/AddKnPostToPlot/AddKnPostToPlot.php`
- `src/html/communication/kn.twig`, `knRating.twig` (Kartenaufbau)
- `src/html/view/userprofile.twig` (Z. ~140–160, Awards)

## SWU-Pfade

- `apps/frontend/src/pages/rpg-plots.tsx` (`RpgPlotListPage` Z. ~48–80, `RpgPlotDetailPage` Z. ~126 ff.), `rpg-plots.spec.tsx`
- `apps/backend/src/modules/rpg/rpg-plot.service.ts`, `rpg-plot.controller.ts`, `rpg-plot.entity.ts` (`endedAt`), `rpg-plot-member.entity.ts`
- `apps/frontend/src/pages/holonet.tsx` (Beitragskarte aus soc-AUD-02 wiederverwenden)
- `apps/backend/src/modules/awards/award.catalog.ts` (`AWARD_IMAGE` Z. 21), neue Migration für Bildpfade
- `apps/frontend/public/assets/awards/` (leer), `apps/frontend/src/pages/player-profile.tsx` (Awards-Box)

## Akzeptanzkriterien

- [ ] Plotliste zeigt je Plot „n Beiträg(e) von m Spieler(n)“, die Avatare der Schreiber und bei beendeten Plots „Beendet am <Datum>“.
- [ ] Plotdetail zeigt die Beiträge mit derselben Karte wie die HoloNet-Liste (inkl. Bewertung und Kommentaren), Schreiber mit Avatar; der Plotersteller kann eine Beitrag-ID hinzufügen (gleiche Regeln wie die Zuordnung am Beitrag).
- [ ] Jeder Award im Katalog hat ein eigenes Bild unter `apps/frontend/public/assets/awards/` (Star-Wars-Motive nach Leitplanke 2, Lizenz/Herkunft dokumentiert; selbst erstellt oder frei lizenziert); eine Migration setzt die Bildpfade bestehender Awards; `AWARD_IMAGE` als Sammelplatzhalter entfällt. Die Wahl ist in `map.md` unter „Entscheidungen“ festzuhalten (durch den umsetzenden Agenten).
- [ ] Backend-Tests: Plot-DTO mit Beitragszahl/Spielerzahl/Enddatum, Beitrag-ID-Zuordnung durch Ersteller, Award-Bildpfade. Frontend-Tests: Plotliste, Plotdetail-Karte, unterschiedliche Award-Bilder im Profil.

## Herkunft

- Audit 2026-11-17: [social.md](../audit-2026-11-17/social.md) Seitenabgleich „Plotliste“, „Plotdetail“, „Awards im Profil“; Kleine Abweichungen „Plotliste“, „Plotdetail“, „Awards“.
- `map.md` Entscheidung soc-G1 (2026-10-22): Favicon nur „bis zu eigenen Grafiken“ – dieses Ticket liefert sie.

## Comments
