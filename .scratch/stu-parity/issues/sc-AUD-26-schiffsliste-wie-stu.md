# Schiffsliste wie STU

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

`/spacecraft` nach STU `shiplistmacros.twig` (Spalten) und `shiplistFleetform.twig` (Flottenkopf); Stationen nicht mehr hier (→ sc-AUD-27).

## Akzeptanzkriterien

- [x] Spalten Klasse, Name, Alarm, x|y, Hülle, Schilde, Energie, Versorgung, Crew, Systeme, Flotte; Kopf mit Info-Icon und STU-Tooltip.
- [x] Ebene und Status entfallen; Energie vereint EPS (`aktuell/max +Zuwachs (Verbrauch/Reaktornutzung)`) und Hyperantrieb; Versorgung zeigt Reaktorladung und Ersatzbatterie als Icons.
- [x] Position wie STU: im System `x|y (Galaxie)`, sonst `(x|y)`.
- [x] Schilde: aktive hervorgehoben, Regeneration `(+n)` nur bei inaktiven Schilden.
- [x] Crew als Zahl, grün/rot; Details im Tooltip.
- [x] Systeme als Icons `kss`, `lss` immer, `act_phaser`, `act_torp`, `tarn` nur wenn vorhanden.
- [x] Flottenkopf: Flotten-Icon klappt auf/zu, Name, „(Crewsumme/100 Crew)“; Namensfeld mit `knedit2` zum Umbenennen; `fl_join2` „Schiff hinzufügen“. Alarm-, „Nach oben“-, Ein-/Ausblenden-, Umbenennen-/Auflösen-Knöpfe entfallen (Auflösen über das Flaggen-Icon des Führers).
- [x] Angedockt-Icon `dock2` vor dem Namen.

## Comments

### 2026-11-24 — umgesetzt, Prüfung ausstehend

- Icons `knedit2`, `dock2` aus STU (Submodul `assets`).
- Abweichung: Ebenen-Icon im Flottenkopf und bei Einzelschiffen weggelassen (Wunsch Projektinhaber); STU-Rubriken Verteidigen/Blockieren im Flottenkopf fehlen (SWU hat keine Kolonieverteidigung in der Liste).
- Tests: `spacecraft.spec.tsx` umgeschrieben (Spalten, Energie/Versorgung/Systeme, Crewsumme, Umbenennen, Zuklappen, keine Stationen). Vitest `pages` + `components/layout` + `components/spacecraft` 823/828, die 5 Ausreißer (holonet, messages, player-profile, starmap) einzeln 103/103 grün und nicht berührt; `nx typecheck` frontend/backend ✓.
- Modell: Claude Opus 5.5 direkt.
