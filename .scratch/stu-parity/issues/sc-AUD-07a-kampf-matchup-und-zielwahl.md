# Kampf-Engine wie STU: Matchup, Zufallsziel, Feuerbedingung, Schadensmodell

**Status:** claimed
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

Die SWU-Kampf-Engine lässt erst alle Angreifer und dann alle Verteidiger je Waffenkategorie feuern, immer auf das erste lebende Schiff. Schilde absorbieren auch bei abgeschaltetem Schildsystem, dazu kommen fester Durchschlag 10 % und Wirkungsgrad 80 % aus `formulas.yaml`. Das widerspricht der Vorgabe „wir halten uns an STU“.

STU arbeitet so:
- Jedes Schiff feuert genau einmal, in Zufallsreihenfolge.
- Je Matchup entscheidet ein Münzwurf, welche Seite feuert; bei Einweg-Ursachen feuern nur die Angreifer.
- Ziel ist ein zufälliges aktives Mitglied der Gegenseite.
- Feuern kann nur, wer NBS aktiv, eine Waffe aktiv und EPS > 0 hat.

## STU-Quellen

- `src/Module/Spacecraft/Lib/Battle/SpacecraftAttackCycle.php` (Z. ~38–92)
- `src/Module/Spacecraft/Lib/Battle/AttackMatchup.php` (Z. ~29–74, Münzwurf Z. ~69)
- `src/Module/Spacecraft/Lib/Battle/Party/RoundBasedBattleParty.php` (Z. ~51–64), `Party/AbstractBattleParty.php` (Z. ~60)
- `src/Module/Spacecraft/Lib/Battle/Weapon/EnergyWeaponPhase.php` (Z. ~48–51, 101), `Weapon/ProjectileWeaponPhase.php` (Z. ~36)
- `src/Module/Spacecraft/Lib/Battle/SpacecraftAttackCauseEnum.php` (Einweg-Ursachen)
- `src/Module/Spacecraft/Lib/SpacecraftWrapper.php` (Z. ~222–234, „kann feuern“)
- `src/Module/Spacecraft/Lib/Damage/ApplyDamage.php` (Z. ~36, Schilde nur bei aktivem System)

## SWU-Pfade

- `apps/backend/src/modules/combat/combat.engine.ts` (Z. ~90–160 Ablauf, Z. ~274–282 Feuerbedingung, Z. ~450–470 Schaden)
- `apps/backend/src/modules/combat/battle-resolver.service.ts`
- `apps/backend/src/modules/spacecraft/spacecraft-damage.ts` (STU-naher Schaden mit `SHIELDS.active`, bisher nur Feld/Anomalie)
- `game-data/data/combat/formulas.yaml` (Z. ~29–37 `efficiency`, `bleedthrough`)
- `apps/backend/src/modules/combat/combat.engine.spec.ts`, `battle-resolver.service.spec.ts`

## Akzeptanzkriterien

- [x] Der Kampfablauf folgt dem STU-Matchup: Erstschlag durch ein Angreiferschiff, danach Münzwurf je Matchup, jedes Schiff feuert höchstens einmal (erst Energie-, dann Projektilwaffen), Schütze zufällig aus den noch unbenutzten feuerfähigen Schiffen.
- [x] Einweg-Ursachen (Traktor, Entern; Basis für sc-AUD-09) lassen nur die Angreiferseite feuern; die Ursache ist ein Parameter des Resolvers.
- [x] Zielwahl zufällig aus aktiven Mitgliedern der Gegenpartei; Energiewaffe behält ihr Ziel über die Salven (außer Ziel zerstört bzw. Feuermodus „zufällig“), Torpedos wählen je Salve neu.
- [x] Feuern nur mit aktivem NBS, aktiver Waffe und EPS > 0.
- [x] Schilde absorbieren nur bei aktivem Schildsystem; kein fester Durchschlag und kein pauschaler Wirkungsgrad, sofern STU sie nicht kennt. Die Schadensanwendung nutzt bzw. teilt `spacecraft-damage.ts`; überflüssige Werte in `formulas.yaml` werden entfernt oder als ungenutzt markiert.
- [x] Zufall ist injizierbar (Seed/Random-Port), damit Tests deterministisch sind.
- [x] Backend-Tests: Reihenfolge/Einmal-Feuern, Münzwurf, Einweg-Kampf, Zufallsziel (kein Fokus auf erstes Schiff), keine Feuer ohne NBS, Schaden bei abgeschalteten Schilden direkt auf Hülle; Kampfbericht bleibt lesbar (`combat-report.formatter.ts`).

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitte B3, E („Kampfziel-Auswahl“) und H („B3 Kampf“); [spacecraft.md](../audit-2026-11-17/spacecraft.md) große Abweichung 7 inkl. „Ergänzungen (nachgeprüft 2026-11-17)“.
- Maintainer-Vorgabe „Wir halten uns an STU“ (`map.md`). Resolved-Ticket mit abweichender Umsetzung: [sc-WP-COMBAT-1b](sc-WP-COMBAT-1b-interner-battle-resolver.md).
- Gesplittet: Parteibildung in sc-AUD-07b, Vorbereitung/Nachbereitung in sc-AUD-08.

