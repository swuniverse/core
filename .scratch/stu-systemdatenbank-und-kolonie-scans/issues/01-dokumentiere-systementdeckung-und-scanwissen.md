# 01: Dokumentiere Systementdeckung und Scanwissen

**What to build:** Die fachliche Bedeutung persönlicher Systementdeckung, tickbasierter Astrometrie und dynamisch innerhalb einer **Allianz** geteilter Kolonie-Scans ist dauerhaft dokumentiert. Agenten und Spielerentwicklung verwenden dieselben Begriffe und behandeln das globale Scanarchiv als bewusste SWU-Komfortansicht statt als primären STU-Navigationspfad.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Eine ADR hält fest, dass Astrometrie persönliche Systementdeckung erzeugt, Systementdeckungen nicht innerhalb einer **Allianz** geteilt werden und gespeicherte Kolonie-Scans nur für aktuelle Allianzmitglieder dynamisch lesbar sind.
- [x] Die ADR legt fest, dass Systemeinträge und Fremdprofile nur den neuesten zugänglichen Scan je Kolonie zeigen, während das globale Scanarchiv Historie als SWU-Komfortfunktion behält.
- [x] Der Domänenkontext definiert **Systementdeckung**, **Astrometrie**, **Systemeintrag**, **Kolonie-Scan** und **Scan-Snapshot** einschließlich der Grenze zwischen aktuellen Systemdaten und historischen Snapshotdaten.
- [x] Die Dokumentation verwendet **Allianz** ausschließlich für den Spielerzusammenschluss und steht nicht im Widerspruch zu den bestehenden bewussten STU-Abweichungen.

## Comments

Audit: Alle Akzeptanzkriterien sind erfüllt. Belege: `docs/adr/0002-persoenliche-systementdeckung-und-dynamisches-scanwissen.md`, `docs/adr/0003-messpunktbasierte-systemkartographie.md` und `CONTEXT.md`; maßgebliche Commits: `04e13e8`, `1c724b5`.
