# Feldeffekte, Teil 1: Lecks, Ausfälle, Regeneration

**Status:** needs-info
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

- [ ] Für jeden der sieben Effekte gibt es einen Handler, registriert in der Pipeline aus tmw-K1a. Er wirkt nur, wenn das Feld (Feldtyp-`effects` oder Feld-`effectFlags`) den Effekt trägt.
- [ ] Leck-Effekte senken Hyperantrieb, Reaktorladung bzw. EPS nach der STU-Formel und nie unter 0.
- [ ] `CLOAK_UNUSEABLE` deaktiviert eine aktive Tarnung. Ohne Tarnsystem (vor sc-WP-CLOAK-1a) gibt es keine Wirkung und keinen Fehler.
- [ ] `SHIELD_MALFUNCTION` schaltet die Schilde ab, entlädt sie beim Einflug und je Tick, solange das Schiff im Feld steht.
- [ ] `NFS_MALFUNCTION_COOLDOWN` setzt für die Nahbereichssensoren einen Cooldown von 10–20 Minuten, verlängert einen längeren bestehenden aber nicht.
- [ ] `REGENERATION_CHANCE` lädt mit 20 % Chance ein zufälliges System um 1–20 % auf, beim Einflug und je Tick.
- [ ] Meldungen erscheinen je Schiff: gelb für negative, grün für positive Effekte, im Schiffslog bzw. in der Meldungsleiste.
- [ ] Backend-Tests je Handler mit deterministischem Zufall: Wirkung, Untergrenze 0, keine Wirkung ohne Effekt, Tick-Wirkung. Frontend: Die Meldungen werden angezeigt (Test an der Meldungsleiste).

## Comments

- 2026-10-28: Umsetzung verworfen, weil die vorgeschriebene Prüfung nach zwei ernsthaften Versuchen nicht grün wird. `npx nx affected -t lint typecheck test --base=HEAD` scheitert in `frontend:typecheck` und `backend:typecheck` an bereits vorhandenen projektweiten Fehlern, insbesondere `apps/frontend/src/pages/database.tsx:1015` (`"REBEL" | "EMPIRE"` ist nicht `Faction`) sowie zahlreichen TS6305-Fehlern wegen fehlender Declaration-Ausgaben. Die betroffenen Lint-/Testläufe und `npx nx run-many --targets=build` sind grün; benötigt wird eine Entscheidung bzw. Bereinigung der Typecheck-Baseline, bevor dieses Issue erneut umgesetzt wird.
