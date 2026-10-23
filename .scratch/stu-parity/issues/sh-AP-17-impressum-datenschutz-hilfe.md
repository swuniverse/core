# Impressum, Datenschutz und Hilfe

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

SWU bekommt öffentliche Seiten Impressum, Datenschutzerklärung und Hilfe mit Footer-Links auf Landing, Login und Registrierung sowie im Spiel (z. B. Einstellungen). Vorgabe gemäß Leitplanke 4: Die Seiten werden vollständig gebaut, die Rechtstexte enthalten klar markierte Platzhalter für die Betreiberangaben. Die Links sind hinter `VITE_LEGAL_PAGES_ENABLED` (Default `false`) verborgen, die Routen selbst sind immer erreichbar.

## STU-Quellen

- `src/Module/Index/View/ShowImprint`, `src/html/index/impressum.twig`
- `src/Module/Index/View/ShowHelp`, `src/html/index/help.twig`
- `src/Module/Index/View/ShowPartnerSites`, `src/html/index/partnerSites.twig` (nicht übernehmen)

## SWU-Pfade

- neue Seiten `apps/frontend/src/pages/imprint.tsx`, `privacy.tsx`, `help.tsx`; Routen in `apps/frontend/src/app/app.tsx` (öffentlich, ohne Login-Pflicht)
- `apps/frontend/src/components/auth/AuthLayout.tsx`, `apps/frontend/src/pages/login.tsx` (Landing-Footer)
- `apps/frontend/src/pages/settings.tsx`
- `apps/frontend/.env.example` bzw. Root-`.env.example`

## Akzeptanzkriterien

- [ ] `/impressum`: Gerüst nach § 5 DDG (Anbieter, Anschrift, Kontakt, Verantwortlicher nach § 18 Abs. 2 MStV) mit Platzhaltern der Form `[[BETREIBER: Name]]`, deutlich als Platzhalter hervorgehoben; Hinweis auf Star Wars als Marke von Lucasfilm und Fan-Projekt ohne kommerzielle Absicht.
- [ ] `/datenschutz`: Gerüst mit Abschnitten zu Verantwortlichem, verarbeiteten Daten (Konto, E-Mail, Spielstand, letzte Aktivität, Server-Logs), Zwecken, Rechtsgrundlagen, Speicherdauer (Verweis auf Inaktivitätslöschung), E-Mail-Versand, Rechten der Betroffenen; Platzhalter wie oben, keine erfundenen Betreiberangaben.
- [ ] `/hilfe`: Kurzanleitung (Registrierung, Heimatwelt, Kolonie, Forschung, Schiffe, HoloNet, Allianzen), Links auf Wiki und Discord; Inhalte darf der Agent schreiben (Domänenbegriffe gemäß `CONTEXT.md`).
- [ ] Footer-Links auf Landing/Login/Registrierung und ein Abschnitt in den Einstellungen nur bei aktivem Flag.
- [ ] Frontend-Tests: Routen ohne Login erreichbar, Links nur bei Flag, Platzhalter sichtbar markiert.

## Comments
