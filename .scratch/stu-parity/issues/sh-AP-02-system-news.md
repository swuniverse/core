# System-News auf Startseite und Login

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Admins veröffentlichen System-News (Titel, Text, Links, optional als Changelog markiert). Die fünf neuesten erscheinen ohne Login auf der Landing- bzw. Login-Seite, wie in STU auf `index.php`.

## STU-Quellen

- `src/Module/Admin/Action/PostNews.php` (Felder `subject`, `text`, `refs`, `is_changelog`)
- `src/Orm/Entity/News.php`
- `src/Component/Index/News/NewsFactory.php`, `NewsItem.php`
- `src/Module/Index/View/Overview`, `src/html/index/index.twig` (`SYSTEM_NEWS`)
- `src/html/admin/scripts.twig` (Formular)

## SWU-Pfade

- `apps/backend/src/modules/holonet/*` (Kategorie `NEWS` in `entities/holonet-post.entity.ts`, heute von jedem Spieler nutzbar und Standardkategorie)
- ggf. neues Modul `apps/backend/src/modules/news/*`
- `apps/frontend/src/pages/login.tsx` (Landing), `apps/frontend/src/pages/admin.tsx`
- `packages/shared/src/lib/common/index.ts` (DTO)

## Akzeptanzkriterien

- [ ] Entität `news` (Titel, Text, Links, `isChangelog`, Erstellzeitpunkt, Autor) per Migration, eigenes Modul `apps/backend/src/modules/news/*`; keine Kopplung an das HoloNet.
- [ ] Admin-Formular „News erstellen“ (Titel, Text mit BBCode, Links zeilenweise, Changelog-Häkchen); nur Admins (403 sonst).
- [ ] Öffentlicher Endpunkt ohne Login liefert die 5 neuesten News (Titel, Datum, gerenderter Text, Links); keine Spielerdaten.
- [ ] Landing/Login zeigt eine News-Box im SWU-Boxstil (Abschnitt 3.3 der UI-Konventionen) mit Datum über `formatDate`.
- [ ] Backend-Tests: Admin-Pflicht, Limit 5, Sortierung, öffentlicher Zugriff ohne Token. Frontend-Test: Box rendert News und leeren Zustand.

## Entscheidung

Vorgabe: Variante (a). Eigene Entität `news` (Titel, Text, Links, Changelog-Flag, Datum), nur von Admins angelegt, unabhängig vom HoloNet; die HoloNet-Kategorie `NEWS` bleibt unverändert.

## Comments

- 2026-10-21 Product Owner: Option a – System-News werden als eigene Entität `news` wie in STU geführt, nur von Admins im Admin-Bereich angelegt und unabhängig vom HoloNet.
