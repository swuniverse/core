# Hypermaterie-Reservekern als Hochkapazitätsreaktor

**Status:** resolved
**Priority:** P3
**Size:** M
**Blocked by:** col-A2, sc-WP-ENG-5

## Ziel

STUs Singularitätsreaktor als Hypermaterie-Reservekern in die bestehenden SWU-Reaktor-, Fertigungs-, Werft-, Schadens- und Reparaturpfade integrieren. Die Nutzerentscheidung zur STU-Parität ersetzt die historischen Vorschläge zu frei gewählten Bau-/Leistungswerten.

## Verbindlicher STU-Abgleich

Lokale Referenz `../../st-universe/core`, Commit `f8c8dda33`; PHP-Pfade relativ zu `src/`.

- `Component/Spacecraft/System/Type/SingularityShipSystem.php`: MODE_ALWAYS_ON, 0 EPS Aktivierung/Betrieb; Kernzerstörung stellt einen vorhandenen WARPDRIVE auf OFF. Reparatur des Kerns startet den Antrieb nicht mit.
- `Component/Spacecraft/System/Data/SingularityCoreSystemData.php`, `Module/Spacecraft/Lib/ReactorWrapperInterface.php`: Kapazität = 20 × theoretische Ausgangsleistung; ein Paket von 85 Ladung kostet 2 Dilithium, 3 Antimaterie, 2 Plasma. Vorhandene SWU-Zuordnung: 2 Kyber-Kristalle (8), 3 Antimaterie (6), 2 Plasma (7).
- `Component/Spacecraft/System/Data/AbstractReactorSystemData.php`: aktuelle Leistung = ceil(theoretische Leistung × Systemintegrität / 100). Kapazität bleibt unabhängig von Schaden; Ladung begrenzt die tatsächlich nutzbare Leistung.
- `Lib/ModuleRumpWrapper/ModuleRumpWrapperReactor.php`, `Module/Spacecraft/Lib/ModuleValueCalculator.php`: Kernleistung basiert auf dem Rumpfreaktorwert; höheres Modullevel +30 %, gleiches +5 %, niedrigeres −6 % gemäß konkretem Kernmodul. Überzählige Ladung wird bei geringerer Kapazität begrenzt, es entsteht keine Gratisladung.
- `dist/db/stu.dump`: `stu_modules` 10521–10526 liefern sechs echte Kernklassen, Level 1–6, Systemtyp 30, Crew 0/1/2/3/4/5 und Fertigungs-EPS 30/50/70/90/110/130. `stu_modules_cost` und `stu_modules_buildingfunction` liefern unveränderte Warenkosten und Fabrikfunktionen. Keine erfundenen Credits-, Basisleistungs- oder Bauzeitwerte.

## Star-Wars-Zuordnung und bestehende Leitplanken

Die ursprüngliche romulanische Technologie wird wie die Tarntechnik dem **Galaktischen Imperium** zugeordnet. Die Fertigung verwendet die sechs STU-Waren-IDs und vorhandene SWU-Antriebsmodul-Forschungsstufen. Bereits eingebaute Kerne bleiben nach Besitzer-/Fraktionswechsel nutzbar; die Fertigungsbindung ist keine neue Betriebs- oder Crew-Eigentumssperre.

Bestehende Standard-/Leichtreaktoren verwenden weiterhin ihre etablierte SWU-Leistungsberechnung. Dieser Auftrag führt die STU-Faktoren für den neuen Reservekern ein und baut die globale Statistik anderer Reaktorarten nicht um. Alternative Kerne werden nicht addiert; der explizite Profilkatalog ersetzt unscharfe Namenssuche. Bereits vorhandene Rümpfe ohne installiertes Reaktormodul behalten ihr dokumentiertes Standardprofil.

## Akzeptanzkriterien

- [x] Sechs tatsächliche Kernklassen mit Quellenzuordnung, Fertigung, vorhandenen Waren/Forschungen und Rumpf-/Modulfaktoren; keine frei erfundenen Bau- oder Leistungswerte.
- [x] Gemeinsames explizites Ladeprofil: 85 Ladung aus 2 Kyber-Kristallen, 3 Antimaterie, 2 Plasma; Kapazität 20 × theoretische Leistung. Defekt/Abschaltung wechseln die Rezeptur nicht.
- [x] Laden aus Schiff-/Kolonie-/Stationslager, Tickproduktion, Verteilung, Ladungstransfer und Demontagerecycling verwenden die bestehenden gemeinsamen Pfade. Keine zusätzliche Ladungsumrechnung bei unterschiedlichen Reaktoren.
- [x] Kern ist dauerhaft aktiv, einschließlich Standby; keine Aktivierungs- oder Betriebskosten neben tatsächlich erzeugter Energie. Schaden reduziert Leistung proportional, vollständiger Defekt erzeugt keine Energie und deaktiviert den Hyperantrieb.
- [x] Modul- und Laufzeitsystemschaden werden konsistent persistiert. Reparatur stellt nur den Kern wieder her; Hyperantrieb bleibt aus. Rechte-/Startbedingungen bleiben bestehen.
- [x] Werftbau und Retrofit liefern einen einzelnen Kern; Kapazitätswechsel begrenzen Überschuss ohne Gratisladung. Anzeige erklärt die Verlustregel vor dem Retrofit.
- [x] Shared-Energiefluss und Schiffansicht unterscheiden Kernart, Ladung/Kapazität, aktuelle/theoretische Leistung und Rezeptur.
- [x] PostgreSQL/HTTP prüfen Fertigungsbindung, Laden, Limits, Parallelität/Rollback, Stationsversorgung, echten Tick, Schaden/Reparatur, Werftbau, tatsächlichen Retrofit und Transfer; bestehende Unit-/Frontend-/Integrationsprüfungen und Pflicht-Gates bestehen.

