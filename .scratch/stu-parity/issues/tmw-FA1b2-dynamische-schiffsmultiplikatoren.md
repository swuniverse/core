# Dynamische Fraktionsmultiplikatoren für Schiffswerte

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** tmw-FA1a

## Ziel

Rumpf-, Schild- und Frachtmultiplikatoren der aktuellen Eigentümerfraktion wirken in allen autoritativen Schiffswertberechnungen, ohne effektive Werte am Schiff einzufrieren.

## SWU-Pfade

- `apps/backend/src/modules/faction/`
- `apps/backend/src/modules/spacecraft/spacecraft-stats.service.ts`
- Schiffswert-DTOs und Verbraucher unter `apps/backend/src/modules/spacecraft/` und `packages/shared/`
- `docs/faction-modifiers.md`

## Akzeptanzkriterien

- [ ] `hullMultiplier`, `shieldMultiplier` und `cargoMultiplier` werden zentral aus der aktuellen Eigentümerfraktion gelesen und in der autoritativen Statistikprojektion angewandt.
- [ ] Persistierte Rumpf-, Modul- und Bauplan-Basiswerte bleiben unverändert; es werden keine fraktionsabhängigen Effektivwerte beim Spawn gespeichert.
- [ ] Alle API- und Regelpfade verwenden dieselbe effektive Statistik, insbesondere Maximalhülle, maximale Schildkapazität und Frachtraumkapazität.
- [ ] Aktuelle Werte werden bei einer sinkenden Maximalgrenze deterministisch auf das neue Maximum begrenzt; es entstehen keine negativen oder übervollen Kapazitäten.
- [ ] Ein Eigentümerwechsel verwendet ohne Datenmigration die Fraktion des neuen Eigentümers.
- [ ] Ungültige oder fehlende Multiplikatoren fallen nicht still auf unsichere Werte zurück, sondern verwenden den bestehenden validierten Fraktionsvertrag.
- [ ] Backend-Tests decken beide Fraktionen, alle drei Multiplikatoren, Besitzerwechsel und Grenzwertbegrenzung ab.
- [ ] `docs/faction-modifiers.md` dokumentiert die wirksamen Verbraucher.

## Entscheidung

Option 1: Die aktuelle Eigentümerfraktion wird bei jeder autoritativen Statistikberechnung dynamisch angewandt. Basiseigenschaften bleiben persistiert und unverändert.

## Comments

- 2026-10-30: Umsetzung nach zwei vollständigen Validierungsversuchen abgebrochen und Produktcode zurückgesetzt. Der Pflicht-Gate ist bereits außerhalb dieses Issues rot: `backend:typecheck` scheitert in `wreck-decay.service.spec.ts` (Zeilen 20/38) und `tutorial.service.spec.ts` (Zeile 22) an veralteten Konstruktoraufrufen; `backend:test` scheitert zusätzlich in `spacecraft-core-controls.spec.ts` (`shipRepo.findOneBy` fehlt im Fixture), `faction.service.spec.ts`, `wreck-decay.service.spec.ts` und `tutorial.service.spec.ts`. Die fokussierten Multiplikator-/Transfer-Tests waren zuvor grün (36/36), der globale Gate kann aber nicht erfüllt werden, ohne fremde Baseline-Arbeiten zu übernehmen.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Backend-Konstruktor- und Test-Fixtures); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
- 2026-11-15: Umfangsprüfung: `hullMax`, `shieldsMax` und `cargoMax` werden am Schiff gespeichert und in rund 21 Dateien direkt gelesen (Kampf, Schaden, Reparatur, Transfer, Handel, Ansichten); die dynamische Anwendung wäre ein großer Umbau. STU kennt keine fraktionsabhängigen Schiffswerte: `Orm/Entity/Faction.php` hat nur Start- und Warendaten, `maxHull`/`maxShield` werden beim Bau am Schiff gespeichert.
- 2026-11-15 Maintainer: „Wir machen mit 3 weiter“ – wie STU, keine Fraktionsfaktoren für Schiffe; die drei Faktoren werden entfernt. Die Akzeptanzkriterien oben (dynamische Anwendung) entfallen damit.
- 2026-11-15: Umgesetzt (c1f305ad). `hullMultiplier`, `shieldMultiplier`, `cargoMultiplier` aus `FactionModifier` (App- und Migrations-Entity), den Standardwerten in `FactionService` und der Registrierungsseite (Bonusanzeige) entfernt; Migration `20261115160000-drop-faction-ship-multipliers` löscht die Spalten (`down` legt sie mit 1 wieder an). `docs/faction-modifiers.md` und `docs/stu-target-architecture-and-tickets.md` angepasst. Gates: Lint 0 Fehler (1430/110), Typecheck und Build grün, Integration 750/750 (inkl. Migrationen), Backend-Unit und Frontend grün bis auf zwei Zeitfehler unter Last (`password-reset.service.spec.ts`, `spacecraft-detail.spec.tsx`), einzeln grün.

