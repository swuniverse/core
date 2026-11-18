# Schnell-PM als Popup mit Quell-/Zielkontext und Crew-XP

**Status:** ready-for-agent
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

Die Schnell-PM wechselt heute über `PmLink` auf `/messages?tab=compose&to=…`; der Spieler verliert dabei den Kontext (Schiff, Kolonie, Datenbank). STU öffnet ein Popup auf der aktuellen Seite: Empfänger fest und nur angezeigt, ein Textfeld, kein Betreff, Versand per Ajax mit Erfolgsanzeige im Popup. Quelle und Ziel (Schiff/Station/Kolonie) werden mitgegeben; eine PM von einem eigenen Schiff oder einer Station an ein fremdes, nicht befreundetes Nicht-NPC-Ziel auf demselben Feld gibt Crew-XP (`FOREIGN_CONTACT_MESSAGE`). SWU definiert dieses Ereignis, löst es aber nie aus.

Dieser Teil baut das Popup, den Kontext-Endpunkt und die Crew-XP und stellt die vorhandenen Einstiege (`PmLink`, NBS-Dialog) darauf um. Betreff-Entfernung und Empfängerwahl der normalen PM folgen in soc-AUD-07b, zusätzliche Einstiege in soc-AUD-07c.

## STU-Quellen

- `src/Public/static/js/default.js` (Z. ~146 `openPmWindow`, `sendQuickPM`)
- `src/Module/Message/View/ShowWriteQuickPm/ShowWriteQuickPm.php` (Typen USER/SHIP/FLEET/STATION/COLONY, Vorlagetext), `ConversationInfo.php`
- `src/Module/Message/View/ShowWriteQuickPmResponse/ShowWriteQuickPmResponse.php`
- `src/html/communication/writeQuickPm.twig`, `src/html/communication/writeQuickPmResponse.twig`
- `src/Module/Message/Action/WritePm/WritePm.php` (ruft `QuickPmCrewExperience`)
- `src/Module/Message/Lib/QuickPmCrewExperience.php` (Z. 30–57: Bedingungen)
- `src/Component/Crew/Skill/SkillEnhancementEnum.php`
- `src/html/macros.twig` (`pmWindow`)

## SWU-Pfade

- `apps/frontend/src/components/PmLink.tsx` (heute Link auf Compose; wird zum Popup-Auslöser)
- neu: z. B. `apps/frontend/src/components/messaging/QuickPmDialog.tsx`
- `apps/frontend/src/components/spacecraft/NearbyMessageDialog.tsx`, `apps/frontend/src/components/spacecraft/NearbySensorPanel.tsx` (Z. ~388–400)
- `apps/backend/src/modules/spacecraft/spacecraft-communication.service.ts` (`sendNearbyMessage` Z. ~159–216, Vorlagetext Z. ~201–206)
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts` (`POST :id/communications/nearby/:targetId`)
- `apps/backend/src/modules/messaging/messaging.service.ts` (`send`), `messaging.controller.ts`
- `apps/backend/src/modules/spacecraft/crew-expertise.ts` (`CrewEnhancementEvent.FOREIGN_CONTACT_MESSAGE` Z. 16, 57), `crew-enhancement.service.ts` (`enhanceSpacecraft`)
- `apps/backend/src/modules/alliance/relationship-resolver.service.ts` (Freundprüfung)

## Akzeptanzkriterien

- [ ] Wiederverwendbares Popup/Overlay „Schnell-PM“: zeigt den Empfänger (Name, ID) nur an, ein Textfeld, Absenden ohne Seitenwechsel, Erfolgs- bzw. Fehlermeldung im Popup; Escape/Schließen ohne Datenverlust-Warnung nur bei leerem Text. Barrierefrei (`role="dialog"`, Fokusfalle).
- [ ] `PmLink` öffnet dieses Popup statt auf `/messages` zu navigieren; alle bestehenden Einstiege (Profil, HoloNet, Forum, Datenbank-NPC-/Admin-Liste, Systemansicht, Mitgliederübersicht, Kontaktliste) nutzen es.
- [ ] Optionaler Kontext `source {type: SHIP|STATION|COLONY|USER, id}` und `target {type, id}`; der NBS-Dialog (Schiff/Station → Schiff/Station) läuft über dasselbe Popup mit Vorlagetext „<Schiff> sendet an <Ziel> in Sektor x|y“ wie heute.
- [ ] Serverseitig: Ein Endpunkt (bestehender PM-Versand erweitert oder neuer Quick-PM-Endpunkt) prüft den Kontext: Quelle gehört dem Absender, Zielbesitzer = Empfänger. Ungültiger Kontext → PM wird trotzdem verschickt, aber ohne XP (wie STU).
- [ ] Crew-XP `FOREIGN_CONTACT_MESSAGE` wie STU: Quelle ist eigenes Schiff oder eigene Station; Ziel ist Schiff/Station/Kolonie des Empfängers; Empfänger kein NPC; gleiches Feld; Empfänger ist aus Sicht des Absenders kein Freund. Sonst keine XP.
- [ ] Ignorierliste, Leerer-Text-Prüfung und Längengrenzen gelten wie beim normalen Versand.
- [ ] Backend-Tests: XP bei fremdem neutralem Ziel auf demselben Feld; keine XP bei Freund, NPC, anderem Feld, fremder Quelle, Kontext USER.
- [ ] Frontend-Tests: `PmLink` öffnet Popup statt Navigation; Versand ruft API und zeigt Erfolg; Fehler bleibt im Popup; NBS-Dialog übergibt Kontext.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt M4 und Entscheidungen PO zu M; H („Eine PM vom Schiff gibt keine Crew-XP“); [social.md](../audit-2026-11-17/social.md) Kleine Abweichungen „Quick-PM ohne Crew-XP“, Seitenabgleich „Schnell-PM-Popup“, Unsicherheit 1, „Bewusste/entschiedene Abweichungen“ (Schnell-PM als Seitenwechsel – jetzt aufgehoben).
- PO-Entscheidung M4 vom 2026-11-17: Schnell-PM wie STU.
- `soc-A2-schnell-pm-ueberall.md` (resolved) hat den Seitenwechsel-Link gebaut; dessen Form wird ersetzt.

## Comments
