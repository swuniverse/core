# NPC-Spielerkonten (Umfang: Handel)

**Status:** ready-for-agent
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

SWU erhält NPC-Spielerkonten, aber nur im Umfang, den der Handel braucht (Leitplanke 3). Gebraucht werden Eigentümer der NPC-Handelsposten, der Händler für Deals, Auktionen und Lotterie sowie Absender von Handelsnachrichten. NPCs können sich nicht einloggen. Aus Ranglisten, Statistiken, Siedlerliste, Online-Liste und Entdeckungsprestige sind sie ausgeschlossen. Piraten- und Quest-NPCs entfallen (out of scope).

**Vorgabe nach Leitplanke 2:** Das Star-Wars-Pendant der Ferengi bzw. des Großen Nagus ist das **Hutten-Kartell**: neutraler Händler für Deals, Auktionen und Lotterie, Handelsposten „Hutten-Handelsposten“ (STU: „Zur Goldenen Kugel“). Die fraktionseigenen Basishandels-Netze betreiben je ein NPC „Imperiales Versorgungsamt“ (Galaktisches Imperium) und „Nachschubkommando der Rebellenallianz“ (Rebellenallianz). Der Agent trägt das in `map.md` unter „Entscheidungen“ ein.

## STU-Quellen

- `src/Orm/Entity/User.php` (`isNpc`), `src/Component/Player/UserConstants.php` (`USER_FIRST_ID`, NPC-Bereich unter 100)
- `src/Module/Database/Lib/CreateDatabaseEntry.php` (Prestige nur für Nicht-NPC)
- Ausschlüsse: `src/Orm/Repository/UserRepository.php#getNonNpcList`, Ranglisten-Queries mit `user_id >= :firstUserId`
- `src/Module/Trade/Action/BasicTradeBuy/*`, `DealsTakeOffer/*`, `BuyLotteryTickets/*` („NPCs können … nicht“)

## SWU-Pfade

- `apps/backend/src/modules/auth/user.entity.ts`, `auth.service.ts` (Login), `jwt.strategy.ts`, `admin-bootstrap.service.ts`
- `apps/backend/src/modules/database/database.service.ts` (Siedlerliste, Ranglisten, Online-Liste)
- `apps/backend/src/modules/statistics/statistic-metrics.ts` (Spielerzählungen über `users`)
- `apps/backend/src/modules/prestige/prestige.service.ts`, Entdeckungsdienste (`ship-class-discovery.service.ts`, `celestial-class-discovery.service.ts`, `system-type-discovery.service.ts`)
- `apps/backend/src/modules/messaging/messaging.service.ts` (`send`, `sendSystem`), `message-folder.ts` (`TRADE`)
- `apps/frontend/src/pages/admin-users.tsx`
- Migrationen nach `docs/typeorm-migrations.md`

## Akzeptanzkriterien

- [ ] `users.isNpc` (bool, Standard false) per Migration. Ein idempotenter Seed legt die drei Handels-NPCs an (Name, Fraktion: Imperium bzw. Rebellenallianz bzw. keine für das Hutten-Kartell, Profilbeschreibung) und stellt sie über einen stabilen Schlüssel bereit (`NpcKey.HUTT_CARTEL`, `NpcKey.EMPIRE_SUPPLY`, `NpcKey.REBEL_SUPPLY`), nicht über feste IDs.
- [ ] NPC-Konten können sich nicht einloggen: kein nutzbares Passwort, und Login bzw. JWT-Validierung lehnen `isNpc` ab. Sie durchlaufen kein Onboarding.
- [ ] NPCs fehlen in Siedlerliste, Online-Liste, allen `database/rankings/*`, Statistik-Spielerzählungen und Fraktionszählungen, und sie erhalten kein Entdeckungs- oder Holonet-Prestige. Ein zentraler Helfer (z. B. `nonNpcUsers()`-Query-Builder bzw. Filterkonstante) wird an allen Stellen verwendet.
- [ ] Ein Dienst `NpcAccountService.get(key)` liefert das NPC-Konto. `messaging.service` kann im Namen eines NPC eine Nachricht in den Ordner `TRADE` senden.
- [ ] Die Admin-Benutzerliste zeigt NPCs gekennzeichnet. Admins können Name und Beschreibung bearbeiten.
- [ ] Backend-Tests: Seed ist idempotent, Login abgelehnt, Ausschluss in Siedlerliste, Ranglisten und Statistik, kein Prestige, NPC-Nachricht im Ordner Handel. Frontend-Test: Kennzeichnung in `admin-users`.

## Comments