## SWU-Anker

`reactor-fuel-profile.ts`, `SpacecraftStatsService`, `SpacecraftResourceFlowService`, `SpacecraftEngineeringService`, gemeinsames ShipManagement, bestehende Werft-/Demontagepfade, Kern-/Antriebsschaden und `ReserveReactor1794888000000`. Fertigungs-, Waren- und Modulwerte liegen im `game-data`-Submodul.

## Comments

- 2026-11-09: `needs-triage` bleibt: Für die Laderezeptur fehlen die konkreten SWU-Waren und deren Mengen pro Ladeeinheit. Leistung, Kapazität und Rezeptur sollen datengetrieben sein; die grüne technische Baseline legt diese Spieldaten nicht fest. Keine Waren oder Mengen vorwegnehmen.

- 2026-11-16 – Triage: Die bisher abstrakte Rezepturfrage ist mit vorhandenen SWU-Waren und exakten STU-Mengen vorbereitet. Bau-/Leistungswerte ebenfalls vorgeschlagen; noch keine Spieldatenentscheidung, daher needs-info. Siehe [Audit](../triage-2026-11-16.md).

- 2026-11-17 – Nutzer bestätigt STU-Abgleich und anschließende Umsetzung. Tatsächliche STU-Werte und vorhandene Warenzuordnung sind maßgeblich; frühere Bauwerte sind nur historische Vorschläge. Umsetzung beansprucht.

## Answer

Der Reservekern ist als alternative Reaktorart im expliziten Profilkatalog und in den bestehenden Laufzeitpfaden umgesetzt. Seine sechs STU-Klassen 10521–10526 sind mit unveränderten Fertigungs-EPS, Warenkosten, Crew und Leistungsfaktoren im Spieldaten-Commit `f185012` enthalten. Die Fertigung gehört zum Galaktischen Imperium; Betrieb und Aufladung eines vorhandenen Kerns folgen weiterhin dem Schiffseigentum.

Kapazität basiert auf theoretischer Leistung und bleibt auch bei Schaden erhalten. Aktuelle Energieerzeugung wird proportional zur Integrität und durch vorhandene Ladung begrenzt. Standby lässt den gesunden Kern aktiv, manuelle Abschaltung wird abgewiesen. Modul-/Laufzeitsystemschaden und Reparatur werden über PostgreSQL konsistent verbunden. Vollständiger Ausfall schaltet den Hyperantrieb ab; eine Kernreparatur schaltet ihn nicht wieder ein.

Schiffsladen und Stations-/Kolonieversorgung verwenden das gemeinsame 85er-Profil; Ladungstransfer bleibt ohne Profilumrechnung. Recycling gewinnt nur vollständige verbleibende Pakete zurück, auch bei defektem Kern. Echte Werft- und Retrofit-Abschlüsse sind geprüft. Die bisherige Kapazitätsberechnung konnte beim Wechsel nie schrumpfen; sie wird nun exakt neu bestimmt, Überschuss begrenzt und keine fehlende Ladung kostenlos aufgefüllt. Die Retrofit-Anzeige erklärt den möglichen Ladungsverlust, das Reaktorpanel zeigt Profil, Rezeptur und beide Leistungswerte.

Die strengere Profilprüfung deckte eine falsch benannte Reaktor-Testfixture (`10501` hieß `Energieverteiler`) auf; sie verwendet jetzt den tatsächlichen Hypermaterie-Reaktor. Die Orbit-HTTP-Fixture initialisiert den nach Reset fehlenden Spielstatus vor Konkurrenzfällen, damit nur Flug und Orbitauftrag miteinander konkurrieren.

## Validation

