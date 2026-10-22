# 07: Ergänze Kolonie-Scanwissen in Fremdprofilen

**What to build:** Auf einem Fremdprofil findet ein Spieler die neuesten für ihn zugänglichen Kolonie-Scans zu den Kolonien des profilierten Spielers. Die Darstellung hat dieselbe Informationsqualität wie der Systemeintrag, bleibt aber eine berechtigte Wissensansicht und erscheint nicht auf dem eigenen Profil.

**Blocked by:** 06: Integriere neueste zugängliche Kolonie-Scans in Systemeinträge.

**Status:** resolved

- [x] Ein Fremdprofil liefert und zeigt die neuesten zugänglichen Scans zu aktuellen oder historischen Kolonien des Profilspielers gemäß der gemeinsamen Scanberechtigung.
- [x] Das eigene Profil enthält keine Profil-Scanliste.
- [x] Jede Scanzeile zeigt Scanner, Zeit, erlaubten System-/Koordinatenkontext, Snapshot-/Besitzwarnungen und einen nicht-taktischen Oberflächendialog.
- [x] Ein Systemlink oder Koordinatendetail wird nur angeboten, wenn der Betrachter die zugehörige persönliche Systementdeckung besitzt.
- [x] Die Profilansicht gibt weder nicht berechtigte Scanflächen noch nicht entdeckte Systeminformationen preis.
- [x] Eine Löschaktion ist ausschließlich für den eigenen Scan verfügbar und nutzt denselben serverseitigen Eigentumsschutz wie der Systemeintrag.
- [x] Backend- und Frontendtests prüfen Viewer-spezifische Projektion, Abgrenzung des Eigenprofils, Entdeckungsgrenzen, Allianzfreigabe und Löschrechte.

## Comments

Audit: Alle Akzeptanzkriterien sind erfüllt. Umsetzung: `database.service.ts`, `colony-scan-projection.service.ts`, `spacecraft-scan.service.ts`, `player-profile.tsx`, `ColonyScans.tsx`; Tests: `database-settler-scans.service.spec.ts`, `colony-scan-projection.service.spec.ts`, `spacecraft-scan.service.spec.ts`, `player-profile-scans.spec.tsx`; maßgebliche Commits: `dac1cbf`, `a962b8c`, `d118865`.
