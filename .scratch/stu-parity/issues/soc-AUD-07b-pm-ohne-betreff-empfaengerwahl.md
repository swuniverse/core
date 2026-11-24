# PMs ohne Betreff, Empfänger per Siedler-ID oder Kontaktliste

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** soc-AUD-07a

## Ziel

STU-Privatnachrichten haben keinen Betreff (`PrivateMessage` hat kein Betrefffeld). Die normale PM wählt den Empfänger über die Siedler-ID oder aus der Kontaktliste, nicht über eine Namenssuche. SWU hat einen Betreff in Entity, DTO, UI und allen Systemnachrichten und sucht den Empfänger per Name. Nach PO-Entscheidung M4 entfällt der Betreff für **alle** PMs, und die Namenssuche entfällt.

## STU-Quellen

- `src/Orm/Entity/PrivateMessage.php` (kein Betreff)
- `src/html/message/writePm.twig` (Empfänger-ID, Kontaktliste, Korrespondenz)
- `src/Module/Message/View/ShowWritePm/ShowWritePm.php`, `src/Module/Message/Action/WritePm/WritePm.php`
- `src/Module/Admin/Action/SendMassMail.php` (Z. ~94–105: PM-Variante setzt „[b]Betreff: …[/b]“ an den Textanfang)

## SWU-Pfade

- `apps/backend/src/modules/messaging/entities/message.entity.ts` (`subject` Z. ~42)
- `apps/backend/src/database/migrations/` (neue Migration)
- `packages/shared/src/lib/common/index.ts` (`SendMessageDto`, `MessageCorrespondenceDto`), `packages/shared/src/lib/messaging/admin-broadcast.ts`
- `apps/backend/src/modules/messaging/messaging.service.ts` (`send`, `sendNpcTrade`, `sendSystem`, `sendSystemToMany`), `messaging.controller.ts`
- alle Aufrufer von `sendSystem`/`sendSystemToMany` (ca. 86 Stellen, u. a. `colony-event.service.ts`, Kampf, Handel, Werft, Allianz, HoloNet)
- `apps/backend/src/modules/mail/mail.service.ts`, `apps/backend/src/modules/messaging/admin-broadcast.service.ts`
- `apps/frontend/src/pages/messages.tsx` (Compose, Listen, Detail, Messenger-Vorschau), `apps/frontend/src/pages/admin-mass-message.tsx`, Dashboard-Vorschauen

## Akzeptanzkriterien

- [x] Spalte `subject` entfällt per Migration. Bestehende Nachrichten verlieren keine Information: Ein nicht leerer Betreff wird in der Migration als fett gesetzte erste Zeile (`[b]…[/b]`) vor den Text gestellt, sofern der Text ihn nicht schon enthält.
- [x] DTOs, Controller, Service-Signaturen und alle `sendSystem`-Aufrufer haben keinen Betreff mehr. Wo der Betreff bisher Information trug, die im Text fehlt, wird der Text ergänzt (Prüfung je Aufrufer; Tests der Fachmodule angepasst).
- [x] Massenmail als PM setzt wie STU „[b]Betreff: …[/b]“ vor den Text; als E-Mail bleibt der Mailbetreff erhalten.
- [x] Listen, Messenger-Vorschau, Postausgang und Dashboard zeigen statt Betreff den Absender und den Textanfang (BBCode entfernt, gekürzt auf 200 Zeichen wie STU `conversations.twig`).
- [x] Compose (normale PM): Empfänger per Eingabe der Siedler-ID (mit Anzeige des aufgelösten Namens) oder Auswahl aus der Kontaktliste; die Namenssuche entfällt (Frontend und ggf. Such-Endpunkt, wenn sonst ungenutzt). Antwort zeigt den Korrespondenzverlauf (max. 10) wie heute.
- [x] Deep-Link `/messages?tab=compose&to=<id>` bleibt für Antworten funktionsfähig.
- [x] Backend-Tests: Migration (Betreff in Text übernommen), Versand ohne Betreff, Massenmail-PM-Format. Frontend-Tests: Compose mit Siedler-ID und Kontaktauswahl, Liste ohne Betreffspalte.
- [x] `grep -rn "subject"` im Messaging-Pfad (ohne Mail-Betreff und historische Migrationen) liefert nichts mehr.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt M4 und Entscheidungen PO zu M („Der Betreff entfällt für alle PMs (Entity, DTO, UI, Systemnachrichten)“, „Namenssuche entfällt“); [social.md](../audit-2026-11-17/social.md) Seitenabgleich „PM schreiben“, Kleine Abweichungen „Compose, Betreff“.
- PO-Entscheidung M4 vom 2026-11-17. Ersetzt die Einordnung „Betreff, Namenssuche: funktional gleichwertig“ in social.md.
- soc-AUD-01 (PM-Ordner) baut darauf auf.

