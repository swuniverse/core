# 08: Vervollständige Scanarchiv und Sofortscan-Navigation

**What to build:** Das globale Scanarchiv bleibt eine optionale SWU-Komfortansicht mit vollständiger Historie, verwendet aber dieselben Rechte- und Herkunftshinweise wie die STU-nahen Kontextansichten. Nach einem erfolgreichen Kolonie-Scan kann ein Spieler direkt zum bereits persönlich entdeckten Systemeintrag wechseln, ohne dadurch neues Systemwissen zu erhalten.

**Blocked by:** 03: Führe tickbasierte Astrometrie ein; 06: Integriere neueste zugängliche Kolonie-Scans in Systemeinträge.

**Status:** resolved

- [x] Das globale Scanarchiv behält die vollständige Historie pro Kolonie als bewusste SWU-Komfortfunktion.
- [x] Eigene und aktuell über die **Allianz** geteilte Scans sind eindeutig als solche gekennzeichnet und verwenden dieselben Scanner-, Freigabe- und Löschrechte wie die Systemansicht.
- [x] Eine Löschaktion erscheint im Archiv ausschließlich für eigene Scans; fremde Löschversuche bleiben serverseitig verweigert.
- [x] Der unmittelbare Kolonie-Scan-Dialog enthält die vollständige, typisierte Scanreferenz und verlinkt nur dann zum Systemeintrag, wenn das System bereits persönlich entdeckt wurde.
- [x] Der Link kann keine Systementdeckung auslösen und ein nicht entdecktes System nicht öffnen.
- [x] Frontend- und Backendtests sichern Historie, Kennzeichnung, Eigentumsschutz, Linkbedingung und die unveränderte direkte Scanrückmeldung ab.

## Comments

Audit: Alle Akzeptanzkriterien sind erfüllt. Umsetzung: `spacecraft-scan.service.ts`, `colony-scan-projection.service.ts`, `spacecraft.controller.ts`, `colony-scans.tsx`, `ColonyScanDialog.tsx`, `FieldContextPanel.tsx`; Tests: `spacecraft-scan.service.spec.ts`, `colony-scan-projection.service.spec.ts`, `colony-scans.spec.tsx`, `FieldContextPanel.spec.tsx`; maßgeblicher Commit: `a962b8c` (Merge `cbd49f6`).
