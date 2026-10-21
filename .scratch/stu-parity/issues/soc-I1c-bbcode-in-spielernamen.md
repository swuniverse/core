# BBCode-Farben in Spielernamen

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** soc-I1a

## Ziel

STU erlaubt BBCode (vor allem `[color]`) im Spielernamen und rendert ihn überall mit `|bbcode`. SWU speichert `displayName` als reinen Text (3–60 Zeichen); für Allianznamen ist BBCode laut `.scratch/alliance-stu-parity/map.md` bewusst ausgeschlossen. Für Spielernamen gibt es keine Entscheidung.

## STU-Quellen

- `src/Module/PlayerSetting/Action/ChangeUserName`
- Twig-Filter `|bbcode` an Spielernamen (z. B. `src/html/view/userprofile.twig`)

## SWU-Pfade

- `apps/backend/src/modules/settings/settings.service.ts` (`displayName`)
- alle Namensanzeigen im Frontend (Header, Profil, HoloNet, Forum, Nachrichten, Datenbank)
- `apps/frontend/src/components/BbCodeText.tsx`

## Akzeptanzkriterien

- [ ] Nur `[color]`, `[b]`, `[i]` im Namen erlaubt (andere Tags werden abgelehnt); Länge zählt den sichtbaren Text (3–60); Eindeutigkeit, Suche und Sortierung nutzen den Klartext.
- [ ] Zentrale `PlayerName`-Komponente für alle Anzeigen (Header, Profil, HoloNet, Forum, Nachrichten, Datenbank, Karte); Stellen ohne Formatierung (z. B. Seitentitel, Mails) zeigen den Klartext.
- [ ] Backend- und Frontend-Tests.

## Entscheidung

Vorgabe: Variante (a). Nur `[color]`, `[b]`, `[i]` im Spielernamen; Allianznamen bleiben ohne BBCode.

## Comments

- 2026-10-21 Product Owner: Option a – Spielernamen dürfen wie in STU BBCode tragen, eingeschränkt auf `[color]`, `[b]` und `[i]`.
