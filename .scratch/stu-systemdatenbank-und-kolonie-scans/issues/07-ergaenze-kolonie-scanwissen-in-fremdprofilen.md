# 07: Ergänze Kolonie-Scanwissen in Fremdprofilen

**What to build:** Auf einem Fremdprofil findet ein Spieler die neuesten für ihn zugänglichen Kolonie-Scans zu den Kolonien des profilierten Spielers. Die Darstellung hat dieselbe Informationsqualität wie der Systemeintrag, bleibt aber eine berechtigte Wissensansicht und erscheint nicht auf dem eigenen Profil.

**Blocked by:** 06: Integriere neueste zugängliche Kolonie-Scans in Systemeinträge.

**Status:** ready-for-agent

- [ ] Ein Fremdprofil liefert und zeigt die neuesten zugänglichen Scans zu aktuellen oder historischen Kolonien des Profilspielers gemäß der gemeinsamen Scanberechtigung.
- [ ] Das eigene Profil enthält keine Profil-Scanliste.
- [ ] Jede Scanzeile zeigt Scanner, Zeit, erlaubten System-/Koordinatenkontext, Snapshot-/Besitzwarnungen und einen nicht-taktischen Oberflächendialog.
- [ ] Ein Systemlink oder Koordinatendetail wird nur angeboten, wenn der Betrachter die zugehörige persönliche Systementdeckung besitzt.
- [ ] Die Profilansicht gibt weder nicht berechtigte Scanflächen noch nicht entdeckte Systeminformationen preis.
- [ ] Eine Löschaktion ist ausschließlich für den eigenen Scan verfügbar und nutzt denselben serverseitigen Eigentumsschutz wie der Systemeintrag.
- [ ] Backend- und Frontendtests prüfen Viewer-spezifische Projektion, Abgrenzung des Eigenprofils, Entdeckungsgrenzen, Allianzfreigabe und Löschrechte.