## Comments

### 2026-11-18 – umgesetzt, Prüfung ausstehend

Hauptcommit (eindeutiger Betreff): `fix(combat): resolve STU matchups and active-shield damage (sc-AUD-07a)`.
Spieldaten-Commit: `41d8af7` (`docs(combat): mark legacy shield factors unused (sc-AUD-07a)`); der Hauptcommit referenziert diesen Submodulstand. Beide Commits sind lokal.
Status bleibt `claimed`; sc-AUD-07b und die davon abhängige sc-AUD-09 bleiben bis zum separaten Prüfpass blockiert.

**Umsetzung und Quellenabgleich**

- Ein gemeinsamer endlicher Matchup-Ablauf in `CombatEngine.resolveBattle`: zufälliger feuerfähiger Angreifer eröffnet, danach Münzwurf nur wenn beide Seiten noch unbenutzte feuerfähige Mitglieder haben; eine erschöpfte Seite wird übersprungen. Schiff-IDs werden vor dem Zug als benutzt markiert. Pro Zug zuerst Energie-, danach Projektilphase. `resolveCombat` delegiert auf denselben Ablauf; wenn beide Parteien überleben, lautet das gemeinsame Ergebnis `draw` statt eines künstlichen Siegers nach Resthülle.
- `BattleResolutionInput.cause` und `CombatCause` unterscheiden normalen Kampf/Alarm/Kolonialverteidigung von den Einweg-Ursachen `ACTIVATE_TRACTOR` und `BOARD_SHIP`. Standard ist `SHIP_FIGHT`; Einweg-Kämpfe geben Verteidigern keinen Feuerzug. Die tatsächlichen Reaktionsadapter folgen in sc-AUD-09.
- Zufällige Ziele kommen aus den lebenden aktiven Mitgliedern der Gegenpartei, einschließlich Mitgliedern ohne eigene Feuerfähigkeit. Energiephasen behalten ein Ziel über die bestehenden Modul-Salven; nach Zerstörung wird neu gewählt. `EnergyFiringMode` und `BattleResolutionInput.energyFiringModes` erlauben dem internen Aufrufer `RANDOM` je Schiff; ohne Vorgabe gilt `FOCUS`. Projektilphasen wählen vor jeder Salve neu. Der aktuelle Datenvertrag enthält keine persistierte Feuermodus-Einstellung; dieses Ticket ergänzt den Engine-/Resolver-Vertrag.
- Feuern erfordert aktives intaktes NBS, eine aktive intakte passende Laufzeitwaffe, ein funktionsfähiges Waffenmodul ohne Cooldown sowie EPS > 0. Fehlende Schalter gelten nicht als aktiv. Kategorien `ENERGY_WEAPON`/`WEAPONS` und `TORPEDO_BANK`/`PROJECTILE` werden berücksichtigt. Nach einem Treffer werden Feuerfähigkeit und Zielpool erneut geprüft. Kritischer Modulschaden und Ionendeaktivierung berücksichtigen auch die zugehörigen Laufzeitzustände.
- Quellenpräzisierung: STU `EnergyWeaponPhase::getEnergyWeaponEnergyCosts` und `ProjectileWeaponPhase::getProjectileWeaponEnergyCosts` verlangen je 1 EPS. SWU nutzt daher 1 EPS als Energie-Salvenstandard (explizite Modulwerte bleiben möglich) und zieht 1 EPS je tatsächlich verbrauchtem Torpedo ab. Bei 0 EPS wird kein Torpedo verbraucht.
- `splitSpacecraftDamage` teilt die bisherige STU-`DamageWrapper`-Berechnung aus `spacecraft-damage.ts` zwischen Kampf und Feld-/Anomalieschaden: aktive intakte Schilde verbrauchen zuerst den faktorabhängigen Nettoschaden, nur der Rest erreicht mit Hüllenfaktor die Hülle. Ausgeschaltete Schilde absorbieren nichts; bei Zusammenbruch wird der Laufzeitschalter deaktiviert. Keine pauschalen 10 % Durchschlag und keine 80 % Effizienz. Energiewaffen-/Schildmodifikatoren wirken nur auf Schildschaden, Projektilresistenz weiterhin auf Hüllenschaden. Historische `efficiency`/`bleedthrough` in `formulas.yaml` sind als ungenutzt markiert; `recharge_rate` wird außerhalb des Kampfzyklus weiterhin verwendet.
- `CombatRandom` ist als austauschbarer Nest-Provider registriert und deckt Matchup, Schützen, Ziele und alle bestehenden Engine-Zufallswerte ab. Tests können den Port direkt als dritten Konstruktorparameter einsetzen; Produktionsstandard bleibt `Math.random`.
- Schadens-/Zerstörungszeilen tragen die tatsächliche Schiff-ID. Der Formatter ordnet Namen auch für die Verteidigerseite korrekt zu; vorhandenes Berichtsformat und Persistenzablauf bleiben nutzbar.

