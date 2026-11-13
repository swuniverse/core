# STU-Parität – Gesamtbacklog

## Destination

SWU bietet alle spielerseitigen Funktionen und die UI/UX-Informationsdichte von STU (Referenz `../../st-universe/core`, `../../st-universe/assets`) im SWU-Techstack (NestJS, React/Zustand, `packages/shared`). Abgearbeitet wird das Backlog unter `issues/` durch die Ralph-Schleife (`PROMPT.md`, `ralph.sh`).

## Quellen

- Inventuren (Ist-Stand und Lücken je Bereich, Stand 2026-10-21): `inventory/{shell-admin-runtime,colony,spacecraft,trade-map-world,social}.md`
- Globale UI-Konventionen: `inventory/shell-admin-runtime.md`, Abschnitt 3 – verbindlich für alle UI-Issues.
- Verbindlich vor STU: `CONTEXT.md`, `docs/adr/*`, bestehende Specs unter `.scratch/*/spec.md`.

## Leitplanken (Entscheidungen des Product Owners, 2026-10-21)

1. **Abweichungen einzeln entscheiden.** Wo SWU heute ohne ADR von STU abweicht (z. B. Forschungsqueue, Reparatur-Vorabzahlung, Fertigungskosten), wird nichts eigenmächtig umgebaut oder festgeschrieben. Solche Issues stehen auf `needs-info` mit konkreter Frage; der Product Owner antwortet unter `## Comments` und setzt `ready-for-agent`.
2. **Star-Trek-Inhalte → Star-Wars-Äquivalent durch den Agenten.** Ferengi, Kazon, Award-Katalog, Stationsrollen/-namen, Tarnberechtigung u. ä.: Der umsetzende Agent wählt ein passendes, kanonnahes Star-Wars-Äquivalent, hält es unter „Entscheidungen“ in dieser Datei fest und bleibt danach konsistent. Inhaltlich Heikles (Orion-Sklavenhandel) entfällt.
3. **Scope:** Handel, Stationen, RPG (Charaktere, Plots), Awards und Tutorial sind **im Scope**. **Nicht im Scope:** Piraten-KI, Quests. NPC-Konten werden nur so weit gebaut, wie Handel (NPC-Handelsposten, NPC-Händler) sie braucht.
4. **Betrieb/Recht hinter Flag.** E-Mail-Versand an Spieler, E-Mail-Verifikation, Konto- und Inaktivitätslöschung, Massenmails sowie Impressum und Datenschutz werden vollständig gebaut, aber hinter Konfiguration bzw. Feature-Flag, **standardmäßig aus**. Rechtstexte erhalten klar markierte Platzhalter.
5. Maßstab ist funktionale Spielerparität plus STU-typische Informationsdichte, nicht Quellcodeparität. Bekannte STU-Bugs und Sicherheitslücken werden nicht übernommen.

## Issue-Konventionen

- Datei: `issues/<ID>-<slug>.md`. Die ID ist bereichspräfixiert und stabil: `sh-` (Rahmen/Admin/Laufzeit), `col-` (Kolonie/Forschung/Waren), `sc-` (Schiffe/Stationen), `tmw-` (Handel/Karte/Datenbank/Welt), `soc-` (Kommunikation/Soziales). Beispiel: `col-A1-queues-reagieren-auf-gebaeudestatus.md`.
- Kopfzeilen (exakt so):
  ```
  **Status:** ready-for-agent | needs-info | needs-triage | claimed | resolved | wontfix | ready-for-human
  **Priority:** P1 | P2 | P3
  **Size:** S | M
  **Blocked by:** <ID>, <ID> | —
  ```
- `Blocked by` nennt IDs. Ein Issue ist unblockiert, wenn jede genannte ID `resolved` oder `wontfix` ist.
- Body: Ziel, STU-Quellen, betroffene SWU-Pfade, Akzeptanzkriterien als Checkliste (inkl. Tests), bei `needs-info` ein Abschnitt `## Offene Frage`.

## Duplikate (kanonischer Eigentümer)

| Thema | kanonisch | entfällt |
|---|---|---|
| Passwort-Reset | sh-AP-01 | soc-H3 |
| Kontolöschung | sh-AP-05a/b | soc-H4 |
| Gespeicherte Einstellungen wirksam (inkl. Lagermeldung) | sh-AP-16 | soc-F2, col-B2 |
| Warenübersicht Datenbank | tmw-D1 | col-F1 |
| Flugsignaturen / Sektor-Scan-Signaturen | sc-WP-NAV-2 | tmw-K9, col-G2 |
| Feldkosten/-schaden/-effekte beim Flug | tmw-K1, K2, K3 | sc-WP-NAV-1 |
| Anomalien, Ionensturm | tmw-K10a/b/c | sc-WP-SENS-3 |
| Wurmloch-Flug | tmw-K7 | sc-WP-NAV-4 |
| Regionsinfo am Feld | tmw-K8a | Regionsteil von sc-WP-UI-4 |
| Verschollene Crew / Rettungskapseln | sc-WP-CREW-3 | col-G4 |
| Fehlende Prestigequellen, History-Erzeuger je Bereich | im jeweiligen Fachissue | soc-G3, soc-H2 |
| Quests | – (out of scope) | soc-E5, tmw-W3, tmw-W4 |
| Piraten | – (out of scope) | tmw-W5 … W9 |

## Entscheidungen

<!-- Ralph und der Product Owner ergänzen hier: Datum – Issue-ID – Entscheidung -->

- 2026-11-13 – tmw-T7a – Basishandel: Ein Kauf geht mit dem Kauf-Modifier −10 in die Kursformel ein; der STU-Code (`$summand = 1`) wird als Fehler nicht übernommen.

- 2026-10-30 – tmw-K2 – Sieben aktive Feldeffekte laufen über die zentrale Einflug-/Tick-Pipeline; NBS-Ausfall nutzt einen eigenen persistenten Wall-Clock-Cooldown, Meldungen gehen in Schiffsordner und Live-Meldungsleiste.

- 2026-10-21 – col-A2 – Option b: Modul-/Torpedofertigung nach STU (EPS je Stück, Kürzung, Aufstocken, Teilabbruch 100 %, Fertigstellung im Tick, Torpedos sofort)
- 2026-10-21 – col-A3b – Option b: Werft mit Rumpf-EPS-Kosten und einem Auftrag je Werftfunktion
- 2026-10-21 – col-A5 – Option b: Werftreparatur passiv in Schritten mit Ersatzteilverbrauch und Slots; Vorabzahlung entfällt
- 2026-10-21 – col-D5 – Option a: SWU-Forschungsqueue (10 Slots, Auto-Pfad, Fortschritt bleibt) bleibt; ADR, kein Umbau
- 2026-10-21 – col-E1b – Option b: Kolonielimits aus Forschungsdaten wie STU; fester Deckel 3/3/1 entfällt
- 2026-10-21 – sc-WP-CLEAN-1 – Option a: freie Modul-Endpunkte ersatzlos entfernen
- 2026-10-21 – sc-WP-CREW-2 – Option a: STU-Expertisemodell vollständig (Skills, 10 Ränge mit SW-Namen, Beförderungslimits)
- 2026-10-21 – sc-WP-ENG-3b – Option a: passive 1-%-Modulreparatur entfällt; Reparatur nur Werft, Station, Eigenreparatur
- 2026-10-21 – sc-WP-NAV-3 – Option b: kein zeitbasierter Hyperraumsprung; feldweiser STU-Galaxieflug, Langstreckensprung nur über sc-WP-NAV-5b; ADR + Rückbau-Folgeissue
- 2026-10-30 – sc-WP-NAV-5b – `Hyperraum-Spule`/`Navicomputer-Sprung` zu jeder passierbaren Koordinate einer bekannten Ebene; atomarer Sprung der gesamten nicht fixierten Flotte, eigene Spule/aktiver Hyperantrieb/55 EPS je Schiff, 300 s Cooldown, keine Hyperantriebspunkte oder Routenpflicht; ungültiges Mitglied lehnt alles ab
- 2026-10-30 – sc-WP-NAV-5a – `Hyperantriebs-Notladegerät` als Einzel-Schiff-System: 100 EPS laden `round(max/3)` Hyperantriebspunkte bis zum Maximum, danach sofort inaktiv mit 24 h Cooldown; ausschließlich für normalen feldweisen Galaxieflug, ohne Wirkung auf den Navicomputer-Sprung

