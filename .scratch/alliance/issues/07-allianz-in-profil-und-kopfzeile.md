# 07: Allianz in Spielerprofil und Kopfzeile

**What to build:** Die Zugehörigkeit zu einer **Allianz** ist im Spiel sichtbar. Im Profil anderer Spieler und in der eigenen Kopfzeile stehen Allianzname und Farbe, mit Link zur Detailseite der Allianz. Spezifikation: `.scratch/alliance/spec.md`, User Stories 54–55.

**Blocked by:** 02 (Allianz gründen, Liste und Detailseite)

**Status:** resolved

- [x] Das Header-Status-DTO enthält eine optionale Allianz-Referenz (id, Name, Farbe).
- [x] Das Spielerprofil-DTO enthält dieselbe optionale Allianz-Referenz.
- [x] Die Kopfzeile zeigt bei Mitgliedern den Allianznamen in Allianzfarbe mit Link zur Detailseite. Bei allianzlosen Spielern zeigt sie nichts.
- [x] Das Spielerprofil zeigt die Allianz des Spielers mit Link oder nichts.
- [x] Die bestehenden Header- und Profil-Tests sind erweitert und decken beide Fälle ab (mit und ohne Allianz).

## Comments

Implemented in commit 13590f6 (feat(alliance): add alliances).
