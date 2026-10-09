# 01: Allianz-Ratenbegrenzung verallgemeinern

**What to build:** Prefactoring: Die dauerhafte, instanzübergreifende Ratenbegrenzung der Diplomatie wird zu einer allgemeinen Allianz-Ratenbegrenzung, die weitere Befehle aufnehmen kann. Für Spieler ändert sich nichts; Diplomatiebefehle werden exakt wie bisher begrenzt. Damit kann das Forum dieselbe Begrenzung ohne eigene Infrastruktur verwenden.

**Blocked by:** None (can start immediately)

**Status:** resolved

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/interne-zusammenarbeit-issues/01-allianz-ratenbegrenzung-verallgemeinern.md`)
**Spec:** `.scratch/alliance-stu-parity/interne-zusammenarbeit-spec.md`

- [ ] Die Ratenbegrenzung akzeptiert Befehle aus einer erweiterbaren Befehlsmenge; die bisherigen Diplomatiebefehle behalten Fenster, Grenzwert und deutsche Fehlermeldung.
- [ ] Grenzwerte und Fenster sind je Befehlsgruppe konfigurierbare Konstanten; die Fehlermeldung nennt keine internen Werte.
- [ ] Die vorhandene Ratenbegrenzungstabelle wird weiterverwendet; eine Migration entsteht nur, falls die Befehlsspalte für künftige Befehlsnamen zu kurz ist (dann rückwärtskompatibel mit Migrationstest).
- [ ] Alle bestehenden Tests der Diplomatie-Ratenbegrenzung und der Diplomatieaktionen bleiben unverändert grün.
- [ ] Ein Verhaltenstest belegt, dass zwei verschiedene Befehle getrennte Budgets haben.

## Answer

Merged on integration/interne-zusammenarbeit (6caded3). Rate limiter generalized to `AllianceRateLimiterService` with per-group policies in `ALLIANCE_RATE_LIMIT_COMMANDS`; command names must be <=16 chars (varchar(16)); no migration.
