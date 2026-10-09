# 05: Banner auf Allianzseite, in der Verwaltung und im Platzhalter

**What to build:** Die Allianzseite zeigt das Banner als festen Kopfbereich und ersetzt `$ALLIANCE_BANNER` in der Beschreibung sicher durch ein Bild (kein rohes HTML). Verwalter können hochladen, ersetzen und entfernen, gesteuert nur über die servergelieferte Fähigkeit. Ohne Banner verschwinden Kopfbereich und Platzhalter vollständig; unbekannte Platzhalter bleiben wirkungslos. Die Chronikansicht zeigt Banner-Ereignisse lesbar.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] Serverseitiger Platzhalterersatz: mit Banner Bildverweis, ohne Banner leerer Text
- [ ] Frontendtests (gemockte API): Kopfbereich, Platzhalter, fehlendes Banner, Fähigkeitssteuerung, Fehlermeldungen
- [ ] Chroniktexte für „Banner gesetzt/ersetzt“ und „Banner entfernt“
