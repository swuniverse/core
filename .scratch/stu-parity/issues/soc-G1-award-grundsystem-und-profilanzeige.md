# Awards: Grundsystem, SWU-Katalog und Profilanzeige

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

SWU erhält Awards wie STU: einen Katalog (ID, Beschreibung, Bild, Prestige, NPC-Flag), die Vergabe an Spieler mit Zähler und einen idempotenten Vergabedienst, den die Fachbereiche aufrufen (Forschung col-D2c, vollständige Datenbankkategorie tmw-D5, Kartenzyklus soc-G2b, Lotterie soc-G2c, Admin soc-G1b). Das Profil zeigt die Awards mit Bild, Beschreibung als Tooltip und Anzahl.

Vorgabe gemäß Leitplanke 2 und 3: Awards sind im Scope. Die STU-Awards sind Star-Trek-spezifisch (Föderation, Romulaner, Kazon …); der umsetzende Agent wählt einen kanonnahen Star-Wars-Katalog und hält ihn unter „Entscheidungen“ in `map.md` fest. Grafiken: vorhandene Assets oder klar markierte Platzhalter (z. B. generisches Medaillen-Icon unter `/assets/awards/placeholder.png` bzw. CSS-Badge); keine STU-Grafiken kopieren. Piraten-Awards entfallen (Piraten out of scope).

## STU-Quellen

- `src/Module/Award/Lib/CreateUserAward.php` (idempotent; `incrementExisting`; Prestige-Log „%d Prestige erhalten für den Erhalt des Awards "%s"“)
- `src/Component/Player/UserAwardEnum.php` (Spieler-, NPC- und Community-Awards)
- `src/Orm/Entity/Award.php` (id, prestige, description, isNpc, user_id), `src/Orm/Entity/UserAward.php` (count)
- `src/html/view/userprofile.twig:140-160` (Bild `assets/awards/<id>.png` bzw. `/npcawards/<id>.png`, `title` = Beschreibung, Zähler ab 2)

## SWU-Pfade

- neues Modul `apps/backend/src/modules/awards/` (Entities `Award`, `UserAward`, `AwardService.grant(userId, awardKey, { incrementExisting })`)
- `apps/backend/src/modules/prestige/prestige.service.ts#change`
- Katalog als Seed/Konstante (stabile String-Keys, z. B. `RESEARCH_*`, `DATABASE_*`, `LAYER_EXPLORED`, `LOTTERY_WINNER`, `RPG_*`, `FACTION_*_POS/NEG`)
- `apps/backend/src/modules/database/database.service.ts` (`GET database/settlers/:id` um Awards erweitern)
- `apps/frontend/src/pages/player-profile.tsx`
- DTOs in `packages/shared`, Migration nach `docs/typeorm-migrations.md`
- `.scratch/stu-parity/map.md` (Entscheidungen)

## Akzeptanzkriterien

- [ ] Tabellen `awards` (stabiler Key, Beschreibung, Bildpfad, Prestige ≥ 0, `isNpc`) und `user_awards` (Spieler, Award, Anzahl ≥ 1, erstes Vergabedatum), eindeutig je Spieler/Award, `ON DELETE CASCADE` mit dem Konto.
- [ ] Katalog mit mindestens: Forschungsmeilensteine, vollständige Datenbankkategorie, Ebene vollständig erkundet, Lotteriegewinn, zwei RPG-/Community-Awards, je Fraktion bzw. SW-NPC-Macht ein positiver und negativer NPC-Award; per Migration/Seed idempotent eingespielt.
- [ ] `AwardService.grant` ist idempotent: Erstvergabe legt an (Anzahl 1) und bucht das Award-Prestige über `PrestigeService` mit STU-Text; erneute Vergabe ohne `incrementExisting` ändert nichts; mit `incrementExisting` erhöht die Anzahl und bucht erneut Prestige. Nebenläufige Doppelvergabe erzeugt keine Duplikate.
- [ ] Der Spieler erhält bei Erstvergabe eine Systemnachricht „Du hast den Award X erhalten“.
- [ ] Die Profil-API liefert Awards (Key, Beschreibung, Bild, Anzahl); das Profil zeigt eine Box „Awards“ mit Bild, `title`/`aria-label` = Beschreibung, Zähler ab 2, „Keine“ wenn leer.
- [ ] Der gewählte SWU-Katalog steht unter „Entscheidungen“ in `map.md`.
- [ ] Backend-Tests: Erstvergabe, Idempotenz, Inkrement, Prestige-Buchung, Konkurrenz (Unique-Constraint). Frontend-Tests: Profilbox mit/ohne Awards, Zähler.

## Comments