STU-Quellen gelesen: AttackCycle, AttackMatchup, RoundBasedBattleParty/AbstractBattleParty, SpacecraftWrapper::canFire, EnergyWeaponPhase, ProjectileWeaponPhase, SpacecraftAttackCauseEnum, ApplyDamage und DamageWrapper. ADR-0004 bleibt eingehalten: Schiffe und Stationen verwenden den gemeinsamen Spacecraft-/Kampfpfad.

**Sofort geprüft**

76 Backend-Tests in vier betroffenen Dateien erfolgreich:

- `combat.engine.spec.ts`: Erstschlag, beide Münzwurf-Ausgänge, zufällige Auswahl ohne Fokus auf erstes Schiff, jeder Schütze höchstens ein Zug mit geordneten Phasen, beide Einweg-Ursachen, fehlendes/ausgeschaltetes/zerstörtes NBS und Waffen, Modulschaden/Cooldown, letzte EPS vor Torpedoverbrauch, Focus/Random/Projektil-Ziele, zerstörte Ziele/Schützen, Kanonkategorien, aktive/ausgeschaltete Schilde, Faktoren, Projektilspezialisierung und bestehende Feldeffekte. Quellenabhängige Fixtures speichern aktive Systeme nun ausdrücklich.
- `battle-resolver.service.spec.ts`: Ursachen- und Feuermodusweitergabe sowie bisherige Berichte, Zerstörung, Meldungen und Statistik.
- `combat.service.spec.ts`: bestehender manueller Angriffsadapter und Parteibildung; Erwartung um Standard-Kampfursache erweitert.
- `spacecraft-damage.spec.ts`: bisherige Feld-/Anomalieschäden und reine gemeinsame Netto-/Faktorberechnung, einschließlich vollständiger Schildabsorption, Overflow, OFF-Zustand und Nullfaktor.

Kurzer Review des tatsächlichen Diffs und Whitespace-Prüfung erfolgreich. Die Prüfung markiert die funktionalen Kriterien anhand der aktuellen Unit-Evidenz, nicht den Gesamtstatus als abgeschlossen.

**Separater Prüfpass ausstehend**

1. Abschlussreview gegen STU und Kriterien, insbesondere mehrgliedrige Parteien, zerstörte/temporär deaktivierte Systeme, Salven und Netto-/Modifikator-Rundung.
2. PostgreSQL-/API-Kampfregressionen mit realen Modulen, EPS, Torpedolager, mehreren Spielern/Stationen, Tarnung/RPG-Sichtbarkeit, Zerstörung und gespeicherten Berichten; Alarm-/Orchestrierungspfade mit dem erweiterten Resolver-Vertrag prüfen.
3. Weitere betroffene Feld-/Anomalie-/Navigationsregressionen für den gemeinsamen Schadenshelfer im Sammelpass.
4. Backend/Frontend/Shared-Lint und Typechecks sowie gemeinsamer Build, inklusive korrektem Spieldaten-Submodulstand.
5. Browserprüfung eines realen Kampfberichts mit mehreren Schiffen und Schild-/Hüllen-/Zerstörungszeilen.

Modellrouting: zentrale Spielregeln und Schnittstellen direkt im verfügbaren Sitzungsmodell umgesetzt und kurz geprüft; keine Codierdelegation. Die laufende Sitzung kann nicht auf GPT-6.1 Sol wechseln, daher dokumentierter Workflow-Fallback. Lokale Korrekturen an Quellen-Fixtures und Erwartungen für zusätzliche Schiff-IDs/Kampfursache; keine messbaren Tokenzahlen verfügbar.
