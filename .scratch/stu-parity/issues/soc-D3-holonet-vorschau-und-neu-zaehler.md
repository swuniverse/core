# HoloNet: Vorschau und Zähler neuer Beiträge

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Beim Schreiben eines Beitrags gibt es eine Vorschau mit dem echten BBCode-Rendering. Die Navigation zeigt die Zahl neuer HoloNet-Beiträge seit dem Lesezeichen über den bereits vorhandenen Endpunkt `GET /holonet/new-count`, der heute keinen Frontend-Verbraucher hat.

Abgrenzung: Die Maindesk-Markierung neuer Beiträge gehört zu sh-AP-18; das Navigations-Badge gehört hierher.

## STU-Quellen

- `src/Module/Communication/Action/KnPostPreview`
- `src/Module/Game/Lib/View/Provider/CommunicationProvider.php` (`NEW_KN_POSTING_COUNT`)
- `src/html/maindesk/newKnPostings.twig`

## SWU-Pfade

- `apps/frontend/src/pages/holonet.tsx` (`HolonetComposePage`)
- `apps/frontend/src/components/BbCodeText.tsx`
- `apps/frontend/src/components/layout/sidebar.tsx` bzw. `bottom-nav.tsx`
- `apps/backend/src/modules/holonet/holonet.controller.ts` (`new-count`)

## Akzeptanzkriterien

- [ ] Compose hat einen Umschalter „Vorschau“, der Titel und Text mit `BbCodeText` (gleiche Optionen wie die Beitragsanzeige) rendert, ohne zu speichern.
- [ ] Sidebar (und Bottom-Nav) zeigen beim HoloNet-Eintrag ein Badge mit `new-count`, wenn > 0; aktualisiert beim Laden der App, beim Navigieren auf das HoloNet und nach `checkpoint`.
- [ ] Kein Badge, wenn der Wert 0 ist oder der Abruf fehlschlägt.
- [ ] Frontend-Tests: Vorschau rendert BBCode; Badge erscheint bei > 0 und verschwindet nach Checkpoint.

## Comments
