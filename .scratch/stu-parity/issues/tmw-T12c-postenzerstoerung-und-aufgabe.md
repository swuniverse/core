# Spielerbetriebene Handelsposten: Zerstörung und Aufgabe

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** tmw-T12a, sh-AP-05a

## Ziel

Wird die Station eines Handelspostens zerstört, wird der Posten nach STU-Regel abgewickelt: Zufällig die Hälfte der Lagerposten geht verloren, vom Rest bleiben 0–50 % als Bergungsgut im Trümmerfeld. Angebote, Lizenzen und Konten am Posten entfallen, und die Kontoinhaber werden benachrichtigt. Wird das Konto des Eigentümers gelöscht, gilt der Posten als „verlassen“. Dort sind kein Handel und keine neuen Angebote mehr möglich, Auszahlungen schon.

## STU-Quellen

- `src/Module/Spacecraft/Lib/Destruction/Handler/TradepostDestruction.php` (50 % der Lagerposten gelöscht, Rest 0–50 % ins Trümmerfeld)
- `src/Component/Player/Deletion/Handler/TradepostDeletionHandler.php` (Eigentümer `USER_NOONE`, Netz neutralisiert, Nachrichten an Kontoinhaber)
- `src/Module/Trade/Action/CreateOffer/*`, `TakeOffer/*` („Dieser Handelsposten wurde verlassen“)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft-destruction.service.ts`, `entities/spacecraft-wreck.entity.ts` (Bergungsgut)
- Löschgerüst sh-AP-05a, `TradeDeletionHandler` aus tmw-T11b
- Modul `apps/backend/src/modules/trade/`, `messaging.service.ts`

## Akzeptanzkriterien

- [ ] Ein Zerstörungs-Hook für Stationen mit Posten setzt die STU-Bergungsregel um (deterministisch testbar). Anschließend werden Posten, Konten, Angebote und Lizenzen entfernt, und die Kontoinhaber erhalten eine Nachricht.
- [ ] Die Kontolöschung des Eigentümers markiert den Posten als verlassen. Angebote erstellen bzw. annehmen und Lizenzen kaufen sind dann gesperrt (Meldung wie STU), Abheben vom Konto aufs Schiff bleibt möglich.
- [ ] Backend-Tests: Zerstörung mit Bergungsgut, Benachrichtigung, verlassener Posten sperrt die richtigen Aktionen.

## Comments
