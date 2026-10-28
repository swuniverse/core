# Datenbank: „NPCs & Administratoren“

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** tmw-W1

## Ziel

Unter „Sonstiges“ im Datenbank-Hub kommt die Liste „NPCs & Administratoren“ hinzu, wie in STU. Sie zeigt alle NPC-Konten (aus tmw-W1, z. B. die Handels-NPCs) und alle Administratoren mit Name, Fraktion und Profillink, damit Spieler wissen, wen sie anschreiben können.

## STU-Quellen

- `src/Module/Database/View/NPCList/*`, `src/html/database/npcList.twig`

## SWU-Pfade

- `apps/backend/src/modules/auth/user.entity.ts` (`isAdmin`, `isNpc` aus tmw-W1)
- `apps/backend/src/modules/database/database.service.ts`, `database.controller.ts` (Muster `settlers`)
- `apps/frontend/src/pages/database.tsx`, `apps/frontend/src/pages/player-profile.tsx`

## Akzeptanzkriterien

- [x] `GET database/npcs` liefert zwei Listen: NPCs und Administratoren, jeweils mit ID, Name, Fraktion (falls vorhanden) und Avatar. E-Mail und andere private Daten werden nicht offengelegt.
- [x] Der Hub-Eintrag „NPCs & Administratoren“ unter „Sonstiges“ zeigt beide Listen mit Profillinks und einer Schnell-PM-Aktion, sofern es eine gibt.
- [x] Die Siedlerliste enthält keine NPCs (Regel aus tmw-W1, hier per Test abgesichert).
- [x] Backend-Test: Trennung NPC/Admin, keine privaten Felder. Frontend-Test: beide Abschnitte rendern.

## Comments

- `GET /database/npcs` liefert getrennte, datensparsame NPC- und Administratorlisten. Der Datenbank-Hub zeigt beide Abschnitte mit Avatar, Fraktion, Profil und Schnell-PM; die bestehende NPC-Ausfilterung der Siedlerliste ist getestet. Keine offenen Folgepunkte.
