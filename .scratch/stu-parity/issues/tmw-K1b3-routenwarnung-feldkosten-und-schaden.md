# Routenwarnung für Feldkosten und Schadensrisiken

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** tmw-K1b1, tmw-K1b2

## Ziel

Vor der Bewegung zeigt die Oberfläche die tatsächlichen Grund- und Deflektorkosten sowie Schadensrisiken aller Felder der gewählten Route.

## SWU-Pfade

- Routen- beziehungsweise Zielvorschau aus `tmw-K1a`
- Shared-Bewegungs-DTOs unter `packages/shared/`
- Navigation und Warnungsdarstellung im Frontend

## Akzeptanzkriterien

- [ ] Die Backend-Vorschau verwendet denselben Routenresolver und dieselben Kostenregeln wie die tatsächliche Bewegung.
- [ ] Sie liefert je Feld mindestens Koordinate, Grund-EPS, zusätzliche Deflektor-EPS, normalen Schaden und vorhandenes Spezialschadensrisiko.
- [ ] Summen unterscheiden Grundkosten und Deflektorkosten; nicht passierbare Felder und ein voraussichtlicher EPS-Abbruch sind eindeutig markiert.
- [ ] Zerstörter Deflektor beziehungsweise zu wenig EPS wird als Feldschadensrisiko angezeigt, ohne einen erfolgreichen Ausgang zu versprechen.
- [ ] Das Frontend zeigt die geordnete Route, Gesamtkosten und Schadenswarnungen vor Bestätigung der Bewegung.
- [ ] Vorschau ist informativ; das Backend validiert beim Ausführen erneut und vertraut keinen vom Client gelieferten Kosten.
- [ ] Backend-Tests sichern Übereinstimmung von Vorschau und Ausführung für Einfeld- und Mehrfeldrouten. Frontend-Tests decken Kostenaufteilung, Feldschaden und blockierte Route ab.

## Entscheidung

Warnungen folgen dem autoritativen Transition- und Deflektormodell; es gibt keine separate Frontend-Berechnung.

## Comments

- 2026-11-15: Maintainer-Entscheidung „wie STU“: STU kennt keine Routenvorschau; Feldkosten stehen nur im Sektorscan des aktuellen Felds (`sectorScan.twig`: Energiekosten, „Spezialschaden (Schaden bei Deflektorausfall)“). Keine Routenvorschau gebaut. Der SWU-Sektorscan lieferte statt der Feldtypwerte die feldweisen Kopien und einen Platzhalter `specialDamage: 0`; er meldet jetzt `energyCost`, `damage` und `specialDamage` des Feldtyps (Frontend-Anzeige entsprach bereits STU). Commit 7015b894.
