# Feldeffekte, Teil 1: Lecks, Ausfälle, Regeneration

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K1a

## Ziel

Die aktiven Feldeffekte bekommen Handler, die beim Einflug und, wo STU das vorsieht, auch je Tick wirken: Hyperantriebs-, Reaktor- und EPS-Leck, Tarnausfall, Schildstörung, Nahbereichssensor-Cooldown und Regenerationschance. Spieler erhalten dazu die STU-typischen farbigen Meldungen. Dieses Issue setzt einen Teil von `sc-WP-NAV-1` um, kanonisch über tmw-K1a bis tmw-K3c.

## STU-Quellen

- `src/Component/Map/Effects/EffectHandling.php`
- `src/Component/Map/Effects/Type/WarpdriveLeakEffectHandler.php`, `ReactorLeakEffectHandler.php`, `EpsLeakEffectHandler.php` (Verlust `rand(1, ceil(max/10), true, ceil(max/20))`, höchstens der aktuelle Bestand)
- `.../CloakUnuseableEffectHandler.php` (aktive Tarnung wird beim Einflug abgeschaltet)
- `.../ShieldMalfunctionEffectHandler.php` (Schilde aus, Emitter entladen, auch je Tick)
- `.../NfsMalfunctionCooldownEffectHandler.php` (NBS-Cooldown 10–20 Min.)
- `.../RegenerationChanceEffectHandler.php` (20 % Chance, 1–20 % eines zufälligen Systems aus EPS, Schilde, Reaktor oder Warpantrieb, beim Einflug und je Tick)
- `src/Module/Spacecraft/Lib/Movement/Component/Consequence/PostFlight/FieldTypeEffectConsequence.php`

## SWU-Pfade

- Pipeline und Effekt-Katalog aus tmw-K1a
- `apps/backend/src/modules/spacecraft/entities/spacecraft.entity.ts` (`warpdrive`, `eps`, `reactorFuel`, `shields`), `spacecraft-runtime-state.service.ts` (System-`cooldown`, `active`)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts#processTick`
- `packages/shared/src/lib/spacecraft/index.ts` (`WARPDRIVE`, `REACTOR`, `EPS`, `SHIELDS`, `SHORT_RANGE_SENSORS`)

## Akzeptanzkriterien

- [x] Für jeden der sieben Effekte gibt es einen Handler, registriert in der Pipeline aus tmw-K1a. Er wirkt nur, wenn das Feld (Feldtyp-`effects` oder Feld-`effectFlags`) den Effekt trägt.
- [x] Leck-Effekte senken Hyperantrieb, Reaktorladung bzw. EPS nach der STU-Formel und nie unter 0.
- [x] `CLOAK_UNUSEABLE` deaktiviert eine aktive Tarnung. Ohne Tarnsystem (vor sc-WP-CLOAK-1a) gibt es keine Wirkung und keinen Fehler.
- [x] `SHIELD_MALFUNCTION` schaltet die Schilde ab, entlädt sie beim Einflug und je Tick, solange das Schiff im Feld steht.
- [x] `NFS_MALFUNCTION_COOLDOWN` setzt für die Nahbereichssensoren einen Cooldown von 10–20 Minuten, verlängert einen längeren bestehenden aber nicht.
- [x] `REGENERATION_CHANCE` lädt mit 20 % Chance ein zufälliges System um 1–20 % auf, beim Einflug und je Tick.
- [x] Meldungen erscheinen je Schiff: gelb für negative, grün für positive Effekte, im Schiffslog bzw. in der Meldungsleiste.
- [x] Backend-Tests je Handler mit deterministischem Zufall: Wirkung, Untergrenze 0, keine Wirkung ohne Effekt, Tick-Wirkung. Frontend: Die Meldungen werden angezeigt (Test an der Meldungsleiste).

## Comments

- 2026-10-28: Umsetzung verworfen, weil die vorgeschriebene Prüfung nach zwei ernsthaften Versuchen nicht grün wird. `npx nx affected -t lint typecheck test --base=HEAD` scheitert in `frontend:typecheck` und `backend:typecheck` an bereits vorhandenen projektweiten Fehlern, insbesondere `apps/frontend/src/pages/database.tsx:1015` (`"REBEL" | "EMPIRE"` ist nicht `Faction`) sowie zahlreichen TS6305-Fehlern wegen fehlender Declaration-Ausgaben. Die betroffenen Lint-/Testläufe und `npx nx run-many --targets=build` sind grün; benötigt wird eine Entscheidung bzw. Bereinigung der Typecheck-Baseline, bevor dieses Issue erneut umgesetzt wird.
- 2026-10-30 Product Owner: Option 1. Das M-Issue ist mit der aktuellen STU-Laufzeitsemantik `ready-for-agent`; bei Abweichungen gilt der aktuelle Handlercode statt der verkürzten Akzeptanzformulierung. Reaktoreffekte verändern `reactorFuel` gegen `reactorFuelMax`. Das Warpantriebsleck verliert beim Einflug deterministisch `min(aktuell, ceil(warpdriveMax / 10))`; Reaktor- und EPS-Leck verwenden beim Einflug den injizierbaren STU-Zufall und bleiben bei 0 begrenzt. Tarnung und NBS-Cooldown sind ebenfalls nur Einflugfolgen. Nur Schildstörung und Regeneration wirken beim Einflug und je Tick. Schildstörung deaktiviert aktive Schilde und reduziert den aktuellen Schildwert zufällig, nicht zwingend auf 0. Regeneration hat 20 % Auslösechance, wählt ein vorhandenes gesundes System aus EPS, Reaktor, Schild oder Warpantrieb und bleibt am verfügbaren Headroom begrenzt. Der NBS-Cooldown ist ein eigener Wall-Clock-Zeitstempel von zufällig 10–20 Minuten und verkürzt keinen späteren bestehenden Ablauf; das bestehende Tick-Cooldown-Feld wird dafür nicht zweckentfremdet. Zustandsänderungen werden autoritativ persistiert und erzeugen echte Schiffsordner- sowie Live-Meldungen. Die Typecheck-Baseline-Ausnahme aus `sh-AP-21` gilt: fokussierte Tests und Builds müssen grün sein, neue Typecheck-Fehler sind unzulässig.
- 2026-10-30: Umgesetzt: alle sieben Effekte sind in der Einflug-/Tick-Pipeline registriert, Zustände und eigener NBS-Zeitstempel werden persistiert, Schiffsordner- und farbcodierte Live-Meldungen werden erzeugt. Fokussierte Backend-/Frontend-Tests und alle Builds sind grün; der betroffene Typecheck enthält ausschließlich die bereits vorhandenen Fehler in `wreck-decay.service.spec.ts` und `tutorial.service.spec.ts`.

## Answer

Die aktiven Feldfolgen entsprechen der vom Product Owner festgelegten STU-Laufzeitsemantik. Einflug und Tick nutzen dieselbe Pipeline; nur Schildstörung und Regeneration laufen wiederkehrend. Der separate NBS-Wall-Clock-Cooldown besitzt eine Migration und wird nicht mit Tick-Cooldowns vermischt.
