# Starmap-Systemgrößen: STU-Live-Nähe

## Referenzbasis

Die lokale STU-Admin-Instanz unter `http://localhost:1337/admin/?SHOW_MAP_EDITOR=1&layerid=1` wurde technisch ausgelesen.
Dabei wurden 205 Systeme identifiziert und deren tatsächliche Gridgrößen über `SHOW_SYSTEM=1&systemid=...` bestimmt.

Verteilung:

- `22x22`: 47
- `20x20`: 40
- `25x25`: 29
- `23x23`: 26
- `24x24`: 24
- `26x26`: 12
- `27x27`: 11
- `7x7`: 7
- `15x15`: 6
- `19x19`: 2
- `17x17`: 1

Statistik:

- Minimum: `7x7`
- Maximum: `27x27`
- Median: `22x22`
- Mittelwert: `22.13x22.13`

## Umsetzung im Core

Die Generator- und Defaultwerte wurden daher nicht auf `~10x10`, sondern auf eine live-nahe Verteilung ausgerichtet:

- Normalsysteme: überwiegend `20–24`
- große Systeme: `25–27`
- kleine Spezialfälle: `7–19`
- harte Obergrenze für neue Generatorbereiche: `27`
- Standard-/Fallbackgröße für manuelle Anlage und Legacy-Fallbacks: `22x22`

## Umgang mit bestehenden großen Systemen

Für bereits existierende Systeme erfolgt in diesem Schritt **keine automatische Schrumpfmigration**.

Stattdessen gilt:

1. **Neue Systeme** werden künftig im neuen Zielkorridor erzeugt.
2. **Regenerierte Systeme** übernehmen künftig die neue, gedeckelte Größenrange ihres Systemtyps.
3. Bereits vorhandene Alt-Systeme oberhalb des Zielkorridors können bei Bedarf gezielt:
   - per Admin regeneriert,
   - manuell nachbearbeitet,
   - oder in einem späteren dedizierten Migrationsschritt angepasst werden.

Das vermeidet unkontrollierte Eingriffe in bereits belegte/größenabhängige Bestandsdaten.
