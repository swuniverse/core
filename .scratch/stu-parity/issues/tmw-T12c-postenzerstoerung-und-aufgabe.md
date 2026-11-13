# Spielerbetriebene Handelsposten: Zerstörung und Aufgabe

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** tmw-T12a, tmw-T11b

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

- [x] Ein Zerstörungs-Hook für Stationen mit Posten setzt die STU-Bergungsregel um (deterministisch testbar). Anschließend werden Posten, Konten, Angebote und Lizenzen entfernt, und die Kontoinhaber erhalten eine Nachricht.
- [x] Die Kontolöschung des Eigentümers markiert den Posten als verlassen. Angebote erstellen bzw. annehmen und Lizenzen kaufen sind dann gesperrt (Meldung wie STU), Abheben vom Konto aufs Schiff bleibt möglich.
- [x] Backend-Tests: Zerstörung mit Bergungsgut, Benachrichtigung, verlassener Posten sperrt die richtigen Aktionen.

## Comments
- 2026-11-09: Der geforderte TradeDeletionHandler stammt aus tmw-T11b; dessen Abhängigkeit auf den Löschorchestrator bleibt transitiv.
- 2026-11-13: Umgesetzt (59197c48).
  - Zerstörung (`PlayerTradePostService.destroyForStation`, aufgerufen in `SpacecraftDestructionService.finalizeInManager` für Stationen, in derselben Transaktion): nach STU `TradepostDestruction` geht jede Kontozeile und jede Angebotsreserve mit 50 % verloren, sonst landen 0–50 % (aufgerundet) als Bergungsgut im Wrack, zusammen mit der Fracht der Station. Danach wird der Posten gelöscht; Konten, Angebote, Lizenzen und Lizenzbedingung fallen per FK mit. Jeder Konto- oder Angebotsinhaber erhält „Handelsposten zerstört“ im Handelsordner. Der Zufall ist injizierbar (`RandomInt`), der Test prüft die genaue Ziehfolge.
  - Verlassen (`abandonOwnedBy`, erster Schritt von `TradeDeletionHandler`): wie STU `TradepostDeletionHandler`. Da SWU keinen `USER_NOONE` hat, wird `trade_posts.ownerId` nullable (Migration `20261113180000-abandon-player-trade-posts`, FK jetzt `ON DELETE SET NULL`). Der Posten verliert Eigentümer, Station (die mit dem Konto gelöscht wird) und Lizenzbedingung und heißt „Verlassener Handelsposten“; Netz und Ort bleiben. Konten, Angebote und Lizenzen anderer Spieler bleiben, sie erhalten die STU-Nachricht „… wurde verlassen. Du solltest deine Waren hier schleunigst abholen …“.
  - Sperren mit STU-Meldung „Dieser Handelsposten wurde verlassen. Handel ist nicht mehr möglich.“: Angebot erstellen, Angebot annehmen, Lizenz kaufen und verlängern sowie Netztransfer **in** den verlassenen Posten (STU `TransferCommodities`; er erscheint auch nicht mehr als Transferziel). Möglich bleiben: Auszahlen aufs Schiff, Netztransfer **aus** dem Posten und Zurückziehen eigener Angebote. Das Handelsabkommen gewährt an verlassenen Posten keine Gratislizenz.
  - Anzeige: Die Postenliste liefert `owner: null` (Shared-DTO), Handelsseite und Datenbank zeigen „Verlassen“ als Betreiber.
  - Nachrichten in Zerstörung und Löschung werden in der laufenden Transaktion gespeichert; der Live-Hinweis per Socket entfällt dort, weil Destroy-/Löschpfade keinen Commit-Hook weiterreichen. Das Postfach zeigt sie trotzdem.
  - Tests: `player-trade-post-lifecycle.int-spec.ts` (Bergungsregel mit fester Ziehfolge, Löschung von Posten/Konten/Angeboten/Lizenzen, Benachrichtigung nur der Inhaber, Station ohne Posten; Verlassen mit Name, Eigentümer, Station, Nachricht, Postenliste; Sperren und erlaubte Aktionen), Unit-Tests in `spacecraft-destruction.service.spec.ts` (Bergungsgut im Wrack, kein Hook für Schiffe), `database-trade-posts.service.spec.ts`, `trade.spec.tsx`; bestehende Lösch- und Auktionstests angepasst. Mutationsproben (Sperre beim Angebot entfernt, 50-%-Verlust entfernt) lassen Tests scheitern.
  - Gates: Lint 0 Fehler (Warnungen unverändert 1442/110), Typecheck und Build grün, Frontend 751/751; Backend-Unit grün bis auf den bekannten `password-reset.service.spec.ts`-Timeout. Integration 666/692: die 26 Fehler in `starmap-contacts-requests` und `statistics` (`LayerAccessGuard` nicht auflösbar) bestehen unverändert vor dieser Änderung.
