# Sternenkarte: Nebelgebiete

Deterministisch erzeugte echte Nebelfelder auf Galaxie und Systemen. Vorhandene Assets und vorhandene Flugkosten, Schäden, Effekte und Ressourcen wiederverwenden. Gedämpfte STU-Strukturen mit Star-Wars-Farben. Keine Änderungen beim Laden, kein Weltreset.

Seed `swu-nebula-v1`, Ziel BOTH, Dichte BALANCED. Flächenanteile vor Schutzabständen: Galaxie 10/20/30 %, Systeme 6/12/18 %. Nur sehr dünne, dünne und mittlere Nebeltypen. Keine dichten, undurchdringlichen oder brennenden Felder.

Nur freie gewöhnliche Weltraumfelder ergänzen. Schutz: Himmelskörper plus 1 Feld, Startsysteme/Wurmlöcher plus 2 Felder, Routen plus 1 Feld, belegte Felder, Eintrittspositionen, individuelle Effekte und Passierbarkeitsänderungen. Bestehende Sonderfelder erhalten. Wiederholung desselben Seeds erzeugt keine zusätzlichen Felder.

Karteneditor: Vorschau mit Seed/Ziel/Dichte, Galaxie und auswählbaren Systemen, Feldkosten und Schäden. POST starmap/admin/layers/:id/nebula/preview und apply mit MAP_EDITOR. DTOs in packages/shared/src/lib/starmap/nebula.ts. Apply sendet Settings + Fingerprint; Server berechnet Plan neu, weist veraltete Vorschauen zurück und schreibt atomar.

Darstellung in Canvas, Systemeditor, Datenbankraster und LSS vereinheitlichen. Unbekannte Felder bleiben verborgen. Großes Galaxiehintergrundbild nicht laden, schwarzer Ladezustand; keine späten Inserts nach Abbruch.

Neuer verwalteter Workspace /Users/TMUNDIN/.codex/worktrees/f185/core, Branch codex/starmap-nebula. Schreibbare Staging-Kopie /private/tmp/swu-starmap-nebula-stage; geprüfte Patches werden mit freigegebenem git apply in den verwalteten Workspace übertragen.
