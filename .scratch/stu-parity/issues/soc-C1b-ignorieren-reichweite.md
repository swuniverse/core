# Ignorieren: Reichweite über PMs hinaus

**Status:** wontfix
**Priority:** P3
**Size:** S
**Blocked by:** soc-C1a

## Ziel

STU sperrt beim Ignorieren ausschließlich persönliche Nachrichten. Dieses Issue entscheidet und setzt um, ob Ignorieren in SWU zusätzlich HoloNet-Kommentarbenachrichtigungen, Kontakt-Benachrichtigungen oder Forenbeiträge ausblendet.

## STU-Quellen

- `src/Module/Message/Action/WritePm/WritePm.php` (einziger fachlicher Verbraucher der Ignorierliste)
- `src/Module/Communication/Action/PostKnComment/PostKnComment.php` (Benachrichtigungen ohne Ignorier-Prüfung)

## SWU-Pfade

- `apps/backend/src/modules/holonet/holonet.service.ts#addComment`
- `apps/backend/src/modules/alliance/*` (Forum)
- Kontakt-Benachrichtigungen aus soc-B1a

## Akzeptanzkriterien

- Keine Umsetzung. Das Issue ist `wontfix` mit Verweis auf STU-Parität (Ignorieren = nur PMs, soc-C1a).

## Entscheidung

Vorgabe: Variante (a), STU-Parität. Ignorieren wirkt nur auf persönliche Nachrichten (umgesetzt in soc-C1a). Keine Ausweitung auf Benachrichtigungen oder Inhalte.

Begründung `wontfix`: Kein Umsetzungsbedarf über soc-C1a hinaus; das Verhalten entspricht STU.

## Comments

- 2026-10-21 Product Owner: Option a – Ignorieren sperrt wie in STU nur persönliche Nachrichten; das ist mit soc-C1a bereits erledigt, eine Erweiterung auf weitere Kanäle ist nicht gewünscht.