## Erledigt

- 2026-11-02 – sc-WP-SENS-1 – Bojen-Entity, Drop/Pick-up-API sowie Sektor-Scan- und Feldkontext-Daten ergänzt.
- 2026-11-02 – sc-WP-NAV-5a – Hyperantriebs-Notladegerät als datengetriebenes Spezialsystem mit Backend-Aktion, Cooldown und Schiffssteuerungsbutton umgesetzt.
- 2026-10-21 – sc-WP-TRACT-1b – Option a: Traktor auf jedes fremde ungeschildete Schiff unabhängig von der Haltung (außer Urlauber/NPC)
- 2026-10-21 – sc-WP-UI-3b – Option a: Kolonieangriff gezielt auf Gebäude/Feld wie STU AttackBuilding
- 2026-10-21 – sh-AP-02 – Option a: System-News als eigene Entität `news`, nur Admins, unabhängig vom HoloNet
- 2026-10-21 – sh-AP-04c – Option 1a, 2a: Urlaub pausiert Kolonie-Tick (Schiffe ohne Crewlimit-Folgen/passive Reparatur); 7-Tage-Sperre ab letzter Aktivierung
- 2026-10-21 – sh-AP-05d – Option a: Kolonien gelöschter Konten werden Ruinen (Pfad giveUpColony)
- 2026-10-21 – sh-AP-07c – Option a: Tick-Zeitzone Default Europe/Berlin
- 2026-10-21 – sh-AP-20 – Option a: Spielstatus TICK sperrt schreibende Spieleraktionen (503) während des Hauptticks
- 2026-10-21 – tmw-D3 – Option a + (i): Vielflieger-Rangliste aus Flugsignaturen; tägliche Prestigebelohnung Top 10 wie STU (20…1)
- 2026-10-21 – tmw-D4 – Option b: Regionseintrag nur durch Abschluss der Regionskartographie (tmw-K8b)
- 2026-10-21 – tmw-FA1b – Option 1c, 2a: nur `isSelectable` (Admin), keine Spielerlimits; Multiplikatoren wirksam (außer tradeModifier, siehe tmw-T13)
- 2026-10-21 – tmw-K1b – Option 1a, 2a: Grund- plus Feldtyp-Kosten je Feld; eigenes System DEFLECTOR; Feldfolgen je durchflogenem Feld (folgt sc-WP-NAV-3)
- 2026-10-21 – tmw-K5 – Option 1a, 2a: Ebenen bekannt wie STU; Kartenzyklus wie STU (EXPLORED, Nebel-Einträge gelöscht, Award-Ereignis); ADR
- 2026-10-21 – tmw-K7b – Option b: Wurmloch-Regeln verwaltet der Stationsbetreiber am Eingang (blockiert durch sc-WP-STAT-2)
- 2026-10-21 – tmw-K8b – Option a: Regionskartographie mit Folge-ADR zu 0003; einzige Quelle der Regionsentdeckung
- 2026-10-21 – tmw-T13 – Option 1a, 2b: Handelsabkommen = kostenlose Lizenz am Spielerposten des Partners; tradeModifier entfernt
- 2026-10-21 – tmw-T3 – Option a: Kontotransfer per Feld-Kopräsenz, kein Docking
- 2026-10-21 – tmw-T7b – Option a: Basishandel mit Doonium, Transparistahl, Durastahl-Legierung zu STU-Startwerten in beiden Netzen
- 2026-10-21 – col-A6 – Option b1: Demontage mit STU-Rückgabe (Module, Reaktorladung, Torpedos); Werftpflicht bleibt als SWU-Regel
- 2026-10-21 – col-A8 – Option a: STU-Komponentensatz 1:1; `Ersatzteil` wird zum **Instandhaltungsset**, `Systemkomponente` zur **Schiffssystem-Baugruppe**; Commodity-IDs 10001/10002 und STU-Kosten bleiben erhalten
- 2026-10-21 – col-A9 – Option b: Jägerwerft baut Rümpfe ins Lager, Start über Hangar
- 2026-10-21 – col-E2 – Option a: Ruinenmodell der Kolonieabgabe bleibt; ADR, kein Umbau
- 2026-10-21 – col-G1b – Option a: Teleskop-Scan zeigt momentan Schiffe je Rumpfkategorie, ohne Speicherung; Nachtrag ADR-0002
- 2026-10-30 – col-G1a – Teleskop-Zielkarte zeigt ausschließlich persönliche dauerhafte Felderkundung über den bestehenden `UNKNOWN`/`TERRAIN`/`FULL`-Redaktionsvertrag; keine aktuelle Sensorabdeckung, Kontakte, Schiffe, Allianz-Livepositionen oder dynamischen Overlays
- 2026-10-21 – col-G3a – Option a: Kolonie-Sandbox vollständig, Höchstzahl 3 je Spieler (Vorschlag übernommen, konfigurierbar)
- 2026-10-21 – col-G3b – folgt col-G3a (Option a): umsetzen
- 2026-10-21 – col-G3c – folgt col-G3a (Option a): umsetzen
- 2026-10-21 – sc-WP-CREW-4a – Option a: Entern wie STU gegen jedes fremde ungeschildete Schiff, auch in der eigenen Fraktion
- 2026-10-21 – sc-WP-CREW-4b – Option a: Übernahme unbemannter Schiffe wie STU gegen jeden Spieler
- 2026-10-21 – sc-WP-RES-1 – Option a: Ressourcensammeln (Tibanna-Gas aus Nebeln, Erze aus Asteroiden) per Spezialsystem
- 2026-10-30 – sc-WP-SENS-1 – Sondenbojen folgen vollständig STU: Ware ID 88/Forschung 500400, gesunde Torpedorampe, 1 EPS und eine Ware beim Setzen, Limit 16 und Text 1–60; jedes Schiff am Feld darf für 1 EPS bergen und erhält die Ware zurück, Fremdbergung benachrichtigt den Eigner; datengetriebenes Fertigungsrezept
- 2026-10-30 – sc-WP-SENS-2a – STU-Zwei-System-Modell: 19007 `Hyperraumfeldscanner` aktiv für Subraumspuren (30 EPS Aktivierung, 15 EPS/Tick, nicht während Tarnung), 19008 `Matrixsensoren` getrennt passiv; gezielte Analyse benötigt beide gesund/aktiv gemäß Rolle und kostet 100 EPS
- 2026-11-02 – sc-WP-SENS-2b – Der STU-Tracker heißt in SWU `Peilsender`: 15 EPS Aktivierung, 7 EPS je Tick und maximal 70 Ticks; Markierung benötigt aktive intakte Kurz- und Langstreckensensoren und die STU-Interaktionsregeln.
- 2026-10-21 – sc-WP-SHUT-1 – Option a: Shuttles als startbare Schiffe (gemeinsame Mechanik mit Workbees)
- 2026-10-21 – sh-AP-13b – Option a: In-Universe-Jahr „n NSY“ (reales Jahr − 2023) für Spielereignisse
- 2026-10-21 – soc-A7 – Option a: eigene Nachrichtenordner als zweite Ebene nur für persönliche Nachrichten
- 2026-10-21 – soc-B1b – Option b: persönlicher Feind-Kontakt = Haltung Feind auch in derselben Fraktion; CONTEXT.md anpassen
- 2026-10-21 – soc-B3 – Option a: einseitige Kontaktfreigaben „Als Freund behandeln“ und „Live-Position teilen“
- 2026-10-21 – soc-C1b – Option a: Ignorieren nur für PMs wie STU (erledigt mit soc-C1a); wontfix
- 2026-10-21 – soc-F1b – Option a: Profilbesucher mit 7 Tagen Aufbewahrung und Opt-out
- 2026-10-21 – soc-F3a – Option a: öffentliche Online-Liste mit Opt-out `show_online_status`; CONTEXT.md anpassen
- 2026-10-21 – soc-F3b – Option a: zwei bis drei wählbare Farbschemata als Token-Overrides
- 2026-10-21 – soc-F5 – Option a: Notizsammlung, bisheriger Zettel wird erste Notiz
- 2026-10-21 – soc-H1 – Option a: Diplomatie-Ereignisse zusätzlich als ALLIANCE in globaler History
- 2026-10-21 – soc-I1b – Option a: externe https-Bilder (png/jpg/webp, no-referrer, lazy) in Profil und HoloNet
- 2026-10-21 – soc-I1c – Option a: BBCode [color]/[b]/[i] in Spielernamen
- 2026-10-22 – sc-WP-STAT-0 – Stationen sind unbewegliche `Spacecraft` mit Diskriminator; kanonische Rollen: Konstrukt, Versorgungsdepot, Logistikzentrum, Raumwerft, Sensorphalanx, Außenposten und Raumstation; Dock-Zugänge folgen Verbot-vor-Erlaubnis und den Allianz-Integrationsverträgen

