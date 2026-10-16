# 07: Baue die kompakte Kartographieoberfläche

**What to build:** Die bestehende STU-kompakte Informationen-Oberfläche steuert das Astrometrie-Labor und zeigt den persönlichen Systemplan auf allen passenden eigenen Schiffen korrekt an. Ein nicht-taktischer Dialog bietet die Restziele und bestätigte Plan-/Finalisierungsaktionen.

**Blocked by:** 03: Implementiere das Astrometrie-Labor; 04: Plane Systemkartographie und Messpunkte; 06: Finalisiere Kartographie und entdecke Systeme.

**Status:** resolved

**Closure:** Implemented by `18e89d77430b678353f0b53e285261059ae701f2` and corrected by `e0354febdd6dc7aeb936ae4dc6923a6616d91c6c`.

- [ ] Der `Informationen`-Kasten zeigt kompakte einzeilige Labor- und Kartographieinformationen, ohne einen neuen separaten Astrometrie-Kasten.
- [ ] Die Laborzeile schaltet ausschließlich über diesen Kontext zwischen Aktivieren und Deaktivieren; konkrete fachliche Fehler erscheinen im bestehenden STU-artigen Meldungsdialog.
- [ ] Kartographie zeigt je Zustand: Planaktion, `Kartographierung ist geplant (System)`, `Verbleibende Messpunkte: N`, Finalisierungsaktion, Drei-Tick-Countdown oder kartographierten Endzustand.
- [ ] Alle eigenen Schiffe im System sehen den Status; nur lokal qualifizierte Schiffe erhalten Plan-/Finalisierungsaktionen. Außerhalb des Systems erscheint kein Status.
- [ ] Der Kartographie-Dialog zeigt nur verbleibende Koordinaten auf einem kleinen inspect-only Raster und löst keine Fernaktionen aus.
- [ ] Planen und Finalisieren erfolgen über bestätigte Dialoge; Deaktivieren geschieht sofort und erklärt gegebenenfalls die Rücksetzung einer Finalisierung.
- [ ] Bestehende Sektor-Scan-Dialoge und die STU-kompakte Darstellung bleiben erhalten.
- [ ] Frontendtests prüfen Sichtbarkeit, Rollen/Schiffsfähigkeit, Dialoge, Statuswechsel, Fehlermeldungen und fehlende Fernaktionen.
