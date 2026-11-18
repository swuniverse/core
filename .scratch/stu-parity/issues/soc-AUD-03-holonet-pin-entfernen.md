# HoloNet-Pin entfernen

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

STU kennt im KN kein Anheften von Beiträgen (Sticky gibt es nur im Allianzforum). SWU hat eine Spalte `isPinned` mit Admin-Endpunkt, die im Frontend nicht einmal angezeigt wird. Der Product Owner hat entschieden, nur den Pin zu entfernen; die HoloNet-Kategorien bleiben als bewusste SWU-Erweiterung.

## STU-Quellen

- `src/Orm/Entity/KnPost.php` (kein Pin-Feld)
- `src/Module/Alliance/Action/SetTopicSticky/SetTopicSticky.php` (Sticky nur im Allianzforum, zur Abgrenzung)

## SWU-Pfade

- `apps/backend/src/modules/holonet/entities/holonet-post.entity.ts` (`isPinned`)
- `apps/backend/src/modules/holonet/holonet.service.ts` (Toggle Z. ~429, Sortierung/Ausgabe)
- `apps/backend/src/modules/holonet/holonet.controller.ts` (`@Patch(':id/pin')` Z. ~158)
- `apps/backend/src/database/migrations/` (neue Migration: Spalte entfernen)
- ggf. Shared-DTOs und Tests, die `isPinned` erwähnen

## Akzeptanzkriterien

- [ ] Spalte `isPinned` per Migration entfernt (Down-Migration stellt sie mit Default `false` wieder her).
- [ ] Endpunkt `PATCH holonet/:id/pin` und die Service-Methode entfallen; keine Sortierung oder DTO-Ausgabe mehr nach Pin.
- [ ] Kategorien (NEWS, ROLEPLAY, TRADE, RECRUITMENT) bleiben unverändert funktionsfähig.
- [ ] `grep isPinned` über `apps/` und `packages/` (ohne historische Migrationen) liefert nichts mehr.
- [ ] Backend-Tests angepasst; Test, dass der Pin-Endpunkt 404 liefert; Lint/Typecheck/Build grün.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt M2 und N2 (Zeile „HoloNet-Pin“); [social.md](../audit-2026-11-17/social.md) „Bewusste/entschiedene Abweichungen“ (HoloNet-Kategorien und Admin-Pin).
- PO-Entscheidung M2 vom 2026-11-17: nur den Pin entfernen, Kategorien bleiben.
- Ersetzt den Teil „Admin-Pin bleibt als bewusste Erweiterung“ aus `soc-D1-holonet-regeln-an-stu-angleichen.md` (Ziel).

## Comments
