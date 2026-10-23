# RPG: Spielercharaktere im Profil

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Spieler legen im eigenen Profil Rollenspiel-Charaktere mit Name, BBCode-Beschreibung und optionalem Avatar an, bearbeiten und löschen sie. Fremde Profile zeigen die Charaktere an. Charaktere sind laut Leitplanke 3 im Scope.

## STU-Quellen

- `src/Module/PlayerProfile/Action/CreateCharacter/CreateCharacter.php` (Avatar nur PNG, ≤ 1 MB)
- `src/Module/PlayerProfile/Action/ChangeCharacter`, `DeleteCharacter`
- `src/Orm/Entity/UserCharacter.php`
- `src/html/view/userprofile.twig` (`charactersContainer`)

## SWU-Pfade

- neues Modul `apps/backend/src/modules/rpg/` (Entity `UserCharacter`, Service, Controller) — Platz für Plots aus soc-E3a
- Avatar-Muster wie `apps/backend/src/modules/settings/settings.service.ts` (`PATCH user/avatar`: Data-URL, Größenlimit) bzw. Asset-Schnittstelle des Allianzbanners
- `apps/frontend/src/pages/player-profile.tsx`, `apps/frontend/src/components/PlayerAvatar.tsx`, `BbCodeText.tsx`
- DTOs in `packages/shared`, Migration nach `docs/typeorm-migrations.md`

## Akzeptanzkriterien

- [ ] Entity `user_characters` (Besitzer, Name 1–60 Zeichen, Beschreibung ≤ 5.000 Zeichen BBCode, Avatar optional als Bild-Data-URL ≤ ~250 KB oder Asset-Referenz, Datum), `ON DELETE CASCADE` mit dem Konto.
- [ ] Endpunkte: Liste der Charaktere eines Spielers (öffentlich für eingeloggte Spieler); anlegen, ändern, löschen nur für den Besitzer (403 sonst). Optionales Limit (z. B. 20 je Spieler) mit Meldung.
- [ ] Avatar wird serverseitig auf Bildtyp (png/jpeg/webp) und Größe geprüft; ohne Avatar Platzhalter.
- [ ] Profil: Box „Charaktere“ mit Avatar, Name und gerenderter Beschreibung; im eigenen Profil Anlegen/Bearbeiten/Löschen (mit Bestätigung).
- [ ] Backend-Tests: CRUD, Rechte, Validierung (Name, Länge, Bildtyp/Größe). Frontend-Tests: Anzeige fremd/eigen, Formular.

## Comments
