# Kontolöschung räumt Handelsdaten ab

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** tmw-T4b, sh-AP-05a

## Ziel

Wird ein Spielerkonto gelöscht, werden seine Warenkonten, Angebote (mit Reserven), Lizenzen, Transfers, Gebote, Lose und Shoutbox-Einträge bereinigt. Laufende Auktionen, in denen er Höchstbietender war, werden korrekt behandelt. Für eigene Handelsposten (erst ab tmw-T12a) gilt die Postenaufgabe aus tmw-T12c. Umgesetzt wird das als Handler im Löschgerüst aus sh-AP-05a.

## STU-Quellen

- `src/Component/Player/Deletion/Handler/TradepostDeletionHandler.php` (Posten des Gelöschten werden „verlassen“: `USER_NOONE`; Kontoinhaber werden benachrichtigt)
- `src/Component/Player/Deletion/Handler/*` (Muster), `src/Orm/Repository/StorageRepository.php` (Kaskade über `user_id`)

## SWU-Pfade

- Löschorchestrator und Handler-Registrierung aus sh-AP-05a (`PlayerDeletionService`)
- Modul `apps/backend/src/modules/trade/` (alle Handelsentitäten)
- `apps/backend/src/modules/prestige/prestige.service.ts` (Auktionsrückerstattung entfällt bei Löschung)

## Akzeptanzkriterien

- [ ] Ein `TradeDeletionHandler` ist im Löschgerüst registriert. Er läuft in der Löschtransaktion und entfernt Konten, Angebote und Reserven, Lizenzen, Transfers, Lose, Shoutbox-Einträge und Gebote des Spielers, soweit die jeweiligen Entitäten bereits existieren. Werden tmw-T6, tmw-T8b oder tmw-T9 später umgesetzt, ergänzen sie ihren Teil in diesem Handler (das steht als Hinweis im Code am Handler).
- [ ] War der Spieler Höchstbietender einer laufenden Auktion, wird das nächsthöhere gültige Gebot Höchstgebot, oder die Auktion ist ohne Gebot.
- [ ] Transaktionen bleiben anonymisiert erhalten, damit die Rangliste aus tmw-T11a stabil bleibt.
- [ ] Backend-Integrationstest: Ein Spieler mit Konto, Angebot, Lizenz, Gebot und Losen wird gelöscht. Danach ist nichts mehr von ihm vorhanden, und andere Spieler sind unbeeinträchtigt.

## Comments
