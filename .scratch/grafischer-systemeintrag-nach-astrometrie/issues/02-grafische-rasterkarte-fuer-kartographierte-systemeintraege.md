# 02: Grafische Rasterkarte für kartographierte Systemeinträge

**What to build:** Der Systemeintrag zeigt nach erfolgreich finalisierter Astrometrie das vollständige Koordinatenraster mit bestehenden Weltraum-, Stern-, Planeten- und Asteroidenassets. Das Raster ist bei kleinen Bildschirmen in beide Richtungen scrollbar und enthält keine taktischen Aktionen oder dynamischen Daten.

**Blocked by:** 01 – Geschützte Kartenfreigabe für den Systemeintrag.

**Status:** ready-for-agent

- [x] Ein erfolgreich kartographierter Systemeintrag zeigt alle Felder innerhalb seiner tatsächlichen Rastergrenzen einschließlich beider Koordinatenachsen.
- [ ] Sterne, Planeten, Feldtypen und Asteroidenfelder verwenden die bestehenden Spielassets; ein Asteroidenfeld erscheint als visuelle Asteroidengruppe ohne Mengenbadge.
- [x] Das Raster behält lesbare Zellgrößen bei und lässt sich auf kleinen Bildschirmen horizontal und vertikal scrollen.
- [x] Die Kartenansicht ist rein lesend und zeigt weder Schiffe noch Kolonien, Besitz, Kolonie-Scans oder andere dynamische Informationen bzw. Aktionsmöglichkeiten.
- [ ] Die sichtbare Kartenstruktur und der Verzicht auf taktische Bedienelemente sind aus Sicht der Datenbankseite getestet.

## Comments

Audit 2026-10-22: Kriterien 1, 3 und 4 sind erfüllt (`database.service.ts`, `SystemRasterMap.tsx`; Commits `d118865`, `b496498`, `7733cae`). Offen bleibt Kriterium 2, weil Asteroidenfelder als `☄️`-Emoji statt mit bestehendem Spielasset bzw. visueller Asteroidengruppe dargestellt werden. Kriterium 5 bleibt offen, weil `database.spec.tsx` nicht vollständige Achsen-/Zellabdeckung, Zwei-Achsen-Scrollstruktur, feste Zellgrößen, Assetdarstellung, Asteroidengruppe ohne Badge und den umfassenden Ausschluss dynamischer Inhalte prüft. Restarbeit: `tmw-D0a` und `tmw-D0b`.
