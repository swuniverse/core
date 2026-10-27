# Alarmreaktion beim Einflug

**Status:** needs-info
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-COMBAT-2

## Ziel

Nach jeder tatsächlichen Feldbewegung prüft SWU alarmierte fremde Schiffe wie STU: Gelb reagiert nur auf Haltung „Feind“, Rot gegen alle außer Freunden. Die Basis funktioniert für Einzel- und Flottenbewegungen mit einem gemeinsamen Movement-Result samt Kampfbericht; Traktor- und Tarnsonderfälle werden später über jetzt definierte Erweiterungsports aktiviert.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Lib/Battle/AlertDetection/{AlertDetection,AlertedShipsDetection,SkipDetection,TrojanHorseNotifier,AlertReactionFacade}.php`
- `Module/Spacecraft/Lib/Battle/AlertLevelBasedReaction.php`
- `Module/Spacecraft/Lib/Movement/Component/Consequence/Flight/AlertStateConsequence.php`
- `Module/Spacecraft/Action/InterceptShip` (Alarmreaktion nach Abfangen)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`navigate`, `flyGalaxy`, `enterSystem`, `leaveSystem`, `processMovement`)
- `apps/backend/src/modules/spacecraft/hyperdrive-disruption.service.ts`
- `apps/backend/src/modules/combat/combat.service.ts` (Parteienkampf aus sc-WP-COMBAT-2)
- `apps/backend/src/modules/alliance/relationship-resolver.service.ts`, `CONTEXT.md` (Haltung)
- `packages/shared` (gemeinsames Movement-Result und Combat-Report)
- `apps/frontend/src/components/spacecraft/NavigationPanel.tsx`, `CombatReportDialog.tsx`

## Akzeptanzkriterien

- [ ] Ein gemeinsamer Movement-Consequence-Pfad läuft nach jeder tatsächlichen Feldkoordinaten-Transition für Einzel- und Flottenbewegung, insbesondere Systemflug, feldweisen Galaxieflug, Systemeintritt/-austritt und Abfangen. Befehle ohne Feldwechsel lösen keine Alarmprüfung aus; künftige Langstreckensprünge nutzen denselben Ankunftspfad.
- [ ] Mehrfeldbewegung wird feldweise verarbeitet, sodass ein Alarmkampf auf einem Zwischenfeld stoppt; bereits erreichter Teilfortschritt wird nicht zurückgerollt.
- [ ] Gelb reagiert nur auf Resolver-Haltung `ENEMY`, Rot auf jede Haltung außer `FRIEND`. Eigene Schiffe sowie beide Seiten im effektiven Urlaubsmodus sind ausgeschlossen; es gibt keine lokale Fraktions-/Allianz-/Kontaktlogik.
- [ ] Bei mehreren berechtigten fremden Eignern werden Kandidaten deterministisch geordnet und höchstens ein Eigner beginnt pro Feldtransition einen Kampf. Die alarmierte Flotte ist Angreifer, der Einflieger bzw. seine Flotte Verteidiger; jede Alarmreaktion beendet die laufende Bewegungsanfrage.
- [ ] Ein interner Battle-Resolver teilt Parteienbildung, Engine, Zerstörung, Meldungen und Statistik mit manuellen Angriffen, ohne die Autorisierung des fremden Alarmspielers zu simulieren.
- [ ] Alle Bewegungsendpunkte liefern ein gemeinsames Ergebnis mit Teilfortschritt, Stopgrund (`ARRIVED`, `ALERT_COMBAT`, `DESTROYED`), optionalem gemeinsamem Kampfbericht sowie bewegten und zerstörten Flottenschiffen. Zerstörte Schiffe fliegen nicht weiter; Überlebende bleiben auf dem erreichten Feld.
- [ ] Ein Traktor-Kontextport ist vorhanden; Freundunterdrückung und Trojanisches-Pferd-Hinweis werden erst mit sc-WP-TRACT-1a aktiviert und dort getestet. Ein Sichtbarkeitsport ist vorhanden; Tarnunterdrückung wird erst mit sc-WP-CLOAK-1a aktiviert und dort getestet. Beide sind keine Blocker der Basis.
- [ ] Backend-Tests decken Grün/Gelb/Rot × Friend/Neutral/Enemy, persönlichen Feind derselben Fraktion, effektiven Urlaub, deterministische Mehrbesitzer-Auswahl, Zwischenfeld-Stopp, Ein-/Austritt, Flottenverlust und Ergebnisbericht ab. Frontend-Tests öffnen auf allen betroffenen Bewegungsflächen den bestehenden `CombatReportDialog`.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Die Basis-Alarmreaktion wird jetzt vollständig für alle realen Feldtransitionen umgesetzt. Gelb greift nur `ENEMY` an, Rot alles außer `FRIEND`; effektiver Urlaub schützt beide Seiten. Pro Transition gibt es deterministisch höchstens einen Alarmkampf, danach endet die Bewegung mit Teilfortschritt und Bericht. Traktor und Tarnung sind nur spätere Verbraucher der neuen Kontextports und keine Abhängigkeiten.

## Comments

- 2026-10-22 Blocker: Die Akzeptanzkriterien verlangen Alarmreaktion nach jedem Feldwechsel einschließlich Flottenflug, Hyperraumankunft, Traktor-Trojanerhinweis und getarnten Einfliegern. Die dafür vorausgesetzten Mechaniken sc-WP-TRACT-1a und sc-WP-CLOAK-1a sind noch nicht umgesetzt; zugleich liefert die bestehende Navigations-API nur ein `Spacecraft` und hat keinen Vertrag für einen Kampfbericht. Bitte entscheiden, ob dieses Issue bis zu diesen Abhängigkeiten blockiert werden soll oder ob ein Teilscope mit neuem Movement-Result-DTO zulässig ist.

- 2026-10-21 Hinweis aus soc-B1b (Option b): Ein persönlicher Feind-Kontakt ergibt Haltung „Feind“ auch innerhalb derselben Fraktion. Die Alarmreaktion liest die Haltung ausschließlich über den Relationship-Resolver und braucht dafür keine Sonderlogik.
- 2026-10-27 Product Owner: Basis jetzt mit gemeinsamem Movement-Result und Kampfbericht umsetzen. Traktor und Tarnung werden später über Erweiterungsports aktiviert; Gelb/Rot, beidseitiger Urlaubsschutz und höchstens ein deterministischer Kampf je Transition gelten verbindlich.
- 2026-10-27 Agent: Umsetzung nach zwei ernsthaften Ansätzen ohne Produktcode beendet. Der Scope ist nicht M: `navigate` und `flyGalaxy` bewegen Flotten heute atomar direkt ans Endfeld und berechnen/verbrauchen Energie für die Gesamtdistanz; eine korrekte feldweise Pipeline mit Teilfortschritt muss zugleich Energie, Signaturen, Kartographie, Statistik, Zerstörung und Flottenverluste pro Schritt neu ordnen. Zusätzlich erzeugt die geforderte gemeinsame Alarm-Battle-Resolution eine zirkuläre Modulabhängigkeit (`CombatModule -> SpacecraftModule`, künftig auch umgekehrt). Bitte entweder (a) das Issue in Movement-Pipeline/DTO, internen Battle-Resolver und Alarm-Integration/UI aufteilen oder (b) Size L zulassen und eine Zielarchitektur für die Combat/Spacecraft-Abhängigkeit festlegen.
