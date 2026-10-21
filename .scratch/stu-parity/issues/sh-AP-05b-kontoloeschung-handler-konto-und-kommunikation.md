# Kontolöschung: Handler für Konto, Kommunikation und Allianz

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** sh-AP-05a

## Ziel

Die Lösch-Handler für alle konto- und kommunikationsbezogenen Daten werden am `PlayerDeletionService` registriert. Inhalte, die andere Spieler sehen (Nachrichten, HoloNet, Allianzforum), bleiben erhalten und zeigen den Autor als „Gelöschter Siedler“ (`FORUM_DELETED_AUTHOR_NAME`), wie STU sie an den Fallback-Benutzer hängt. Der vorhandene Allianz-Einstieg `AllianceService.removeAccount` wird angeschlossen. Kanonisch für den Kommunikationsteil von soc-H4.

## STU-Quellen

- `src/Component/Player/Deletion/Handler/PrivateMessageDeletionHandler.php` (Absender → Fallback-Benutzer)
- `KnPostDeletionHandler.php` (Beitrag behält Namen, Autor → Fallback)
- `AllianceDeletionHandler.php`, `ContactDeletionHandler.php`, `UserRelationDeletionHandler.php`, `UserDeletionHandler.php`

## SWU-Pfade

- `apps/backend/src/modules/messaging/entities/message.entity.ts` (`senderId`, `recipientId`)
- `apps/backend/src/modules/holonet/entities/*` (`authorId`, Ratings, Checkpoints)
- `apps/backend/src/modules/alliance/alliance.service.ts#removeAccount`
- `apps/backend/src/modules/settings/entities/user-setting.entity.ts`, `auth/invite-key.entity.ts`, `auth/invite-quota.entity.ts`
- `apps/backend/src/modules/prestige/entities/prestige-history-entry.entity.ts`
- `packages/shared/src/lib/alliance/index.ts` (`FORUM_DELETED_AUTHOR_NAME`)

## Akzeptanzkriterien

- [ ] Nachrichten: Empfangene Nachrichten des Gelöschten werden gelöscht; von ihm gesendete Nachrichten bleiben beim Empfänger und zeigen „Gelöschter Siedler“ (z. B. `senderId` nullable oder Fallback-Konto; Migration).
- [ ] HoloNet: Beiträge und Kommentare bleiben mit Autor „Gelöschter Siedler“; Bewertungen und Checkpoints des Gelöschten werden entfernt.
- [ ] Allianz: `AllianceService.removeAccount` wird als Handler mit früher Reihenfolge aufgerufen (Nachfolge/Auflösung wie im Allianz-Lebenszyklus spezifiziert).
- [ ] Einstellungen, Notizen, Invite-Quota, vom Spieler erzeugte unbenutzte Invite-Keys und Prestige-Historie werden gelöscht; benutzte Invite-Keys verlieren nur den Personenbezug.
- [ ] Spätere Fachissues (Kontakte soc-B1a, Ignorierliste soc-C1a, Charaktere soc-E1, Plots soc-E3a, Handel tmw-T11) registrieren ihre Handler selbst; ein kurzer Abschnitt in der Moduldokumentation bzw. im Interface-Kommentar beschreibt das Muster.
- [ ] Integrationstest (Postgres): Spieler mit Nachrichten in beide Richtungen, HoloNet-Beitrag, Allianzmitgliedschaft und Einstellungen wird gelöscht; andere Spieler sehen die Inhalte mit „Gelöschter Siedler“; keine FK-Fehler.

## Comments
