# 08: Vervollständige Scanarchiv und Sofortscan-Navigation

**What to build:** Das globale Scanarchiv bleibt eine optionale SWU-Komfortansicht mit vollständiger Historie, verwendet aber dieselben Rechte- und Herkunftshinweise wie die STU-nahen Kontextansichten. Nach einem erfolgreichen Kolonie-Scan kann ein Spieler direkt zum bereits persönlich entdeckten Systemeintrag wechseln, ohne dadurch neues Systemwissen zu erhalten.

**Blocked by:** 03: Führe tickbasierte Astrometrie ein; 06: Integriere neueste zugängliche Kolonie-Scans in Systemeinträge.

**Status:** ready-for-agent

- [ ] Das globale Scanarchiv behält die vollständige Historie pro Kolonie als bewusste SWU-Komfortfunktion.
- [ ] Eigene und aktuell über die **Allianz** geteilte Scans sind eindeutig als solche gekennzeichnet und verwenden dieselben Scanner-, Freigabe- und Löschrechte wie die Systemansicht.
- [ ] Eine Löschaktion erscheint im Archiv ausschließlich für eigene Scans; fremde Löschversuche bleiben serverseitig verweigert.
- [ ] Der unmittelbare Kolonie-Scan-Dialog enthält die vollständige, typisierte Scanreferenz und verlinkt nur dann zum Systemeintrag, wenn das System bereits persönlich entdeckt wurde.
- [ ] Der Link kann keine Systementdeckung auslösen und ein nicht entdecktes System nicht öffnen.
- [ ] Frontend- und Backendtests sichern Historie, Kennzeichnung, Eigentumsschutz, Linkbedingung und die unveränderte direkte Scanrückmeldung ab.