## Comments

- 2026-11-24 (Claude Opus 5.5, direkt umgesetzt; Ticket-Routing: Migration/Datenintegrität → keine Delegation): umgesetzt, Prüfung ausstehend. Commit „feat(messaging): STU private messages without subject, recipient by settler id (stu-parity soc-AUD-07b)“.
  - Migration `20261124180000-drop-message-subject`: nicht leerer Betreff → `[b]…[/b]\n` vor den Text, sofern der Text ihn nicht enthält; Spalte entfällt (down legt sie leer wieder an).
  - `send`/`sendNpcTrade`/`sendSystem`/`sendSystemToMany` ohne Betreff, alle ~100 Aufrufer angepasst. Text ergänzt, wo der Betreff Information trug: Subraumellipse (Sektor-Kopfzeile), Alarmreaktion („Eigene/Fremde Schiffe auf …“), HoloNet-Kommentar (Beitragstitel), Schiffs-Broadcast („Broadcast von …“), Andocken per Traktorstrahl, Tick-Fehler. Kolonie-Ereignis-`title` (nur Betreff) entfernt.
  - Massen-PM: `[b]Betreff: …[/b]\n\n` + Text wie STU; E-Mail behält Mailbetreff.
  - Frontend: Liste/Postausgang/Messenger zeigen Absender bzw. Empfänger und `messagePreview` (BBCode entfernt, 200 Zeichen); Compose mit Siedler-ID (Name über `/database/settlers/:id`) oder Kontaktliste, Namenssuche und Betrefffeld entfernt. `/user/search` bleibt, da „Kontakt hinzufügen“ ihn nutzt.
  - Checks: `nx typecheck` backend/shared/frontend grün; `backend:test` 2757/2757; Integration (Migration, Messaging-Ordner, Admin-Broadcast, Handel, Ionensturm, Subraumellipse, Alarmreaktion, Wurmloch, Bewegung, Allianz-Lifecycle, Kolonie-Orbit u. a.) grün; vitest messages/QuickPm/tutorial-targets/admin-mass-message/message-preview grün; eslint ohne Fehler.
  - Vorbestehend, nicht durch dieses Ticket: `account-deletion.int-spec` „keeps what others see …“ (HoloNet-Kommentarautor) schlägt auch auf HEAD fehl.
  - Ausstehend: gesammelter Verifikationslauf (volle `test-integration`, Workspace-Build).

- 2026-11-24 – **resolved.** Gesammelter Verifikationslauf (Claude Opus 5.5; Sol/Luna in dieser Session nicht verfügbar) auf `f1e0c2f2`: `nx run-many -t build typecheck lint` (backend, frontend, shared) grün; Unit Backend 2764/2764, Frontend 1028/1028; PostgreSQL-Integration 1045/1089 im Gesamtlauf – die 44 Fehler (6 Suiten) waren Test-Fixtures mit alten `sendSystem`-Argumentpositionen bzw. der historische Kolonie-Ereignis-Migrationstest nach dem Betreff-Wegfall (soc-AUD-07b), behoben in `f1e0c2f2`, betroffene Suiten danach 112/112 grün. Diff-Review: alle `sendSystem`-Aufrufe mit drittem Argument geprüft – nur echte Delivery-Keys, kein verrutschter Betreff. Folgefehler in Int-Specs (Mock-Argumentpositionen, historischer Migrationstest) behoben. Der `account-deletion`-Fehler stammte aus soc-AUD-02 und ist behoben.