- Vollständiger Backend-Unitlauf: **241 Suites, 2.346 Tests bestanden**. Nach der strengeren Profilprüfung/Fixturekorrektur: **8 Suites, 273 betroffene Tests bestanden**, einschließlich des zusätzlichen Tests gegen unbekannte Profile.
- Produktions-AppModule/HTTP/PostgreSQL: **6 Suites, 88 Tests bestanden** (`reserve-reactor|station-uplink|station-beam-blocker|station-scrapping|shipbuilding-workflow|colony-orbit-order-http`). Nach der HTTP-Fixturekorrektur **36 Tests bestanden**; finaler Reservekern-Nachlauf einschließlich Fraktionsbindung und Rumpf-/Modulfaktoren: **16 Tests bestanden**. Insgesamt **90 verschiedene PostgreSQL-Fälle** geprüft. Keine fachlichen Produktionsprovider ersetzt.
- Vollständiger Frontendlauf: **129 Dateien, 870 Tests bestanden**. Finaler Reaktor-/Werft-Nachlauf: **2 Dateien, 13 Tests bestanden**.
- Lint und Typecheck für alle vier Projekte sowie abschließende betroffene Prüfung erfolgreich; bestehende Warnungen bleiben.
- Alle drei Builds und erzwungene abschließende Backend-Deklarationserzeugung erfolgreich.
- `ReserveReactor1794888000000` in der lokalen Dev-Datenbank erfolgreich ausgeführt und committed, ohne Datenbankreset. `git diff --check` in Core und Spieldaten erfolgreich.

## Historische Triage – durch den STU-Abgleich ersetzt

## Triage und konkrete Entscheidungsgrundlage

Der gemeinsame Ladepfad und die Statistikberechnung nutzen schon `reactor-fuel-profile.ts`, `SpacecraftEngineeringService`, `SpacecraftStatsService` und `SpacecraftResourceFlowService`. Es gibt nur LIGHT_HYPERMATTER und HYPERMATTER; ein Reservekern-Profil/-Modul samt Reaktorausfallkopplung fehlt.

STU `ReactorWrapperInterface` ist eindeutig: Singularitätskernkapazität = theoretische Ausgangsleistung × 20; eine Ladeeinheit erzeugt 85 Ladung aus 2 Dilithium, 3 Antimaterie, 2 Plasma. Standardkern: Kapazität × 15, 30 Ladung aus 1 Dilithium, 2 Antimaterie, 2 Deuterium. Die vorhandene SWU-Warenzuordnung liefert bereits Kyber-Kristalle (8), Antimaterie (6), Plasma (7) und Hypermaterie (5); keine neue Ware nötig.

## Offene Frage

Soll der Reservekern mit der vorhandenen Warenzuordnung und der unveränderten STU-Laderezeptur kommen, und welche Bauwerte bekommt das neue Modul?

**Empfehlung zur Freigabe:** 85 Ladung pro Einheit aus **2 Kyber-Kristallen (8), 3 Antimaterie (6), 2 Plasma (7)**; Kapazität **20 × theoretische Reaktorleistung**, Leistungskalierung wie Standard-Hypermaterie-Reaktor (Basisleistung 20, vorhandene Level-/Rumpfformel). Höhere Kapazität, kein zusätzlicher pauschaler Leistungsbonus. Neues alternatives Modul für beide Fraktionen, maxLevel 10, Forschung Reaktortechnik I; Baukosten wie bestehender Allianz-Hypermaterie-Reaktor: 8.000 Credits, 400 Durastahl, 50 Kyber-Kristalle, 120 Tibanna-Gas, 10 Beskar, 260 kristallines Silizium, 140 Energiemodule, Bauzeit 110, Basiscrew 2. Das ist ein prüfbarer Vorschlag und wird erst nach Entscheidung als Spieldatum übernommen.

## Vorbereiteter Restauftrag nach Freigabe

- Explizites datengetriebenes Profil statt stiller Namens-/Standardfallbacks; eindeutige Wahl eines aktiven Reaktormoduls. Keine gleichzeitige Summierung alternativer Reaktoren.
- Laden aus Schiff-/Kolonielager, Tickproduktion, Verteilung, Reaktorladungstransfer, Demontagerecycling und alle Anzeigen nutzen dasselbe Profil. Fremde Ladeprofile erhalten beim Transfer keine neu erfundene Energieumrechnung.
- Einbau/Ausbau/Retrofit aktualisiert Leistung und Kapazität ohne neue Gratisladung; Überschuss beim Kapazitätswechsel nach vorhandener Modulwechselregel begrenzen und anzeigen.
- Zerstörung des Kerns schaltet den vorhandenen Hyperantrieb aus; Reparatur startet ihn nicht automatisch. Bestehende Startbedingungen bleiben maßgeblich.
- Tests: Rezeptur/Bestandslimit, genau 85 Ladung, Kapazitätsgrenze, Leistung/Verteilung, Transfer, Modulwechsel, Recycling, Defekt/Reparatur, Rollback und UI-Unterscheidung.
