# Ionensturm: Wirkung auf Schiffe und Stationen

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K10b1

## Ziel

Zweites Child aus `tmw-K10b`. Schiffe in Sturmfeldern erleiden je Tick Schaden, Stationen verlieren ihre Schilde, beim Einflug fällt der Antrieb zeitweise aus und es gibt bis zu 20 % Schaden. Dafür entsteht ein gemeinsamer Schadensdienst nach STU `ApplyDamage`, den `tmw-K1b2` wiederverwenden kann.

## STU-Quellen

- `src/Component/Anomaly/Type/IonStorm/IonStormHandler.php` (`damageSpacecrafts`, `deactivateShields`, `deactivateDrive`, `damageSpacecraft`, `getHullDamageFactor`, `handleIncomingSpacecraft`)
- `src/Module/Spacecraft/Lib/Damage/ApplyDamage.php`, `DamageWrapper.php`, `SystemDamage.php`
- `src/Module/Control/StuRandom.php` (asymmetrische Verteilung für den Antriebsausfall)

## SWU-Pfade

- `apps/backend/src/modules/anomaly/ion-storm.handler.ts`
- neuer Schadensdienst unter `apps/backend/src/modules/spacecraft/`
- `spacecraft-runtime-state.service.ts`, `spacecraft-destruction.service.ts` (`finalizeInManager` mit Grund Anomalie)
- Antriebsprüfungen in `spacecraft.service.ts` und `wormhole-passage-planner.ts`

## Akzeptanzkriterien

- [x] Gemeinsamer Schadensdienst nach STU `ApplyDamage`: Schilde absorbieren mit Schildfaktor `100 − Schildstufe × 10`, Hüllenschaden mit Hüllenfaktor über die Hüllenmodul-Stufe (8 % je Stufe, mit Ionensturm-Schutz 16 %), Kritischer Treffer 1:21 mit Systemschaden an den Zielsystemen, Zerstörung über den Zerstörungsdienst (neuer Grund Anomalie) mit Meldung.
- [x] Je Tick erhalten Schiffe in Sturmfeldern mit mehr als einem Restticks Schaden `ceil(rand(1, 10, normalverteilt) × maxHull × Intensität / 10000)`; Stationen verlieren nur aktive Schilde. Besitzer im Urlaubsmodus sind ausgenommen. Jeder Besitzer erhält eine Meldung je Fahrzeug.
- [x] Beim Einflug: Meldung, Antriebsausfall und Schaden mit bis zu 20 %.
- [x] Antriebsausfall zeitbasiert wie STU: Hyperantrieb (sonst Impulsantrieb) wird deaktiviert, Cooldown als Zeitstempel `jetzt + rand(0, 3600 s, asymmetrisch um 600 s)`. Die Antriebsprüfungen (Aktivieren, Fliegen, System verlassen, Wurmloch) werten Zeitstempel-Cooldowns zeitbewusst aus; bestehende Zähler-Cooldowns bleiben gültig.
- [x] Backend-Tests mit deterministischem Zufall: Tickschaden Schiff/Station, Schildabsorption, Krit mit Systemschaden, Zerstörung, Einflugschaden, Antriebsausfall und sein Ablauf.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Product Owner, 2026-11-12: voller STU-Port des Schadens als wiederverwendbarer Dienst; Antriebsausfall zeitbasiert wie STU.

## Comments

- 2026-11-12: Aus `tmw-K10b` abgespalten.
- 2026-11-12: Umgesetzt.
  - Schadensdienst: `spacecraft/spacecraft-damage.ts` (`SpacecraftDamage`) portiert STU `ApplyDamage`/`DamageWrapper`/`SystemDamage`: Schilde absorbieren über den Schildfaktor (Zusammenbruch schaltet das Schildsystem ab), Hüllenschaden über den Hüllenfaktor, Systemschaden je verlorenem Hüllensechstel bzw. anteilig, Krit über 50 % Hülle 30–60 % Systemschaden, darunter Chance auf Systemzerstörung, sonst 50–90 %. Wirkt auf die Laufzeitsysteme (`runtimeSystems.integrity`), wie die Subraumellipse. Für `tmw-K1b2` wiederverwendbar.
  - Sturmwirkung: `spacecraft/ion-storm-effects.ts` implementiert den Port `IonStormEffects` aus dem Anomaliemodul; `SpacecraftModule` registriert ihn beim Start (gleiches Muster wie `registerShipRewardGranter`, vermeidet einen Modulzyklus). Tick: Schiffe auf Sturmfeldern mit mehr als einem Restticks erhalten `ceil(rand(1–10, normalverteilt) × maxHull × Intensität / 10000)` mit Zielsystemen Deflektor/LSS/NBS/Impuls/Hyper, Stationen verlieren aktive Schilde, Urlaubsmodus ausgenommen; je Fahrzeug eine Meldung (Schiffs- bzw. Stationsordner). Einflug: Meldung, Crew-Erfahrung `ION_STORM_FLIGHT`, Antriebsausfall, Schaden bis 20 %; Meldungen auch im Flugergebnis. Hüllenfaktor über die höchste Hüllenmodul-Stufe (8 % je Stufe, 16 % bei `secret.ionStormDamageReduction` am Moduldatensatz – derzeit trägt kein SWU-Modul diese STU-Spezialfähigkeit), Schildstufe über das höchste Schildmodul (mindestens 1).
  - Zerstörung: `SpacecraftDestructionService.destroyInManager(…, 'ANOMALY')` in der Transaktion des Aufrufers, Rettungskapseln mit Grund `ANOMALY_DESTRUCTION`, Benachrichtigung nach Commit. `navigate`, `flyGalaxy`, Ankunft im Tick und Wurmlochpassage speichern bzw. laden ein zerstörtes Schiff nicht erneut (`isSpacecraftDestroyed`).
  - Antriebsausfall zeitbasiert: Cooldown als Zeitstempel `jetzt + skewed(0–3600 s, Mittel 600 s, Schiefe 2)`; `isCoolingDown` wertet Werte ab 1e12 als Epoch-ms-Frist und kleinere als Tickzähler; umgestellt in `validateActivation`, Antriebsaktivierung, Systemaustritt, `canLeaveSystem` und Wurmloch-Planer.
  - Prüfungen: `spacecraft-damage.spec.ts` (7), Cooldown- und `destroyInManager`-Tests, `ion-storm-effects.int-spec.ts` (4: Tick Schiff/Station/Urlaub, auslaufendes Feld, Einflug mit Schildabsorption und Antriebsausfall, Zerstörung beim Einflug); Mutationsprobe (Schildfaktor ohne Schildstufe) lässt den Einflugtest scheitern. Anomalie-, Wurmloch- und Bewegungs-Integrationssuiten 9/151 grün. `nx run-many -t lint typecheck build -p shared backend frontend` grün (Warnungen unverändert); Backend 2018/2018; Frontend 688/688.
  - Nicht übernommen: STU-Schildregenerations-Timer und RPG-Kampfunfähigkeit (in SWU nicht vorhanden).
  - Folgeissue: `tmw-K1a2` – die Flugfolgen-Pipeline läuft außer beim Wurmloch nur für das führende Schiff; Flottenmitglieder erhalten keinen Einflugschaden.
