# Schnell-PM aus Profil, HoloNet und Allianzforum

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Überall, wo STU ein `pmWindow` anbietet, kann der Spieler direkt eine Nachricht an den angezeigten Siedler schreiben. Heute fehlt der PM-Button im Profil, der HoloNet-Button öffnet `/messages` ohne Empfänger und der Profil-Button im HoloNet ist deaktiviert. Crew-Erfahrung für Quick-PM entfällt (SWU hat keine Crew-XP).

## STU-Quellen

- `src/Module/Message/View/ShowWriteQuickPm/*`, `ShowWriteQuickPmResponse/*`
- `src/html/communication/writeQuickPm.twig`, `writeQuickPmResponse.twig`
- `src/html/macros.twig` (`pmWindow`)
- `src/Component/Communication/Kn/KnItem.php#displayContactLinks`, `src/html/communication/kn.twig`
- `src/html/view/userprofile.twig:6-36`, `src/html/alliance/allianceboardtopic.twig:61`

## SWU-Pfade

- `apps/frontend/src/pages/player-profile.tsx`
- `apps/frontend/src/pages/holonet.tsx` (Autorbox um Zeile 510–535)
- `apps/frontend/src/pages/alliance-forum.tsx`
- Deep-Link-Muster `/messages?tab=compose&to=<id>&name=<name>` aus `apps/frontend/src/pages/alliance-member-overview.tsx`
- optional gemeinsame Komponente `apps/frontend/src/components/PmLink.tsx`

## Akzeptanzkriterien

- [ ] Eine wiederverwendbare Komponente erzeugt den Compose-Deep-Link mit vorbelegtem Empfänger; sie wird für fremde Spieler gerendert, nicht für den eigenen Account.
- [ ] Spielerprofil: Button „Nachricht schreiben“ öffnet Compose mit vorbelegtem Empfänger.
- [ ] HoloNet-Beitrag: der Nachrichten-Button belegt den Autor vor; der Profil-Button ist aktiv und führt zu `/players/:authorId`.
- [ ] Allianzforum: an jedem Beitrag ein PM-Link zum Autor.
- [ ] Icons nach Asset-Konvention (`/assets/buttons/msg1.png`/`msg2.png` o. ä. mit Hover-Tausch oder Textbutton), kein Emoji/Unicode-Glyph (`inventory/shell-admin-runtime.md` 3.6), mit `title` und `aria-label`.
- [ ] Frontend-Tests: Profil, HoloNet und Forum rendern den Link mit korrekter `to`-ID; eigener Account zeigt keinen Link.

## Comments
