# RPG: Charaktere in HoloNet-Beiträgen markieren

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** soc-E1, soc-D1

## Ziel

Beim Schreiben und Bearbeiten eines HoloNet-Beitrags können Charaktere (eigene und fremde) markiert werden. Besitzer fremder Charaktere erhalten eine Systemnachricht. Beiträge zeigen die markierten Charaktere; ein Klick öffnet die Charakteransicht.

## STU-Quellen

- `src/Module/Communication/Action/AddKnPost/AddKnPost.php` (`characterIds`, `notifyCharacterOwners`)
- `src/Module/Communication/Action/EditKnPost/EditKnPost.php`
- `src/Module/Communication/View/ShowKnCharacter`, `src/html/communication/knCharacter.twig`

## SWU-Pfade

- `apps/backend/src/modules/holonet/holonet.service.ts` (`create`, `update`), neue Join-Tabelle `holonet_post_characters`
- `apps/backend/src/modules/rpg/*` (aus soc-E1)
- `apps/frontend/src/pages/holonet.tsx` (Compose, Beitragsanzeige, Charakter-Popup)

## Akzeptanzkriterien

- [ ] Create/Update akzeptieren `characterIds` (max. 10); unbekannte IDs liefern 400 mit Nennung der ID.
- [ ] Besitzer fremder Charaktere (nicht der Autor) erhalten je Beitrag genau eine Systemnachricht „Dein Charakter X wurde im HoloNet-Beitrag Y erwähnt“ (mit Ziel aus soc-A5, falls vorhanden); beim Bearbeiten nur für neu hinzugekommene Charaktere.
- [ ] Beitragsanzeige listet die Charaktere (Avatar + Name); Klick zeigt Name, Avatar, Beschreibung und Besitzer.
- [ ] Gelöschte Charaktere verschwinden aus Beiträgen ohne Fehler.
- [ ] Backend-Tests: Speicherung, Benachrichtigung (kein Selbsthinweis, keine Duplikate beim Bearbeiten). Frontend-Test: Auswahl im Compose und Anzeige.

## Comments
