# Saisonale Anomalien (Adventstür, Osterei)

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** tmw-K10a3

## Ziel

Zu Advent und Ostern entstehen zufällige saisonale Anomalien. Ein Schiff auf ihrem Feld kann sie öffnen und erhält dafür eine Sammelware. Wie in STU gibt es Sonderprestige: zu Nikolaus beim ersten Öffnen des Tages und beim letzten Osterei. Inhalt und Belohnung sind STU-Parität. Der Agent wählt nach Leitplanke 2 passende Star-Wars-Bezeichnungen (z. B. „Lebenstag-Geschenk“ statt Adventstür, nach dem Wookiee-Fest Lebenstag) und hält sie in `map.md` unter „Entscheidungen“ fest.

## STU-Quellen

- `src/Component/Anomaly/Type/AdventDoorHandler.php` (am 1.12. um 0 Uhr werden 5 Türen erzeugt, alte Punkte gelöscht), `EasterEggHandler.php` (Ostersonntag 0 Uhr, viele Eier)
- `src/Module/Spacecraft/Action/OpenAdventDoor/OpenAdventDoor.php` (eine Tür je Tag, Frachtraum nötig, am 6.12. beim ersten Öffnen 500 Prestige), `OpenEasterEgg/OpenEasterEgg.php` (500 Prestige beim letzten Ei)
- `src/Module/Commodity/CommodityTypeConstants.php` (`COMMODITY_ADVENT_POINT = 60`, `COMMODITY_EASTER_EGG = 73`)
- `src/html/anomaly/*`, Assets `st-universe/assets/anomalies/1001.png`, `1002.png`, `advent/`, `easter/`

## SWU-Pfade

- Framework aus tmw-K10a, `apps/backend/src/modules/prestige/prestige.service.ts`
- Waren: `game-data/data/commodities/stu-commodity-map.yaml` (IDs 60/73 prüfen bzw. ergänzen), `apps/backend/src/modules/game-data/game-data.service.ts`
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts`, `apps/frontend/src/components/spacecraft/FieldContextPanel.tsx`, `ShipQuickActions.tsx`

## Akzeptanzkriterien

- [ ] Zwei saisonale Typen sind im Register eingetragen. Die Erzeugung erfolgt zeitgesteuert (Advent: ab 1.12., Ostern: Ostersonntag, berechnet in Europe/Berlin), und eine Konfiguration erlaubt das Abschalten (Standard: an).
- [ ] `POST spacecraft/:id/anomaly/:anomalyId/open` gibt dem Schiff eine Sammelware, sofern Platz im Frachtraum ist. Begrenzung: eine Tür je Spieler und Tag bzw. ein Ei je Ei-Anomalie. Das Sonderprestige folgt den STU-Regeln, mit Prestigelog-Eintrag.
- [ ] Feldkontext bzw. Schnellaktionen zeigen „Öffnen“ nur auf dem Anomaliefeld.
- [ ] Die Star-Wars-Bezeichnungen stehen in `map.md` unter „Entscheidungen“.
- [ ] Backend-Tests mit festgesetzter Uhr: Erzeugungstag, Tageslimit, Prestige an den Sondertagen, voller Frachtraum. Frontend-Test: Die Aktion ist sichtbar und ruft die API auf.

## Comments
- 2026-11-09: Saisonaktionen auf dem Anomaliefeld benötigen Framework und Feldkontextvertrag der K10a-Kette bis tmw-K10a3; der Parent ist nur Tracking-Split.