- 2026-10-22 – tmw-W1 – Hutten-Kartell betreibt Deals, Auktionen, Lotterie und den „Hutten-Handelsposten“; Imperiales Versorgungsamt und Nachschubkommando der Rebellenallianz betreiben die fraktionseigenen Basishandelsnetze
- 2026-10-22 – soc-G1 – SWU-Awardkatalog: Forschungs- und Datenbankmeilensteine, Ebenenerkundung, Hutten-Lotterie, Rollenspiel/Gemeinschaft sowie positive und negative Auszeichnungen von Rebellen-Oberkommando, Imperialem Oberkommando und Hutten-Kartell; bis zu eigenen Grafiken dient das Favicon als klarer Platzhalter

- 2026-10-23 – sc-WP-ENG-2 – In 2a–2e geteilt: reine injektionsfreie Policy plus dünner NestJS-Kontextloader; Ergebnis `{ allowed, reason }`; bestehende deutsche Meldungen bleiben erhalten
- 2026-10-23 – tmw-T1 – In T1a–T1d geteilt: Netze 1/2/3, Level 1, Lager 10000, Transfer 200, deterministische kanonische Standortwahl; unbekannte Posten sichtbar mit `location: null`; Lizenzen in T2 (Alpha: 10 Aurodium/30 Tage)
- 2026-10-23 – tmw-D0a/b – Karte und Datenbank-Systemdetail bleiben getrennte Kontexte; Crew-XP gehört CREW-2; anderes geeignetes eigenes Schiff darf MEASURED mit erneut 15 EPS fortsetzen
- 2026-10-23 – sh-AP-14a/b – Neutrale MIT-STU-Icons plus Star-Wars-neutrale Motive (Holoterminal, verbundene Flotten, Kontrollterminal, Karteneditor und Mehr) sind im Asset-Commit `5c7b0e7c31` veröffentlicht; 14a ist erledigt, 14b bleibt die getrennte Core-Navigation
- 2026-10-27 – col-A2 – Autoritative STU-Funktionsmodifikatoren auf SWU-IDs 10–18 abbilden; Legacy-Mengen ohne rückwirkende EPS-Belastung oder -Erstattung übernehmen, Aufstockungen zahlen neue EPS
- 2026-10-27 – col-A3b – Die UI-gewählte Werftfunktion am BUILD-/RETROFIT-Auftrag persistieren; Legacy-Aufträge bleiben ungebunden und nicht blockierend, EPS folgen `stuRumpId`, REPAIR belegt keinen Slot
- 2026-10-27 – col-D2a – Datengetriebenen idempotenten Reward-Ship-Mechanismus umsetzen, aber ohne bestätigte Tabelle keine produktiven Mappings oder abgeleiteten Belohnungen anlegen
- 2026-10-30 – col-D2a – In col-D2a1 bis col-D2a4 geteilt: Datenvertrag/UI, Grant-Persistenz, transaktionaler Schiff-Spawn und Abschlussintegration; Parent dient als abgeschlossener Tracking-Split
- 2026-10-30 – col-D2b – STU-Produktionsdump ist autoritative Quelle für Research→Datenbankeintrag; nur eindeutig auf bestehende SWU-Kategorien/stabile Schlüssel abbildbare Einträge werden importiert, rohe STU-IDs nicht persistiert; Unmappbares wird berichtet und ausgelassen, neue Kategorien folgen separat
- 2026-10-30 – col-D2c – STU-Produktionsdump ist autoritative Quelle für Forschungs-Awards/Gates; IDs 1/15 werden auf `RESEARCH_STATIONS`/`RESEARCH_INTERSTELLAR` gemappt, unbekannte IDs berichtet/ausgelassen; leere Dump-Zuordnung bleibt leer, keine kuratierten Fallbacks ohne Folgeentscheidung
- 2026-10-30 – sh-AP-05a – Als M-Issue vollständig freigegeben; separater einmaliger `ACCOUNT_DELETION`-Token mit 48 Stunden Laufzeit, unabhängig von Passwort-Reset; Marke 1 bleibt widerrufbar und loginfähig, Marke 2 sperrt Login und Refresh
- 2026-10-30 – tmw-T2 – In T2a–T2d geteilt: Datenmodell/Presence-Policy, transaktionaler Kauf, Verlängerung/Ablauf und Frontend; Alpha-Default 10 Aurodium/30 Tage, NPC-Zahlungen gehen an das NPC-Konto, Verlängerung ab `max(jetzt, Ablauf)`, Warnung einmalig sieben Tage vorher
- 2026-10-30 – sc-WP-STAT-3a – Atomare Flottenaktionen statt STU-Teilergebnissen; Andocken/Abdocken kostet 1 Schiffs-EPS, alle Mitglieder werden vorab transaktional validiert, Flug dockt nur mit verfügbarer zusätzlicher EPS automatisch ab
- 2026-10-30 – tmw-D2 – Kanonischer Aurodium-Key ist Commodity-ID 50; Ranking „Die 10 Günstlinge der Hutten“ zählt zunächst Kolonielager und Schiffsfracht, nicht ID 51, Handelskonten folgen über tmw-T11a
- 2026-10-30 – tmw-K5 – In K5a–K5e geteilt: Ebenenstatus/Backfill, Zugriff/Filter, Bekanntwerden, Kartenzyklus/Ereignis und Darstellung/ADR; eigene Schiffsankunft gewährt sofort `KNOWN`, der tägliche Zyklus setzt nach allen vorhandenen Feldern atomar `EXPLORED`, löscht Ebenennebel und emittiert genau einmal, ohne Systementdeckung zu verändern
- 2026-10-30 – col-E1a/col-E1b – Frontend-Typecheck-Baseline in `sh-AP-21` ausgelagert; bis zur Reparatur dürfen fachlich unabhängige Issues bei grünen fokussierten Tests und Builds sowie ohne neue Typecheck-Fehler gegenüber der dokumentierten Baseline abgeschlossen werden
- 2026-10-30 – tmw-FA1b – In FA1b1–FA1b4 geteilt: Wählbarkeit, dynamische Schiffsmultiplikatoren, Forschung und Koloniewachstum; Schiffsbasiswerte bleiben persistiert, effektive Hull-/Schild-/Frachtwerte folgen stets der aktuellen Eigentümerfraktion, Handel bleibt ausgeschlossen
- 2026-10-30 – tmw-K10a – Explizite `anomalyMass` je Schiffsklasse, für gemappte Rümpfe aus STU `tractor_mass`; STU-Score mit Schwelle 33.333.333, 1-Tick-Lebensdauer und 5 % plus 1 % je Million Überschuss; injizierbarer RNG für Chance und 1–50 Schaden, ohne STU-Off-by-one
- 2026-10-30 – tmw-K1b – In K1b1–K1b3 geteilt: geordneter Feldtransition-/Routenexecutor, Deflektor/Feldschaden und autoritative Warnung; Mehrfeldziele werden als echte Schritte mit Grund-EPS und Konsequenzen je Feld verarbeitet, NAV-3b entfernt nur Zeitflug, Traktorverhalten folgt in sc-WP-TRACT-1a
- 2026-10-30 – tmw-K3a – Aktive STU-LSS-Blockade in System und Galaxie: Blockadefeld und verdeckte Sensorinhalte werden serverseitig redigiert; LSS-Störung liefert nur Eigenfeld, Signaturunterdrückung überträgt keine Zahl und zweifelhafte Signatur nur `DUBIOUS`
- 2026-10-30 – tmw-K2 – Aktuelle STU-Handlersemantik ist autoritativ: Lecks/Tarnung/NBS nur beim Einflug, Schildstörung und Regeneration zusätzlich je Tick; Reaktor nutzt `reactorFuel`, Warpleck feste 10 %, sonst injizierbarer RNG; NBS-Cooldown als Wall-Clock-Zeitstempel 10–20 Minuten, echte Schiffsordner-/Live-Meldungen
- 2026-10-30 – tmw-K7a – Wurmlochpassage ohne Flug-EPS oder Warpdrive; Eintritt benötigt pro Schiff funktionsfähigen Sublight-Antrieb und nur bei dessen Aktivierung eigene Aktivierungs-EPS, Austritt ist ressourcenfrei; Flotten atomar, zufälliger Ausgang über injizierbaren RNG
- 2026-10-30 – sc-WP-ENG-2c – Fachfremde rote Backend-Testfixture zuerst separat in `sh-AP-23` beheben, ohne produktive Profilbesuchersemantik zu optionalisieren; danach Policy-Integration ohne Baseline-Ausnahme freigeben, transferspezifische Versorgungsausnahmen bleiben erhalten
- 2026-10-30 – tmw-K8b – In K8b1–K8b3 geteilt: gemeinsames Zielmodell/Regionsentdeckung, produktiver Regionslebenszyklus und Frontend/ADR; Regionsentdeckung nur durch Abschluss, höchstens fünf geeignete Messpunkte statt STU-25-%-Route; tmw-D4 hängt nur von K8b2 ab
- 2026-10-30 – tmw-D5 – Systemkategorie je Ebene zählt ausschließlich explizit katalogberechtigte `StarSystem`-Einträge; bestehende produktive Systeme werden berechtigt zurückgefüllt, versteckte/Test-/Admin-Experimentsysteme können ausgeschlossen werden; Regions-Awards folgen erst nach K8b2/D4 und blockieren die erste Umsetzung nicht
- 2026-10-27 – sc-WP-CREW-2 – Expertise-/Rangfundament jetzt vollständig umsetzen; obere Ranglimits 25/15/5/3, Rettungskapsel-Bergungs-XP später nicht blockierend über sc-WP-CREW-3b
- 2026-10-27 – sc-WP-CREW-3a – Dedizierte neutrale `EscapePod`-Entity mit individuellen Crew-Zuweisungen; Identität, Rang und Expertise bleiben erhalten, Landung nur für passende Crew bis zur Kapazität
- 2026-10-30 – sc-WP-CREW-3a – Schiffbau reserviert keine individuelle Crew: Der Auftrag beschreibt nur den Crewbedarf, das Schiff wird unbemannt fertiggestellt und anschließend regulär von Kolonie oder geeignetem Transporter bemannt; Bauqueues sind kein Crew-Aufenthaltsort, bestehende `crewIds`-/Nullort-Reservierungen werden entfernt oder sicher migriert
- 2026-10-30 – sc-WP-CLOAK-1a – Tarnfeld-Generator ausschließlich für das Galaktische Imperium; Berechtigung bei Angebot, Fertigung, Bauplan, Bau/Umrüstung und Aktivierung, gegnerische Altinstallationen bleiben inaktiv; ohne explizite Ortung sieht nur der Eigner das getarnte Schiff, Allianzmitglieder erhalten keine Ausnahme
- 2026-10-27 – sc-WP-COMBAT-1 – Basisalarm nach jeder realen Feldtransition mit gemeinsamem Movement-Result; Gelb nur `ENEMY`, Rot außer `FRIEND`, beidseitiger Urlaubsschutz, höchstens ein deterministischer Kampf; Traktor/Tarnung später
- 2026-10-30 – sc-WP-COMBAT-1 – In drei geordnete Children geteilt: 1a erweitert den einzigen K1b1-Transition-Executor um `MovementResult`/neutralen Reaktionsport, 1b extrahiert den kontextfreien Battle-Resolver, 1c verbindet Alarmkandidaten und Bewegungs-UI über neutrale Orchestrierung; kein paralleler Routenexecutor und kein Combat/Spacecraft-Modulzyklus
- 2026-10-27 – sc-WP-UI-3a – Exakte STU-Regel: Jede belegte Kolonie unabhängig von Eigentum und Haltung verteidigen oder blockieren; schiffsbezogene API, flottenbezogene Order, Urlaub/Gegenorder und Blockade-Orbitalverteidigung prüfen
- 2026-10-30 – sc-WP-UI-3a – In `sc-WP-UI-3a1` für zentrale Policy/schiffsbezogene API und `sc-WP-UI-3a2` für autoritativen Feldkontext/Schiff-UI geteilt; Parent als Tracking-Split abgeschlossen
- 2026-10-30 – sc-WP-UI-1b – Gegen aktuellen Repository-Stand mit unveränderten Lint-/Typecheck-/Test-/Build-Gates erneut freigegeben; historische Research- und TS6305-Fehler sind weder stehende Blocker noch dauerhafte Baseline-Ausnahmen
- 2026-10-30 – sc-WP-STAT-5 – Kolonie und Raumwerft teilen einen quellneutralen Schiffbau-Kern sowie generalisierte Queue/Fertigstellung mit genau einem Ursprung `COLONY` oder `STATION`; dünne Adapter bewahren col-A3b, fertige Stationsschiffe docken an, keine Injection des ColonyShipyardService oder neue Modulzyklus-Workarounds
- 2026-10-28 – soc-E3b – Plotbeiträge sind immer HoloNet-Kategorie `ROLEPLAY`; eine abweichende Kategorie wird bei Plotzuordnung serverseitig überschrieben
- 2026-10-28 – sc-WP-CLEAN-2 – Das Tholianische Netz wird zum **Interdiktornetz**: ein kooperativ aufgebautes Fang- und Schadensfeld, passend zu imperialer Interdiktortechnik.
- 2026-10-28 – sc-WP-CLEAN-2 – Das RPG-Modul wird zum **RPG-Transponder**: rein administrative Szenenkennzeichnung mit Admin-Unsichtbarkeit, ausdrücklich kein taktisches Tarnsystem.
- 2026-10-28 – sc-WP-CLEAN-2 – Der Uplink wird zum **Kooperationsuplink**: Er erlaubt berechtigte fremde Crew auf Stationen und bleibt damit eine organisatorische Stationsfunktion.
- 2026-10-28 – sc-WP-CLEAN-2 – Der Beam-Blocker wird zum **Transferstörsender**: ein passives Feld, das Waren- und Crewtransfer blockiert.
- 2026-10-28 – sc-WP-CLEAN-2 – Die falsche Warpsignatur wird zur **Signaturmaskierung**: Flugsignaturen geben zeitweise einen bekannten fremden Rumpf vor und passen so zum feldweisen Galaxieflug.
- 2026-10-28 – sc-WP-CLEAN-2 – Der Singularitätsreaktor wird zum **Hypermaterie-Reservekern**: alternativer Hochkapazitätsreaktor ohne Star-Trek-Singularitätsterminologie.
- 2026-10-29 – soc-A8 – Fraktionswillkommen wird als idempotente Systemnachricht vom **Oberkommando der Rebellenallianz** beziehungsweise **Imperialen Oberkommando** versandt.

