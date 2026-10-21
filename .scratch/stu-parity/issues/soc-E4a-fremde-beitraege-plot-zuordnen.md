# RPG-Plots: fremde Beiträge zuordnen (Antrag und Annahme)

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** soc-E3b

## Ziel

Ein Plotmitglied kann beantragen, einen bestehenden HoloNet-Beitrag eines anderen Spielers einem Plot hinzuzufügen. Der Autor des Beitrags erhält eine Systemnachricht und nimmt an oder lehnt ab; bei Annahme wird der Beitrag dem Plot zugeordnet. Eigene Beiträge kann ein Mitglied direkt zuordnen.

## STU-Quellen

- `src/Module/Communication/Action/ApplyKnPostToPlot/ApplyKnPostToPlot.php`
- `src/Module/Communication/Action/AddKnPostToPlot`

## SWU-Pfade

- `apps/backend/src/modules/rpg/*` (Antrag als Entity `plot_post_requests` oder signierter Token)
- `apps/backend/src/modules/holonet/holonet.service.ts`
- `apps/frontend/src/pages/holonet.tsx`, `apps/frontend/src/pages/messages.tsx` (Annehmen-Link)

## Akzeptanzkriterien

- [ ] Endpunkt „Beitrag zu Plot hinzufügen“: eigener Beitrag eines Mitglieds wird sofort zugeordnet; fremder Beitrag erzeugt einen Antrag und eine Systemnachricht an den Autor.
- [ ] Nur der Autor kann den Antrag annehmen oder ablehnen; Annahme setzt `plotId` (Kategorie `ROLEPLAY` gemäß soc-E3b) und benachrichtigt den Antragsteller.
- [ ] Beiträge, die schon einem Plot gehören, und beendete Plots werden abgelehnt.
- [ ] UI: Aktion „Zu Plot hinzufügen“ am Beitrag (für Plotmitglieder), Liste offener Anträge für den Autor mit Annehmen/Ablehnen.
- [ ] Backend-Tests: direkte Zuordnung, Antrag, Annahme, Ablehnung, Rechte. Frontend-Test: Antrag stellen und annehmen.

## Comments
