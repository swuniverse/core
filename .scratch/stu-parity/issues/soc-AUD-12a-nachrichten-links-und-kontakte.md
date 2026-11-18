# Kleinere Nachrichtenlücken: Kontakt-Dropdown, Forenroute, „ansehen“-Ziele

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

Drei kleinere Fehler bzw. Lücken bei Nachrichten:

1. **Kontakt-Dropdown beim Verfassen leer:** Die Kontakte werden nur geladen, wenn der Tab „Kontakte“ offen ist. Wer direkt „Nachricht verfassen“ öffnet, sieht ein leeres Dropdown „Kontakt wählen“. Der Test lädt vorher den Kontakte-Tab und verdeckt den Fehler. STU füllt die Kontaktliste in `writePm.twig` immer.
2. **Route `ALLIANCE_TOPIC` falsch:** Die Route verwendet die Topic-ID auch als Allianz-ID (`/alliances/${targetId}/forum/topics/${targetId}`). Das ist ein latenter Fehler, weil das Ziel noch nirgends gesetzt wird.
3. **„ansehen“-Links fehlen:** `MessageTargetKind` wird nur für Kolonie, HoloNet und Schiff (nur Ionensturm) gesetzt. Rund 80 weitere `sendSystem`-Aufrufe (Kampf, Handel, Werft, Reparatur, Traktor, Übernahme …) haben kein Ziel. STU setzt `href` in deutlich mehr Erzeugern.

## STU-Quellen

- `src/html/message/writePm.twig`, `src/Module/Message/View/ShowWritePm/ShowWritePm.php` (`CONTACT_LIST`)
- `src/Module/Message/Lib/PrivateMessageSender.php` (`href` bzw. `EntityWithHrefInterface`, Z. ~38, ~105)
- `src/html/view/pmCategory.twig` („ansehen“-Lupe)

## SWU-Pfade

- `apps/frontend/src/pages/messages.tsx` (Laden der Kontakte Z. ~515–522, Zielrouten Z. ~80–86)
- `apps/frontend/src/pages/messages.spec.tsx` (Test Z. ~539–555)
- `packages/shared/src/lib/messaging/message-target.ts` (`MessageTargetKind`, ggf. um Allianz-ID für Topics erweitern)
- `apps/backend/src/modules/messaging/messaging.service.ts` (`sendSystem` Parameter `target`)
- Aufrufer ohne Ziel, u. a. `apps/backend/src/modules/spacecraft/spacecraft.service.ts`, `spacecraft-destruction.service.ts`, `spacecraft-takeover.service.ts`, `spacecraft-boarding.service.ts`, `spacecraft-tractor.service.ts`, `spacecraft-repair.service.ts`, `station-repair.service.ts`, `escape-pod.service.ts`, `apps/backend/src/modules/trade/*.service.ts`, `apps/backend/src/modules/combat/combat.service.ts`

## Akzeptanzkriterien

- [ ] Compose lädt die eigene Kontaktliste unabhängig vom Tab (spätestens beim Öffnen von Compose); Test öffnet Compose direkt und erwartet gefüllte Optionen.
- [ ] Das Ziel `ALLIANCE_TOPIC` trägt Allianz-ID und Topic-ID (oder die Route löst die Allianz serverseitig auf); die Route führt auf `/alliances/<allianceId>/forum/topics/<topicId>`. Neue Forenantworten/-benachrichtigungen setzen dieses Ziel.
- [ ] Systemnachrichten mit einem eindeutigen, für den Empfänger sichtbaren Bezugsobjekt setzen ein Ziel: eigenes Schiff/eigene Station (`SPACECRAFT`), eigene Kolonie (`COLONY`), ggf. Handelsposten. Eine Liste der umgestellten Aufrufer und der bewusst zielfreien (z. B. zerstörtes Objekt) steht im Ticket-Kommentar.
- [ ] Ziele auf zerstörte oder fremde, nicht sichtbare Objekte werden nicht gesetzt.
- [ ] Backend-Tests für eine repräsentative Auswahl je Modul (Kampf, Handel, Werft/Reparatur, Traktor). Frontend-Tests: Kontakt-Dropdown, Forenroute.

## Herkunft

- Audit 2026-11-17: [social.md](../audit-2026-11-17/social.md) Kleine Abweichungen „Compose, Kontakt-Dropdown leer“ und „‚ansehen‘-Ziele“, Seitenabgleich „PM schreiben“.
- `soc-A5-verlinkte-meldungen.md` ist `resolved`, deckt aber nur Kolonie/HoloNet ab; der Großteil der Erzeuger ist ohne Ziel.

## Comments