## Erledigt

<!-- Eine Zeile je resolved Issue: ID – Kurzbeschreibung – Commit -->
- tmw-T8b – Deal-Auktionen: Maximalgebot nach STU in Prestige oder Ware, Überbotene erhalten den Einsatz zurück, Gewinner holt nach dem Ende einmal ab und erhält den Rest über dem Preis zurück; Bereiche „Auktionen“ und „Gewonnene Auktionen“, Admin-Schalter „Auktion“ – 44c4bcea
- soc-G2c – Award `LOTTERY_WINNER` für den Lotteriegewinner über das Ereignis „Lotterie gezogen“, Mehrfachgewinne zählen hoch, je Periode höchstens einmal – cfd8f198
- tmw-T9 – Hutten-Lotterie: Lose für 1 Aurodium am Hutten-Posten, Ziehung am Monatsersten per täglicher Wartung (einmal je Periode) mit Jackpot, Prestige, Fraktionsschiff, Nachrichten und Freilosen; Ereignis „Lotterie gezogen“ für soc-G2c, Admin-Gewinnbaupläne, Tab „Lotterie“ – ecad3add
- tmw-T6 – Handels-Shoutbox je Netz: Lesen und Schreiben mit Lizenz im Netz, HTML-bereinigt und auf 200 Zeichen gekürzt, 30 Einträge je Netz, 5 Einträge pro Minute; Tab „Shoutbox“, Kontolöschung räumt ab – d9b493c2
- tmw-T5 – Transfers im Handelsnetz: eigene Waren zwischen Posten desselben Netzes, gekürzt auf Bestand, Zielplatz und 24-h-Transferkapazität des Quellpostens, Lizenz an Quelle und Ziel; Kapazitätsanzeige und Transferdialog in der Kontobox – 25d47465
- tmw-T8a – Hutten-Deals: `TradeDeal` mit Ware, Schiff oder Bauplan gegen Ware oder Prestige, optional je Fraktion; Annahme n-fach mit STU-Kürzungen und Sperre gegen Überverkauf, Schiffe/Baupläne über Port aus dem Spacecraft-Modul; Admin-Verwaltung, einmalige Handelsnachricht bei Start, Tab „Hutten-Deals“ – 836a24d6
- tmw-T11b – Kontolöschung räumt Handel ab: `TradeDeletionHandler` entfernt Angebote mit Reserven, Transfers, Lizenzen und Warenkonten in der Löschtransaktion, Transaktionen und Basishandelskurse bleiben anonymisiert; Handler-Registrierung im Löschgerüst ergänzt – 7d995ca5
- tmw-T11a – Handelsranglisten: „Die 10 aktivsten Handelsposten“ (Transaktionen der letzten 7 Tage), Aurodium-Rangliste um Warenkonten und Angebotsreserven ergänzt; Route für `rpg`/`aurodium` aus D2 freigeschaltet – d0158a4b
- tmw-T13 – Handelsabkommen: neue Fähigkeit `mayTradeFavorably`; Partner erhalten Lizenzen am Spielerposten des Eigentümers kostenlos (Kauf, Verlängerung, Lizenzmenü), NPC-Posten und Auflösungsfehler zum regulären Preis; `tradeModifier` per Migration entfernt – 773cc0f7
- tmw-T7b – Basishandel endgültig: Doonium, Transparistahl, Durastahl-Legierung in beiden Fraktionsnetzen zum ältesten STU-Testkurs; entfernte Waren ausgeblendet und nicht handelbar, Historie bleibt – 963d3672
- tmw-T7a – Basishandel nach STU: Aurodium gegen Waren an lizenzierten NPC-Posten zum Netzkurs (Kauf −10, Verkauf +10, Mittelung, Kurs-ID, Sperre je Netz und Ware), Startkurse aus `game-data`, Tab „Basishandel“ mit Kursdiagramm – 1c73c928
- tmw-T4b – Angebote nach STU annehmen (Kürzung auf Bestand, Platz und Restanzahl, Transaktion, Nachricht an den Anbieter), suchen nach Ware, Modus und Posten, Übersicht je Ware, Verfall nach 14 Tagen; Tab „Angebote“ mit Annehmen-Dialog – 2251fbc9
- tmw-T4a – Tauschangebote nach STU erstellen (Reserve aus dem Warenkonto, Vergleichsregel, Kürzung), auflisten und zurückziehen; Angebotsreserven als Lagerort; Tab „Meine Angebote“ und Dialog „Neues Angebot“ – 60b5c41b
- tmw-T3 – Handelsmenü am Posten: Waren zwischen Frachtraum und Warenkonto per Feld-Kopräsenz und Lizenz, gekürzt auf Bestand, Platz und Transferenergie, transaktional; Dialog im Schiffsdetail – 8555909a
- tmw-T2d – Lizenzen im Frontend: Lizenzliste, Kauf aus Fracht oder Warenkonto, Verlängerung, Eigentümerverwaltung, Handelsmenü im Schiffsdetail über serverseitiges Lizenzmenü – b5b0100e
- tmw-T2c – Handelslizenzen verlängern ohne Zeitverlust, tägliche Wartung mit einmaliger Warnung und Löschung, eigene und ausgestellte Lizenzen abfragen – 1286723b
- tmw-T2b – Handelslizenz atomar kaufen aus Frachtraum oder Warenkonto desselben Netzes, Gutschrift an den Posteneigentümer, Handelsmeldung nach Commit – 95e349c9
- tmw-K10b2 – Ionensturm-Wirkung: gemeinsamer STU-Schadensdienst (Schilde, Hülle, Krit, Systemschaden), Tickschaden, Stationsschilde, Einflugschaden, zeitbasierter Antriebsausfall, Zerstörung über den Zerstörungsdienst – d627567d
- soc-H1 – Öffentliche Diplomatie-Wechsel erzeugen locationlose ALLIANCE-Events atomar mit der Diplomatie-Chronik; `/events` filtert sie – siehe Feature-Commit
- tmw-K10b1 – Ionensturm nach STU: Erzeugung je Ebenendichte (konfigurierbar), Bewegung, Ausbreitung über Restticks, Intensität in LSS/Feldkontext/Umgebungsscan, Navigationswarnung – a12d7025
- tmw-K10a3 – Aktive Anomalien mit Typ, Name und Restdauer in LSS (Galaxie/System), Feldkontext und Kolonie-Umgebungsscan; LSS-/Scan-Icon mit Fallback, fehlende Anomalie-Assets dokumentiert – 0c8b2ee4
- tmw-K10a2 – Subraumellipse: explizite `anomalyMass` je Schiffsklasse, STU-Score je Ort mit Schwelle und Prozentprobe, Ein-Tick-Wirkung (Schilde entladen, Emitterschaden 1–50) mit gebündelten Berichten; Einflug-Dispatch über die Flugfolgen-Pipeline – 0f3ddac6
- soc-F3c – Login-Option „Angemeldet bleiben“: ohne Häkchen nur Sitzungsspeicher, Logout leert beide Speicher, Wahl bleibt beim Token-Refresh erhalten – a6ca67e0
- sc-WP-SENS-2b – Peilsender markieren fremde Schiffe am Feld, melden Position und Restlaufzeit und erlauben den Angriff auf das getrackte Ziel – siehe Feature-Commit
- sc-WP-SENS-2a – Hyperraumfeldscanner zeigt fremde Subraumspuren im LSS; Matrixsensoren ermöglichen die gezielte 100-EPS-Analyse – siehe Feature-Commit
- sc-WP-ENG-5 – Hypermaterie-Transferkoppler überträgt Reaktorladung transaktional an mehrere gleich positionierte, ungetarnte Schiffe und informiert fremde Eigentümer – siehe Feature-Commit
- sc-WP-CREW-4b – Fremde unbemannte Nicht-NPC-Schiffe außerhalb des Urlaubsmodus können über zehn Hauptticks übernommen werden; Startkosten, Abbrucherstattung, Besitzwechsel, History, Crew-XP und NBS-Fortschritt sind umgesetzt – siehe Feature-Commit
- sc-WP-CREW-4a – Fremde ungeschildete Schiffe können unabhängig von Haltung und Fraktion per NBS geentert werden; STU-Truppenkampf, Crewverluste und Prestige sind transaktional umgesetzt – siehe Feature-Commit
- col-G1b – Teleskop-Scans ziehen STU-EPS-Kosten ab und zeigen momentane anonyme Schiffsanzahlen je Rumpfkategorie – siehe Feature-Commit
- col-G1a – Hyperraum-Teleskope öffnen einen navigierbaren, persönlich erkundungsredigierten Kartenausschnitt mit serverseitiger STU-Energiekostenvorschau – siehe Feature-Commit
- col-E1b – Kolonielimits werden ohne festen Deckel aus abgeschlossenen Forschungsdaten summiert und im Forschungsdetail angezeigt – siehe Feature-Commit
- col-E1a – Forschungsdetails zeigen datengetriebene Kolonielimit-Erhöhungen; das Dashboard verbirgt Asteroiden bis zur Freischaltung – siehe Feature-Commit
- col-D2c – Forschungs-Awards werden aus stabilen Dump-Mappings vergeben, Besitz-Gates serverseitig erzwungen und im Detailmodal angezeigt – siehe Feature-Commit
- col-A8 – Instandhaltungssets und Schiffssystem-Baugruppen für Funktionen 29/30 datengetrieben gefertigt, im Komponentenmenü angezeigt und an bestehende Reparaturverbräuche angebunden – siehe Feature-Commit
- tmw-T2a – Persistente Handelslizenzbedingungen und Spieler-Lizenzen, eigentümergeschützte Pflege, NPC-Default und gemeinsame Feld-Presence-Policy umgesetzt – siehe Feature-Commit
- tmw-K5d – Täglicher Kartenzyklus schließt vollständig erkundete Ebenen atomar ab, löscht persönlichen Ebenennebel und persistiert das Abschlussereignis genau einmal – siehe Feature-Commit
- tmw-K5c – Heimatweltabschluss und erfolgreiche eigene Galaxieankünfte machen Ebenen autoritativ und idempotent bekannt – siehe Feature-Commit
- tmw-K5a – Persistente Ebenenkenntnis mit monotonem Status, Service-API und dedupliziertem Bestands-Backfill umgesetzt – siehe Feature-Commit
- tmw-K3a – LSS-Störung, Bresenham-/Eckblockade und serverseitig opake Signaturzustände für System- und Galaxiekarten umgesetzt – siehe Feature-Commit
- tmw-FA1b4 – Positives Koloniewachstum wird je Tick einmalig mit der aktuellen Eigentümerfraktion multipliziert und vor Kapazitätsgrenzen abgerundet – siehe Feature-Commit
- tmw-FA1b3 – Fraktionsabhängige Forschungspunkte werden je Tick einmalig multipliziert und deterministisch abgerundet – siehe Feature-Commit
- tmw-FA1b1 – Administrativ gepflegte Fraktionswählbarkeit wird im Onboarding angezeigt und serverseitig erzwungen – siehe Feature-Commit
- sh-AP-05a – Bestätigte Kontolöschung mit Widerruf, Zugangssperre, transaktionalem Handler-Orchestrator und abgesicherter Admin-Sofortlöschung – siehe Feature-Commit
- sh-AP-04b – Wirksamer Urlaub schützt Schiffe und Kolonien zentral vor Angriff, Abfangen und Blockade; das NBS begründet deaktivierte Angriffe – siehe Feature-Commit
- sc-WP-TRACT-1b – Fremde ungeschildete Nicht-NPC-Schiffe außerhalb wirksamen Urlaubs können unabhängig von Haltung erfasst werden; Opfer können mit STU-Folgen entkommen – siehe Feature-Commit
- sc-WP-TRACT-1a – Traktorstrahl-Laufzeitsystem für eigene Schiffe mit Flugmitnahme, Zusatz-EPS, Abriss, Flugblockade, Zerstörungsbereinigung und NBS-Aktion – siehe Feature-Commit
- sc-WP-SHUT-2 – Crewtransport- und Torpedotransportmodule erhöhen wirksam die jeweilige Transportkapazität – siehe Feature-Commit
- sh-AP-21 – Frontend-Typecheck-Baseline grün (Faction-Typ in database.tsx, Spec-Fixture, Typecheck-Schritt in CI)
- sc-WP-ENG-6b – Brownout-Systemabschaltungen werden im Schiffsordner und live gemeldet; Wracks verfallen je Haupttick um 5–15 Hülle – siehe Feature-Commit
- sc-WP-CLEAN-2 – Sechs STU-Sonderfeatures auf kanonnahe Star-Wars-Pendants abgebildet und als SPEC-Folgeissues zur Triage erfasst – siehe Feature-Commit
- col-A9 – Jägerwerften bauen Rümpfe ins Lager und starten sie über den Hangar; neue normale Bauqueue-Aufträge sind ausgeschlossen – siehe Feature-Commit
- sh-AP-20 – Hauptticks sperren schreibende Spieleraktionen per TICK-Status, Banner und 503, mit sicherer Statuswiederherstellung – siehe Feature-Commit
- tmw-K8a – Erkundungsabhängige Regions- und Verwaltungsregionsinfos in Feldkontext, Schiffskopf, LSS und geschütztem Detailendpunkt umgesetzt – siehe Feature-Commit
- tmw-K4 – Persistente Sternenkarten-Overlays für Territorium, Unpassierbarkeit, Feldeffekte und berechtigte Sensorabdeckung umgesetzt – siehe Feature-Commit
- tmw-K1a – Erweiterbarer Flugfolgen-Kern, vollständiger Feldeffekt-Katalog und Zielfeldwarnungen umgesetzt – siehe Feature-Commit
- sh-AP-19b – Responsives Tutorial-PADD mit Fortschritt, Zielhervorhebung, Aktions-Events und Einstellungen – siehe Feature-Commit
- col-A1a – Werftqueues reagieren zentral auf Gebäudestatus und Abriss – siehe Feature-Commit
- col-A1b – Fabrikation, Akademie und Schilde reagieren auf Gebäudestatus – siehe Feature-Commit
- col-A2 – Modul-/Torpedofertigung nach STU-Regeln (EPS, Kürzung, Aufstocken, Teilabbruch, Tick, Torpedos sofort) – siehe Feature-Commit
- col-A10 – Phalanx-Torpedotypen sind an abgeschlossene Forschung gebunden – siehe Feature-Commit
- col-A5 – Werftreparaturen laufen passiv in materialgebundenen Schritten mit Slots und Eignernachrichten – siehe Feature-Commit
- col-A3a – Werftbau und Umrüstung prüfen Blockade, Crew-Maximum und Spezialslots – siehe Feature-Commit
- col-A4 – Baupläne mit Löschsperren, Duplikatsignaturen und Namensvalidierung gehärtet – siehe Feature-Commit
- col-A7 – Akademie-Tick berücksichtigt Aktivität, Crewlimits und Ausbildungslimit – siehe Feature-Commit
- col-B1 – Arbeitslose wandern bei Überbelegung und überschrittenem Bevölkerungslimit aus – siehe Feature-Commit
- col-C1 – Gebäudeschaltung bietet Gruppenaktionen und warenbezogene Massensteuerung – siehe Feature-Commit
- col-C2 – Baumenü lässt sich nach Feld und produzierter Ware filtern – siehe Feature-Commit
- col-D1 – Forschungsabschluss meldet sich im Kolonie-Ordner und aktualisiert die UI live – siehe Feature-Commit
- col-D2a1 – Forschungsdaten können optional eine Schiffsbelohnung beschreiben; Detail zeigt sie nur bei Mapping – siehe Feature-Commit
- col-D2a2 – Dauerhafter Grant-Nachweis (research_reward_grant, unique Spieler+Forschung) mit transaktionalem reserve/complete – siehe Feature-Commit
- col-D2a3 – Transaktionaler Forschungs-Belohnungsschiff-Spawn (ResearchRewardShipService) im Orbit der ältesten Kolonie – siehe Feature-Commit
- col-D2a4 – Forschungsabschluss vergibt Belohnungsschiff idempotent und meldet es einmalig im Ordner „Schiffe“ – siehe Feature-Commit
- col-D3a – Forschungsliste und -detail zeigen Bilder, Abschlussdatum, Folgeforschungen sowie Rumpf-/Modulfreischaltungen – siehe Feature-Commit
- col-D4 – Forschungsdaten tragen validierte explizite Fraktionen; EXCLUDE-Import und -Richtung entsprechen STU – siehe Feature-Commit
- col-D5 – SWU-Forschungsqueue mit zehn Plätzen, Auto-Pfad und Fortschrittserhalt als bewusste STU-Abweichung dokumentiert – siehe Feature-Commit
- col-F2 – Warenmetadaten, Beam- und Kontobindungsregeln sowie sortierte sichtbare Lageranzeigen umgesetzt – siehe Feature-Commit
- sc-WP-FLEET-1a – Flottenverwaltung und Schiffsaktionen vollständig – siehe Feature-Commit
- sc-WP-COMBAT-2 – Mehrparteienkampf für Flotten und alarmierte Mitverteidiger – siehe Feature-Commit
- sc-WP-COMBAT-1b – interner kontextfreier Battle-Resolver (`BattleResolverService`) – siehe Feature-Commit
- sc-WP-COMBAT-3 – Kampfprestige, intakte Module im Wrack und globale Zerstörungshistory – siehe Feature-Commit
- sc-WP-CLEAN-1 – Freie Modulinstallation, -aufrüstung und -entfernung aus der Spieler-API entfernt – siehe Feature-Commit
- sc-WP-CREW-1 – Crewposten, Crewdetails und Umbenennen am Schiff umgesetzt – siehe Feature-Commit
- sc-WP-CREW-2 – Persistente Crew-Expertise, zehn Ränge, Ereignisquellen und limitierte Beförderungen umgesetzt – siehe Feature-Commit
- sc-WP-ENG-3 – Eigenreparatur mit Ersatzteilen, Systemkomponenten, Tick-Abschluss und Flugabbruch umgesetzt – siehe Feature-Commit
- sc-WP-ENG-3b – Bedingungslose passive Modulreparatur aus dem Schiffstick entfernt – siehe Feature-Commit
- sc-WP-ENG-6a – Lebenserhaltung evakuiert Schiffscrew; globale Crewlimits greifen kolonieweise und danach schiffsweise – siehe Feature-Commit
- sc-WP-NAV-2a – Flugsignaturen, Sichtbarkeitsfenster, Verfall und Schiff-Sektor-Scan – siehe Feature-Commit
- sc-WP-NAV-2b – Kolonie-Sektor-Scan zeigt fremde sichtbare und verblasste Flugsignaturen – siehe Feature-Commit
- sc-WP-NAV-3 – Feldweiser Galaxieflug statt zeitbasiertem Hyperraumsprung als ADR festgelegt – siehe Feature-Commit
- sc-WP-STAT-0 – ADR für Stationsmodell, Stationsrollen, Docking und Allianzverträge – siehe Feature-Commit
- sc-WP-STAT-1a – Konstruktbau mit Kosten, angedockten Workbees, Limit und Entfernung umgesetzt – siehe Feature-Commit
- sc-WP-STAT-1b – Konstrukt-Ausbau zu fraktionsgebundenen Stationsrollen mit Kostenansicht und Tickfortschritt umgesetzt – siehe Feature-Commit
- sc-WP-STAT-2 – Stationsliste und -detail mit Dockbelegung, gemeinsamer Spacecraft-Ausstattung, Sensoransichten und Flugschutz umgesetzt – siehe Feature-Commit
- sc-WP-FLEET-2 – Flottenflug, Fixierung und flottenweites Abfangen – siehe Feature-Commit
- sc-WP-FLEET-1b – Schiffsliste nach Flotten und Einzelschiffen gruppiert – siehe Feature-Commit
- sc-WP-UI-1a – Schiffsliste mit STU-Informationsdichte und Laufzeitstatus – siehe Feature-Commit
- sc-WP-UI-2 – Schiffskopf mit Schildregeneration, EPS-Fluss, Crew-Ampelfarbe und Tooltips verdichtet – siehe Feature-Commit
- sh-AP-01 – Sicherer, konfigurierbarer Passwort-Reset mit wiederverwendbaren Account-Tokens – siehe Feature-Commit
- sh-AP-02 – Eigenständige System-News mit Admin-Erstellung und öffentlicher Landing-Anzeige – siehe Feature-Commit
- sh-AP-15a – Nachrichten-Navlet mit Live-Zählern, Hervorhebung und direktem Schreiben-Link – siehe Feature-Commit
- sh-AP-15b – Forschungs-Navlet mit Bild, Tick-Produktion und Wartend-Badge verdichtet – siehe Feature-Commit
- sh-AP-15c – Kolonien-Navlet mit STU-Tooltips und laufender Serverzeit umgesetzt – siehe Feature-Commit
- sh-AP-16 – Gespeicherte Startansicht, Benachrichtigungseinstellungen und gemeinsame serverseitige Leser wirksam gemacht – siehe Feature-Commit
- sh-AP-07a – Tägliches Maintenance-Gerüst und explizite Spielzeitzone – siehe Feature-Commit
- sh-AP-09 – Login und Session mit sicherem JWT-Secret, serverseitigem Logout und Account-Prüfungen gehärtet – siehe Feature-Commit
- sh-AP-11 – Gemeinsame cursorfolgende, touch- und tastaturfähige Tooltip-Komponente – siehe Feature-Commit
- sh-AP-12 – Seitenkopf mit Breadcrumb, Seitentitel und persistenter Meldungsbox – siehe Feature-Commit
- sh-AP-13a – Design-Tokens, Spieltabellen, Zahlenformatierung und deutsche UI-Texte vereinheitlicht – siehe Feature-Commit
- soc-A1 – PM-Serverregeln, Ignorier-Haken und Antwortverlauf umgesetzt – siehe Feature-Commit
- soc-D1 – HoloNet-Längenregeln, Soft-Delete, Beteiligten-Benachrichtigungen, Bewertungsbalken und Compose-Lesezeichen umgesetzt – siehe Feature-Commit
- sc-WP-ENG-2 – Querschnitt in sc-WP-ENG-2a bis 2e aufgeteilt – Tracker-Entscheidung
- tmw-T1 – Handelsfundament in tmw-T1a bis T1d aufgeteilt – Tracker-Entscheidung
- tmw-D0 – Elf Systemdatenbank- und Astrometrie-Spec-Issues gegen Code, Tests und Historie abgeglichen; Restlücken als tmw-D0a/b erfasst – siehe Feature-Commit
- tmw-D1 – Warenübersicht mit eigenen Lagerorten und erweiterbarem Quellen-Port umgesetzt – siehe Feature-Commit
- tmw-W1 – Handels-NPC-Konten mit zentralen Ausschlüssen, Handelsnachrichten und Adminpflege umgesetzt – siehe Feature-Commit
- tmw-D3 – Anonyme Vielflieger-Rangliste aus 48-h-Flugsignaturen und tägliche STU-Prestigestaffel umgesetzt – siehe Feature-Commit
- soc-G1 – Awardkatalog, idempotente Vergabe mit Prestige und Profilanzeige umgesetzt – siehe Feature-Commit
- sc-WP-UI-3b – Gezielter Kolonieangriff auf ein Gebäude über die Oberflächenwahl umgesetzt – siehe Feature-Commit
- sc-WP-ENG-2a – Reine deklarative Interaktions-Policy mit stabilen Ablehnungsmeldungen umgesetzt – siehe Feature-Commit
- sc-WP-ENG-2b – Dünner, feldselektiver NestJS-Loader für Interaktionskontexte umgesetzt – siehe Feature-Commit
- sc-WP-ENG-2c – Transfer und Schiffsangriff werten den Urlaubsschutz zentral über Kontextloader und Policy aus – siehe Feature-Commit
- tmw-D0a – Geschützten Systemdetailvertrag mit Kolonien, Scans, Kartenlink und nicht-taktischer Darstellung wiederhergestellt – siehe Feature-Commit
- tmw-D0b – Systemdetailvertrag, Raster, Scanwissen, Schnellnachrichten und Kartographiefortsetzung verhaltensorientiert abgesichert – siehe Feature-Commit
- sh-AP-04a – Urlaubsmodus mit 48-h-Vorlauf, Sitzungsende, Login-Beendigung und öffentlicher Kennzeichnung umgesetzt – siehe Feature-Commit
- sh-AP-04c – Urlaub pausiert Kolonieticks, Crewlimit-Folgen und Schiffsreparaturen; Sperrfrist zählt ab Aktivierung – siehe Feature-Commit
- tmw-T1a – Handelsmodell mit Posten, Konten, Angebotsreserven, Transfers, Transaktionen und transaktionssicherem Speicher umgesetzt – siehe Feature-Commit
- tmw-T1b – Fünf NPC-Handelsposten werden idempotent an deterministischen kanonischen Standorten gesät – siehe Feature-Commit
- sc-WP-FLEET-2b – Flotten-Alarmstufe mit partiellen Ergebnissen und STU-Icons umgesetzt – siehe Feature-Commit
- sh-AP-17 – Öffentliche Seiten für Impressum, Datenschutz und Hilfe mit konfigurierbaren Links umgesetzt – siehe Feature-Commit
- sh-AP-18 – Maindesk zeigt neue HoloNet-Beiträge, Werftprozesse und eine durchgehende rechte Spalte – siehe Feature-Commit
- soc-A2 – Schnell-PM-Links aus Spielerprofil, HoloNet und Allianzforum mit vorbelegtem Empfänger umgesetzt – siehe Feature-Commit
- soc-A3 – Datenschutzgerechte Lesebestätigungen im Postausgang mit Doppelhäkchen umgesetzt – siehe Feature-Commit
- soc-B1a – Kontaktlisten-Backend und persönliche Freund-Markierung im zentralen Haltungsresolver umgesetzt – siehe Feature-Commit
- sh-AP-19a – Versioniertes Tutorialmodell, Spielerfortschritt, API und Onboarding-Aktivierung umgesetzt – siehe Feature-Commit
- soc-E1 – Spielercharaktere mit Avatar, BBCode-Profilanzeige und eigentümergeschütztem CRUD umgesetzt – siehe Feature-Commit
- sh-AP-03 – Optionale E-Mail-Verifikation mit sicheren Links, Adresskorrektur und Spielzugangs-Gate umgesetzt – siehe Feature-Commit
- soc-D3 – HoloNet-Compose mit BBCode-Vorschau und Navigationsbadge für neue Beiträge umgesetzt – siehe Feature-Commit
- sh-AP-07b – Tick-Admin mit Laufhistorie, Einzeljobs und idempotenten Fehlernachrichten umgesetzt – siehe Feature-Commit
- sh-AP-07c – Tickplan verwendet standardmäßig Europe/Berlin; nächste Tickzeit wird browserlokal angezeigt – siehe Feature-Commit
- soc-F6 – E-Mail-Änderung mit Normalisierung, Formatprüfung, case-insensitiver Eindeutigkeit und Blocklist-Port abgesichert – siehe Feature-Commit
- sh-AP-08a – Admin-Spielerliste und tickbasierte Spielersperren mit Login-Schutz umgesetzt – siehe Feature-Commit
- sh-AP-14b – Sidebar und mobile Navigation auf gemeinsame Asset-Iconpaare mit aktivem und Hover-Zustand umgestellt – siehe Feature-Commit
- tmw-T1c – Autorisierte Handelspostenliste sowie eigene Konten und Schiffe vor Ort mit Standortredaktion umgesetzt – siehe Feature-Commit
- tmw-FA1a – Startforschung und Startgebäude als Fraktionsdaten mit datengetriebenem Onboarding umgesetzt – siehe Feature-Commit
- soc-B2 – Kontaktliste, Profilaktionen und Kontaktwahl beim Verfassen privater Nachrichten umgesetzt – siehe Feature-Commit
- soc-C1a – Gerichtete Ignorierliste mit Verwaltungsoberfläche, Profilaktionen und PM-Sperre umgesetzt – siehe Feature-Commit
- soc-D2 – Admins können fremde HoloNet-Beiträge mit optionaler Begründung weich löschen und den Autor benachrichtigen – siehe Feature-Commit
- soc-E3a – RPG-Plots mit Erstellerverwaltung, Schreiberlisten, Systemnachrichten und HoloNet-Oberfläche umgesetzt – siehe Feature-Commit
- soc-E3b – HoloNet-Beiträge können aktiven eigenen RPG-Plots zugeordnet werden und erscheinen samt Benachrichtigungen in der Plotdetailseite – siehe Feature-Commit
- tmw-D6a – Handelsposten-Datenbankliste mit Betreiber, Netz und erkundungsabhängig redigiertem Kartenort umgesetzt – siehe Feature-Commit
- tmw-D6b – Stationsrumpf-Entdeckung per Fremdscan, maskierter Datenbankkatalog und geschützte Detailansicht umgesetzt – siehe Feature-Commit
- tmw-D7 – Getrennte NPC- und Administratorlisten mit Profilen und Schnell-PM im Datenbank-Hub umgesetzt – siehe Feature-Commit
- tmw-K3b – Treffer-, Ausweich- und Energiewaffeneffekte wirken im Kampf und werden einmalig im Kampfbericht genannt – siehe Feature-Commit
- col-E2 – Kolonieabgabe als wiederbesiedelbare Ruine samt Sperr-, Bestätigungs- und Orbitregeln in ADR-0007 festgehalten – siehe Feature-Commit
- tmw-K3c – Zentrale Feldeffektabfrage, Messpunktsperren und feldtypbasierte Stationsbausperren umgesetzt – siehe Feature-Commit
- soc-A5 – Typisierte Meldungsziele mit Kolonie-Backfill, HoloNet-Verlinkung und zentraler Frontend-Routenauflösung umgesetzt – siehe Feature-Commit
- soc-A8 – Fraktionsspezifische, idempotente Willkommens-Systemnachricht nach der Heimatweltwahl umgesetzt – siehe Feature-Commit
- soc-F1b – Profilbesucher mit Opt-out, sieben Tagen Aufbewahrung und Maindesk-Anzeige umgesetzt – siehe Feature-Commit
- sc-WP-ENG-2d – Scan, Abfangen und NBS-Aktionen (getNearby) beziehen Erlaubnis/Grund aus der Interaction Policy; Hooks für Tarnung/Ionensturm dokumentiert – siehe Feature-Commit
- sc-WP-ENG-2e – Nachrichten (sendNearbyMessage) und Wrackbergung (recoverWreckCargo) nutzen die Interaction Policy mit unveränderten Meldungen; Traktor-Hook dokumentiert – siehe Feature-Commit
- tmw-T1d – Lesende Handelsseite /trade mit Tabs Warenkonten/Handelsposten, Posteninfo, Navigation und Kontobeständen als Warenortquelle umgesetzt – siehe Feature-Commit
- col-A3b – Werft zieht Rumpf-EPS ab (`epsCost` je `stuRumpId`) und erlaubt je gewählter Werftfunktion einen BUILD-/RETROFIT-Auftrag (transaktional, Legacy-Aufträge ungebunden) – siehe Feature-Commit
- sc-WP-ENG-1 – EPS-Transfer Schiff→Schiff (`POST :id/nearby/:targetId/eps-transfer`, Kosten 3:1, Kürzung, Systemnachricht an Fremde, NBS-Icon + Mengendialog) – siehe Feature-Commit
- sc-WP-CREW-3a – Neutrale `EscapePod`-Entität, Crew-Ortsconstraint, Kapselstart bei Zerstörung/Lebenserhaltungsausfall, Tick-Landung, NBS-Eintrag; Baucrew-Reservierung entfernt – siehe Feature-Commit
- sc-WP-CREW-3b – Rettungskapseln bergen (1 EPS, eigene Crew bis Kapazität) und Liste „Verschollene Crew“ – siehe Feature-Commit
- sc-WP-CLOAK-1a – `CLOAK`-Laufzeitsystem (nur Imperium), Aktivierungsregeln, Unsichtbarkeit in NBS/LSS/Sternkarte/Kolonie-Scan, Interaktionssperren und Tarn-Icon/Schalter umgesetzt – siehe Feature-Commit
- sc-WP-STAT-3a – Andocken/Abdocken (einzeln, Flotte atomar, Station einzeln/alle), Auto-Abdocken beim Flug für 1 EPS, Andock-Icon in der Schiffsliste, Ionensturm-Hook-Kontext (`sourceDocked`/`targetDocked`) – siehe Feature-Commit
- sc-WP-STAT-3b – Dockingrechte (Spieler/Allianz/Fraktion/Schiff, Verbot vor Erlaubnis), Allianz-Bereinigung und Dock-Nachricht mit Auto-gelesen – siehe Feature-Commit
- sc-WP-STAT-4a – Schiffsmanagement angedockter Schiffe an der Station über gemeinsamen Management-Dienst (Kolonie/Station) und Schalter „Batterie automatisch nachladen“ – siehe Feature-Commit
- sc-WP-STAT-4b – Stationsreparatur: Queue mit Abbrechen/Reaktivieren, passive Stationsselbstreparatur mit Workbees und Ersatzteilen, Abbruch bei Flug/Abdocken – siehe Feature-Commit
- tmw-D2 – RPG-Schreiber- und Aurodium-Ranglisten mit erweiterbaren Besitzquellen sowie STU-Highscore-Gliederung umgesetzt – siehe Feature-Commit
- tmw-K1b1 – Gemeinsamer Feldtransition-Executor verarbeitet System- und Galaxierouten mit EPS und allen Bewegungsfolgen je tatsächlich betretenem Feld – siehe Feature-Commit
