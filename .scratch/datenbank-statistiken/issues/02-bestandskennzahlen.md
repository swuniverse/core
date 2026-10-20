# 02: Bestandskennzahlen (Fraktionen, Welt, Holonet)

**What to build:** Weitere Charts, die sich direkt aus dem Datenbestand ableiten: Schiffe nach Fraktion, Kolonien nach Fraktion, Spieler je Fraktion, entdeckte Systeme (kumulativ über alle **Systementdeckungen**), Allianzen (Anzahl / Ø Mitglieder), Prestige (Gesamt oder Median) und Holonet (Beiträge / Kommentare). Jede ist eine Registrierung im Kennzahlen-Register und erscheint als Chart auf der Statistikseite.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] Jede genannte Kennzahl erscheint nach einem Haupttick mit den richtigen Serien in der Lese-API (Integrationstest)
- [x] Die Statistikseite zeigt für jede einen Chart mit Legende
- [x] Schiffe und Kolonien sind nach Fraktion gestapelt (keine NPC-Serie)

## Kommentar

- Prestige: Gesamtsumme aller Spieler (Serie `total`) statt Median; als Bestandswert über Zeit direkt lesbar.
- Schiffe, Kolonien und Spieler werden über `users.factionId` je Fraktion gezählt; herrenlose Kolonien und Spieler ohne Fraktion erscheinen in keiner Serie (keine NPC-Serie).
- Allianzen: Serien `count` und `avgMembers` (2 Nachkommastellen); das Raster stapelt sie wie alle Kennzahlen.
