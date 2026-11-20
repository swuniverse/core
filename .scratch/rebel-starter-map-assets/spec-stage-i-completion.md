# Vollständiger Abschluss der Rebellen-Assets bis FP Stufe I

Nutzerfreigabe: alle im Statusbericht noch offenen 25 Familien selbstständig abarbeiten, plus Forschungszentrum Stufe II als Übergang. Bereits 16 Familien / 39 IDs fertig. Rest: 26 Familien / 55 IDs in sieben Serien.

Quellen: game-data/data/buildings/stu-buildings.yaml; game-data/data/research/rebels.yaml; game-data/data/buildings/swu-field-build-categories.yaml; stu-building-upgrades.yaml. Version 8cda53525946df8fb8e998194acd1a06737630bc. Exakte Serien/Manifeste: assets/generated/swu-rebel-stage-i-completion/plan.json.

## Stil und Produktionsvertrag

Freigegebene hohe Draufsicht, breite Grundfläche, gebrauchte Star-Wars-Frontier-Architektur. PNG RGBA 256x256; 512px-Master; Quelle und Prompt erhalten. Orbitale Anlagen ohne Boden/Sternhintergrund, auf vorhandene Orbitfelder montierbar. Keine festen Schiffe/Personen im Gebäudeasset. Neue versionierte Dateinamen; keine Altbilder überschreiben.

## Besonderheiten

Außenposten ist Kolonisierungsgebäude des GR-75-Kolonietransporters. Forschungszentrum II ist ein Upgrade von 72010100 zu 73010100 mit Forschung 200201, keine normale Neubaubarkeit. Kryo-Zuchtanlage und Solarspiegel/Solarfokus haben teils nur numerische STU-Feldfreigaben; Vorschau benutzt tatsächlich erlaubte existierende Kacheln. Spiel-/Bebaubarkeitsregeln nicht erweitern. Keine gebäudefamilienübergreifenden Geländealternativen mappen.

## Ablauf und Zuständigkeiten

Ein Coding Agent zur Zeit, nur assets.ts; Parent erzeugt/prüft/exportiert die Rastergrafiken. Serien jeweils separat reviewen und in Assets-Submodul sowie Core committen. Scoped Commits, Änderungen anderer erhalten. Statusbericht nach Serien und am Ende aktualisieren. Gemeinsames Export-/Prüfskript dient nur Artefaktproduktion und Integrationsprüfung, kein neues Spielframework.

## Fertigstellung

Am Ende alle 42 Familien / 94 IDs vorhanden und korrekt angebunden, alle offenen Tickets geschlossen, konsolidierte bebilderte Übersicht und Statusbericht mit null offenen Familien in diesem Umfang.
