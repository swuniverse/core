# Kontolöschung: Handler für Konto, Kommunikation und Allianz

**Status:** resolved
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

- [x] Nachrichten: Empfangene Nachrichten des Gelöschten werden gelöscht; von ihm gesendete Nachrichten bleiben beim Empfänger und zeigen „Gelöschter Siedler“ (z. B. `senderId` nullable oder Fallback-Konto; Migration).
- [x] HoloNet: Beiträge und Kommentare bleiben mit Autor „Gelöschter Siedler“; Bewertungen und Checkpoints des Gelöschten werden entfernt.
- [x] Allianz: `AllianceService.removeAccount` wird als Handler mit früher Reihenfolge aufgerufen (Nachfolge/Auflösung wie im Allianz-Lebenszyklus spezifiziert).
- [x] Einstellungen, Notizen, Invite-Quota, vom Spieler erzeugte unbenutzte Invite-Keys und Prestige-Historie werden gelöscht; benutzte Invite-Keys verlieren nur den Personenbezug.
- [x] Spätere Fachissues (Kontakte soc-B1a, Ignorierliste soc-C1a, Charaktere soc-E1, Plots soc-E3a, Handel tmw-T11) registrieren ihre Handler selbst; ein kurzer Abschnitt in der Moduldokumentation bzw. im Interface-Kommentar beschreibt das Muster.
- [x] Integrationstest (Postgres): Spieler mit Nachrichten in beide Richtungen, HoloNet-Beitrag, Allianzmitgliedschaft und Einstellungen wird gelöscht; andere Spieler sehen die Inhalte mit „Gelöschter Siedler“; keine FK-Fehler.

## Comments

- 2026-10-30: Abbruch nach zwei Prüfversuchen. Die fokussierten Account-/Messaging-/HoloNet-Tests waren grün (22 Tests), aber die verpflichtenden Gates sind in der vorhandenen Arbeitskopie fachfremd rot: Backend-Typecheck/Build scheitern an fehlendem `dotenv` sowie zahlreichen stale TS6305-Buildartefakten; der Frontend-Build findet `pixi.js` nicht. Bitte die Dependency-/Build-Baseline wiederherstellen oder bestätigen, welche bestehende Baseline-Ausnahme für diesen Durchlauf gilt. Produktcode wurde gemäß Abbruchregel verworfen.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Dependency-/Build-Gates (dotenv, pixi.js, TS6305)); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
- 2026-11-13: Umgesetzt (04779aa5, gemeinsam mit sh-AP-05c).
  - Handler registrieren sich in ihren Modulen (`onModuleInit` → `PlayerDeletionService.register`); Reihenfolge und Muster sind im Kommentar von `PlayerDeletionHandler` beschrieben.
  - Abweichung: `AllianceService.removeAccount` läuft in eigenen Transaktionen und schreibt Chronikeinträge mit FK auf den Spieler; innerhalb der Löschtransaktion würde das auf die Zeilensperre des Benutzers warten. Der Handlervertrag hat deshalb einen optionalen Schritt `prepare(userId)` vor der Transaktion; der Allianzaustritt (Nachfolge/Auflösung) ist damit vor der Löschung festgeschrieben.
  - Nachrichten: empfangene werden gelöscht, gesendete bleiben mit `senderId = NULL`; Postfach und Detailansicht zeigen „Gelöschter Siedler“ (`deleted-player.ts`), Antworten ist ausgeblendet.
  - HoloNet: Beiträge und Kommentare bleiben mit `authorId = NULL` und Autor „Gelöschter Siedler“; Bewertungen und Lesemarke des Spielers werden gelöscht; Nachrichten-, Profil- und Plotantrag-Pfade sind null-sicher.
  - Konto: Einstellungen, Notizen, Invite-Quota folgen per Cascade; unbenutzte vom Spieler erzeugte bzw. ihm gehörende Invite-Keys und die Prestige-Historie werden gelöscht, benutzte Keys verlieren den Personenbezug. News behalten den Text ohne Autor (bisher blockierte `news.authorId` mit RESTRICT jede Löschung).
  - Migration `20261113190000-keep-content-of-deleted-players`: `messages.senderId`, `holonet_posts/comments.authorId`, `news.authorId` nullable mit `ON DELETE SET NULL`.
  - Nebenbei behoben: `GET holonet/:id/comments` scheiterte an einer nicht existierenden Relation `plot`.
  - Tests: `account-deletion.int-spec.ts` über das komplette `AppModule` (Nachrichten in beide Richtungen, HoloNet-Beitrag/Kommentar/Bewertung/Lesemarke, Allianzmitglied und -präsident, Einstellungen, Notiz, Prestige, Invite-Keys, News; keine FK-Fehler), `player-deletion.service.spec.ts` (prepare vor delete), `holonet.spec.tsx`. Mutationsprobe (Allianz-Handler entfernt) lässt Tests scheitern.
  - Gates: Lint 0 Fehler (Warnungen unverändert 1442/110), Typecheck und Build grün, Backend-Unit 2089/2089, Frontend 752/752 (nach Typfix im neuen Frontend-Test erneut grün). Integration 670/696: die 26 Fehler in `starmap-contacts-requests` und `statistics` (`LayerAccessGuard`) bestehen unverändert vor dieser Änderung.
