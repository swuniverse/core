# „Informationen“ mit Station im Orbit, Uhrzeit, Rotation, Systemkartenlink; Umlaut-Schreibfehler

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Im Koloniemenü „Informationen“ zeigt STU den Kasten „Station im Orbit“, die Ortszeit der Kolonie und die Rotationsdauer. Das Sternensystem verlinkt dort auf die Systemkarte in der Datenbank. In SWU fehlt das; „Tagesdauer“ gibt es nur für Kolonien mit SWU-Ökosystem. Außerdem stehen in der Forschung die Schreibfehler „Verfuegbare“ und „Benoetigte“.

## STU-Quellen

- `src/html/colony/menu/management.twig` (Station im Orbit, Planet mit Uhrzeit und Rotationsdauer, Sternensystem mit Datenbanklink)
- `src/Module/Colony/Lib/Gui/Component/ManagementProvider.php`
- `src/html/view/research.twig` (Schreibweise)

## SWU-Pfade

- `apps/frontend/src/pages/colonies/components/PanelInfo.tsx` (Tagesdauer Z. 67–118, Sternensystem Z. 177–206)
- `apps/frontend/src/pages/colonies/useSwuColonyEcosystem.ts` (liefert für STU-Kolonien `null`)
- `apps/backend/src/modules/colony/colony-projection.service.ts` (Koloniedetail), `entities/colony.entity.ts` (`rotationFactor`)
- `apps/frontend/src/pages/database.tsx` (Systemkarte)
- `apps/frontend/src/pages/research.tsx` (Z. ~380 „Verfuegbare“, Z. ~637 „Benoetigte“)

## Akzeptanzkriterien

- [ ] „Informationen“ hat den Kasten „Station im Orbit“, wenn am Kolonieort eine Station steht: Name, Rumpf, Besitzer. Für getarnte fremde Stationen erscheint er nicht.
- [ ] Die Planetenbox zeigt für jede Kolonie die Ortszeit und die Rotationsdauer, berechnet wie STU aus `rotationFactor`, unabhängig vom SWU-Ökosystem.
- [ ] Der Name des Sternensystems verlinkt auf die Systemkarte in der Datenbank.
- [ ] In `research.tsx` steht „Verfügbare Forschungen“ und „Benötigte Ware / Effekt“; auch im übrigen Koloniebereich bleibt keine ae/oe/ue-Umschreibung.
- [ ] Backend-Test für das Stationsfeld im Koloniedetail (eigene, fremde, getarnte Station).
- [ ] Frontend-Tests `PanelInfo.spec.tsx` (Station, Uhrzeit, Rotation, Link) und `research.spec.tsx` (Schreibweise).

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt D (sh-AP-13a Umlautreste) und Abschnitt H „Kolonie“.
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Seitenabgleich „Informationen“ und „Forschungsliste“, kleine Abweichungen „Informationen: kein Kasten Station im Orbit …“ und „Forschung: Umlaut-Schreibfehler“.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt.
