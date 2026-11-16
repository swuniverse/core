# BBCode-Farben in Spielernamen

**Status:** resolved
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

- [x] Nur `[color]`, `[b]`, `[i]` im Namen erlaubt (andere Tags werden abgelehnt); Länge zählt den sichtbaren Text (3–60); Eindeutigkeit, Suche und Sortierung nutzen den Klartext.
- [x] Zentrale `PlayerName`-Komponente für alle Anzeigen (Header, Profil, HoloNet, Forum, Nachrichten, Datenbank, Karte); Stellen ohne Formatierung (z. B. Seitentitel, Mails) zeigen den Klartext.
- [x] Backend- und Frontend-Tests.

## Entscheidung

Vorgabe: Variante (a). Nur `[color]`, `[b]`, `[i]` im Spielernamen; Allianznamen bleiben ohne BBCode.

## Comments

- 2026-10-21 Product Owner: Option a – Spielernamen dürfen wie in STU BBCode tragen, eingeschränkt auf `[color]`, `[b]` und `[i]`.

## Answer

Ein gemeinsamer strikter Parser erlaubt nur Farbe, Fett und Kursiv. Sichtbarer Name und Markup liegen getrennt in `users`; sichtbare Länge, Namensprüfung und Datenbankindex verwenden Klartext. Die Suche berücksichtigt Klartext-Anzeigenamen und sortiert ohne Markup. Die zentrale PlayerName-Komponente nutzt ein öffentliches Namensverzeichnis und ist in Header, Profil, Nachrichten/Kontakten, HoloNet, Forum/Allianzübersichten, Datenbank, Handel und Kartenkontakten eingebunden. Textuelle Titel, Mails, Login-Felder, Avatarinitialen und native Optionen bleiben Klartext. Allianznamen bleiben unformatiert.

## Validation

Alle lint/typecheck/test- und Build-Gates grün: Backend 240 Suites / 2332 Tests, Frontend 125 Dateien / 853 Tests. PostgreSQL prüft Persistenz und formatierungs-/großschreibungsunabhängige Eindeutigkeit; Migration lokal angewendet. Parser-/Frontendtests prüfen sichtbare Länge, Tag-Allowlist, Verschachtelung und HTML-Escaping.

- 2026-11-16: Vollständig umgesetzt und geprüft.
