# Forschungsqueue: bewusste Abweichung von STU

STU erlaubt genau eine aktive Forschung und einen Warteslot. Wird eine Forschung abgebrochen, wird ihr Datensatz gelöscht und der bis dahin erzielte Fortschritt verworfen.

SWU behält stattdessen seine Forschungsqueue mit bis zu zehn Plätzen. Spieler können eine Zielforschung auswählen; SWU ermittelt automatisch den noch fehlenden Pfad aus Voraussetzungen und reiht ihn bis zur Queue-Grenze ein. Beim Abbruch wird die Forschung wieder verfügbar, ihr bereits erzielter Fortschritt bleibt jedoch erhalten. Die nächste eingereihte Forschung rückt automatisch nach.

Diese Abweichung ist ein Komfortgewinn ohne Balance-Nachteil. Sie reduziert wiederholte manuelle Queue-Pflege und verhindert, dass bereits investierter Fortschritt durch eine Planänderung verloren geht. Die Forschungsgeschwindigkeit und die Kosten einzelner Forschungen bleiben unverändert; zusätzliche Queue-Plätze ermöglichen keine parallele Forschung.

## Considered Options

- **STU-Regel übernehmen:** verworfen. Eine aktive Forschung plus ein Warteslot und vollständiger Fortschrittsverlust beim Abbruch erzeugen zusätzliche Bedienarbeit, ohne die Forschungsgeschwindigkeit sinnvoll zu begrenzen.
- **Mehrere Forschungen parallel bearbeiten:** verworfen. Das wäre nicht nur ein Komfortgewinn, sondern würde die Balance durch höhere Forschungsgeschwindigkeit verändern.

## Consequences

- Die Queue bleibt auf zehn Plätze begrenzt und arbeitet Forschungen weiterhin nacheinander ab.
- Die automatische Pfadplanung zur Zielforschung bleibt Bestandteil des Forschungsablaufs.
- Ein Abbruch entfernt eine Forschung aus der aktiven Queue, setzt ihren Fortschritt aber nicht zurück.
- Anzeigen der Forschungsqueue dürfen mehr als einen Warteslot darstellen und müssen den automatisch geplanten Pfad verständlich machen.
