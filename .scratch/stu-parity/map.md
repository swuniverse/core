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
4. **Aufgehoben am 2026-11-17: Betrieb/Recht hinter Flag.** Laut PO-Entscheidung sind E-Mail-Verifikation, Passwort-Reset, Konto- und Inaktivitätslöschung, Spieler-/Massenmail sowie Impressum, Datenschutz und Hilfe immer aktiv; die bisherigen Flags entfallen. Persönliche Mail-Einstellungen bleiben wirksam, Rechtstexte behalten klar markierte Betreiber-Platzhalter. Umgesetzt in [sh-AUD-01](issues/sh-AUD-01-feature-flags-entfernen.md).
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

- 2026-11-18 – **sh-AUD-07a umgesetzt, Prüfung ausstehend**: Minütlicher Bauabschluss erweitert um Kolonie-Bau/-Umrüstung und Stations-Bau, globale Fälligkeitsabfrage ohne Urlaubsschutz. Haupttick behält vorerst nur Reparaturen. Abschluss/Abbruch und Meldungen sind transaktional; 64 Unit- und 7 PostgreSQL-Fälle erfolgreich. Gesamt-/Sperrreview, weitere Regressionen, Typechecks/Build und Browser ausstehend; Status `claimed` – siehe [Ticket](issues/sh-AUD-07a-schiffsbau-und-umruestung-minuetlich.md).

- 2026-11-18 – **sh-AUD-05 umgesetzt, Prüfung ausstehend**: Urlaub schützt Wirtschaft/Crewlimit und Anomaliefälle erst nach mehr als 48 Stunden. Werftaufträge, Eigen-/Stationsreparaturen laufen weiter; Sieben-Tage-Sperre ab letzter Aktivierung und UI-Hinweise korrigiert. Leser-Audit und Ersatz von sh-AP-04c vermerkt. 44 Backend- und 1 Frontend-Test erfolgreich; PostgreSQL-/API-/Urlaubsregressionen, Abschlussreview, Browser, Lint/Typechecks und Build ausstehend. Status `claimed` – siehe [Ticket](issues/sh-AUD-05-urlaub-exakt-wie-stu.md).

- 2026-11-18 – **sc-AUD-10 umgesetzt, Prüfung ausstehend**: Eigenständige kostenlose Schildregeneration nach persistentem 15-Minuten-Timer, mit Crew-/System-/Feld-/Anomaliebedingungen, gemeinsamem gedeckeltem `ceil(10 %)`-Wert für Liste/Kopf und Live-Aktualisierung. Haupttick-Gutschrift entfernt, Timer-Resets und Metadatenerhaltung ergänzt. 102 Backend- und 36 Frontend-Tests erfolgreich; PostgreSQL-/Anomalie-/Kampfregressionen, Abschlussreview, Browser, Lint/Typechecks und Build ausstehend. Status `claimed` – siehe [Ticket](issues/sc-AUD-10-schildregeneration-wie-stu.md).

- 2026-11-19 – **col-AUD-03 umgesetzt, Prüfung ausstehend**: Felddialog zeigt Baustelle mit Zielgebäude, Fortschritt (aus skalierter Bauzeit, auch bei Upgrades), Fertigstellung und umschaltbarem „Nach Bau aktivieren/deaktivieren“ (bedingtes Update, kein Konflikt mit dem Minutenabschluss); Oberfläche mit anteiligem Overlay. Umsetzung Sonnet-Agent, Review Opus. Status `claimed` – siehe [Ticket](issues/col-AUD-03-felddialog-baustelle.md).

- 2026-11-19 – **Prüfpass tmw-AUD-01b, col-AUD-02a, col-AUD-02b bis auf Browser bestanden**: Gesamtlauf auf `66a875fb` ohne Regression (Build, Lint, 2605 Backend-, 925 Frontend-Tests; PostgreSQL unverändert 139 vorbestehende Fehler).

- 2026-11-19 – **col-AUD-02b umgesetzt, Prüfung ausstehend**: Kolonieliste zeigt Warenverbrauch mit Reichweite in Runden, laufendes Terraforming mit Fortschritt, Modulproduktion und den Aktivierungshinweis bei Bauvorgängen; alle Daten gesammelt geladen. Umsetzung Sonnet-Agent, Review/Fortschritt Opus. Status `claimed` – siehe [Ticket](issues/col-AUD-02b-kolonieliste-stu-bloecke.md).

- 2026-11-19 – **col-AUD-02a umgesetzt, Prüfung ausstehend**: Kolonieliste zeigt echte Signaturzahl (Regel wie Sektor-Scan, eine Abfrage für alle Kolonien, auf 48 h begrenzt), Verteidigt-Icon bei DEFEND-Auftrag und Wachstum aus der Tick-Funktion; Signaturzahl öffnet den Umgebungsscan. Umsetzung Sonnet-Agent, Review Opus. Status `claimed` – siehe [Ticket](issues/col-AUD-02a-kolonieliste-echte-werte.md).

- 2026-11-19 – **tmw-AUD-01b umgesetzt, Prüfung ausstehend**: Warenkonten-Tab zeigt je Konto die STU-Box aus `accountBoxes` (Waren lagernd/in Angeboten mit Klickmenü, Standort und Schiffe vor Ort, Netz und Schwarzes Brett, NPC-Transferkapazität, Lagerraum rot/grün, Lizenzen, Gebühren, Umbenennen). Umsetzung durch Sonnet-Agent, Review durch Opus. Netzicon für Imperium-/Rebellennetz (Hutten ohne Bild). Offen: Browserprüfung. Status `claimed` – siehe [Ticket](issues/tmw-AUD-01b-warenkontobox-wie-stu.md).

- 2026-11-19 – **col-AUD-08b resolved** (Prüfpass: Review ohne Befund, Gesamtlauf ohne Regression). Umsetzung: Produktion bucht wie STU nach `commodity.sort` mit anteiliger Auffüllung; Wachstum und Auswanderung rechnen mit echtem Wohnraum (`maxPopulation`) über eine gemeinsame Funktion für Tick und Koloniedetail. PO: Fraktionsbonus fürs Koloniewachstum (Imperium 1,1) entfällt, Spalte per Migration entfernt. 415 Kolonie-Tests, Registrierung, PostgreSQL mit Migrationen, Typechecks und Lint erfolgreich. Status `claimed` – siehe [Ticket](issues/col-AUD-08b-tick-lagerbuchung-und-wachstum.md).

- 2026-11-18 – **Prüfpass sieben Tickets bis auf Browser bestanden** (col-AUD-15, sc-AUD-02, sc-AUD-07a, sc-AUD-08, sc-AUD-10, sh-AUD-05, sh-AUD-07a): Minutenläufe für Schildregeneration und Werftabschluss laufen an fehlerhaften Einträgen vorbei (`3ee68c69`); Fixtures an die STU-Startmodi aus sc-AUD-02 angepasst (`bd2ea161`). Gesamtlauf ohne Regression gegenüber `26ff9e76~1`; 139 vorbestehende PostgreSQL-Fehler (globale HTTP-403, `lastReports`) ohne Ticket.

- 2026-11-18 – **tmw-AUD-01a resolved** (Prüfpass: Review ohne Befund, Build und Lint grün; tmw-AUD-01b unblockiert). Umsetzung: Warenkontoplatz zählt wie STU nur den Bestand, in Anzeige und allen Platzprüfungen; Angebotsreserven belegen keinen Platz mehr (ersetzt tmw-T4a-Regel). `GET trade/overview` liefert `accountBoxes[]` mit Standort (Sichtbarkeit wie `listPosts`), Netz, Bestand, Angebotsreserven, Belegung/Überfüllung, gültigen Lizenzen, Bedingung, Eigentümerflag und NPC-Transferkapazität. 50 Unit- und 135 PostgreSQL-Trade-Tests, Lint und Typechecks erfolgreich; Abschlussreview und gemeinsamer Build ausstehend. Status `claimed`, tmw-AUD-01b weiter blockiert – siehe [Ticket](issues/tmw-AUD-01a-warenkonto-vertrag-erweitern.md).

- 2026-11-18 – **soc-AUD-07a resolved** (Browserprüfung durch Nutzer bestanden; 07b/07c/tmw-AUD-05 unblockiert) (Prüfpass behob 1000-Zeichen-Grenze für normale PMs und Fehlerantwort nach bereits zugestellter PM): Schnell-PM als Popup ohne Seitenwechsel und ohne Betreff für alle `PmLink`-Einstiege, Mitgliederübersicht, Systemansicht und Kontaktliste; NBS-Nachrichten laufen über dasselbe Popup und geben Crew-XP `FOREIGN_CONTACT_MESSAGE` wie STU. 847 Frontend- und 9 Backend-Tests, Lint und Typechecks erfolgreich; drei PO-Fragen (ungültiger NBS-Kontext, Kolonieziel, allgemeiner Kontexttyp) und Browserprüfung offen. Status `claimed`, soc-AUD-07b/07c und tmw-AUD-05 weiter blockiert – siehe [Ticket](issues/soc-AUD-07a-schnell-pm-popup-mit-kontext.md).

- 2026-11-18 – **soc-AUD-05 resolved** (Prüfpass: Review ohne Befund, PostgreSQL-Transferregressionen, Build und Lint grün). Umsetzung: Waren-, Crew-, Torpedo- und EPS-Transfer an fremde Schiffe fragen die Beziehung wie STU aus Sicht des Zielbesitzers; ein einseitig eingetragener Freund des Absenders reicht nicht mehr, auch nicht für geschützte Ziele. Allianz und Abkommen mit Freund-Recht bleiben symmetrisch. Gezielte Backend-Tests mit echtem Resolver (Gegenprobe rot auf altem Stand), Lint und Backend-Typecheck erfolgreich; Abschlussreview, PostgreSQL-/API-Regression und gemeinsamer Build ausstehend. Status `claimed` – siehe [Ticket](issues/soc-AUD-05-transferrecht-aus-sicht-des-ziels.md).

- 2026-11-18 – **sc-AUD-08 umgesetzt, Prüfung ausstehend**: Gemeinsame transaktionale Kampfvorbereitung mit Abdocken, Reparatur-/Retrofit-Abbruch, Warp/Tarnung aus und Alarmreaktion; manuelles Gelb schaltet Schilde/NBS/Strahlenwaffen mit EPS-Kosten. Rot bleibt nach dem Kampf erhalten; Schildtreffer setzen den persistenten Timer für sc-AUD-10. 164 gezielte Backend-Tests erfolgreich; Abschlussreview, PostgreSQL-/API-/Bewegungsregressionen, Browser, Lint/Typechecks und gemeinsamer Build ausstehend. Status `claimed` – siehe [Ticket](issues/sc-AUD-08-kampfvorbereitung-und-nachbereitung.md).

- 2026-11-18 – **sc-AUD-07a umgesetzt, Prüfung ausstehend**: Gemeinsamer STU-Matchup-Ablauf mit Erstschlag, Münzwurf, einmaligem Schiffzug, zufälligen Zielen und Einweg-Ursachen. Strikte NBS-/Waffen-/EPS-Feuerbedingungen, geteilte aktive-Schild-/Nettoschadensberechnung und lesbare Schiffszuordnung im Bericht. 76 gezielte Backend-Tests erfolgreich; Abschlussreview, PostgreSQL-/API-/Alarmregressionen, Browser, Lint/Typechecks und gemeinsamer Build ausstehend. Status `claimed`, sc-AUD-07b/sc-AUD-09 weiter blockiert – siehe [Ticket](issues/sc-AUD-07a-kampf-matchup-und-zielwahl.md).

- 2026-11-18 – **sc-AUD-02 umgesetzt, Prüfung ausstehend**: Zentrale STU-Startmodi, Scanner initial aus, Retrofit-Zustände ersetzt, einmalige Scanner-OFF-Migration vorbereitet. Scanner-Schalter (Subraum 30 EPS, Tachyon 1 EPS) und Signaturanalyse für 100 EPS mit ID-Auswahl und Anfragenschutz. 86 Backend- und 56 Frontend-Tests erfolgreich; PostgreSQL-Migration, Stations-/Sensorregressionen, Abschlussreview, Browser, Typechecks/Lint und gemeinsamer Build ausstehend. Status `claimed` – siehe [Ticket](issues/sc-AUD-02-systeme-aus-beim-bau-und-scanner-ui.md).

- 2026-11-18 – **col-AUD-15 umgesetzt, Prüfung ausstehend**: Teleskop zählt ungetarnte Schiffe und Stationen aller Zustände außer DESTROYED; eigene Tarnung und administrative RPG-Sichtbarkeit bleiben geschützt. Deutsche Energiefehler und Kategorienamen, ADR-/col-G1b-Abgleich. 16 Backend- und 5 Frontend-Tests erfolgreich; Abschlussreview, Lint, Typechecks, Tarnungsregression, visuelle Prüfung und gemeinsamer Build ausstehend. Status `claimed` – siehe [Ticket](issues/col-AUD-15-teleskop-scan-wie-stu.md).

- 2026-11-18 – **col-AUD-08a resolved** (Prüfpass: Review ohne Befund, Gesamtlauf ohne Regression; col-AUD-08b unblockiert). Umsetzung: Waren/Vorkommen → Wohnraum → Energie, deterministische Auswahl ohne Zentralen-Ausnahme und ohne pauschale 100-Runden-Grenze. 232 gezielte Tick-Tests und ein Snapshot erfolgreich; Abschlussreview, Lint, Typecheck, weitere Kolonie-Regressionen und gemeinsamer Build bleiben für den getrennten Prüfpass offen. Status `claimed`, col-AUD-08b weiter blockiert. Prüfablauf auf Nutzerwunsch in [Workflow](../../docs/agents/ticket-workflow.md) festgehalten – siehe [Ticket](issues/col-AUD-08a-tick-abschaltreihenfolge-und-wohnraum.md).

- 2026-11-18 – **col-AUD-07 resolved**: Upgrades aktiver Orbitalwartungsquellen deaktivieren und markieren ihre Verbraucher. Gemeinsamer Haupt-/Minutentick-Abschluss reaktiviert zulässige Verbraucher, meldet die Anzahl und bereinigt Markierungen auch bei fehlender Aktivierung, Ersatz oder Abriss. 253 Backend- und 4 Frontend-Tests sowie Typechecks, Lint ohne Fehler und Builds erfolgreich – siehe [Ticket](issues/col-AUD-07-reaktivierung-nach-upgrade.md).

- 2026-11-18 – **col-AUD-01 resolved**: Einzel- und Sammelreparatur im UI mit Backend-Kostenvorschau, Mangel-/Schadenshinweisen und Aktualisierung bei offenem Felddialog; laufende Reparaturen respektieren Koloniewechsel. Backend-Verhalten unverändert, Besitzer-/Kosten-/Baustellenfälle zusätzlich geprüft. 94 Frontend- und 21 relevante Backend-Tests, Typechecks, Lint ohne Fehler und Builds erfolgreich; visuelle Komponentenprüfung mit lokalen Fixtures über nativen Chrome-Zugriff nachgeholt – siehe [Ticket](issues/col-AUD-01-gebaeudereparatur-im-ui.md).

- 2026-11-17 – **soc-AUD-06 resolved**: PM-Mail als Opt-in mit vollständigem Klartext und STU-Betreff; Admin-Massennachricht wahlweise PM oder E-Mail an alle adressierten Nicht-NPCs. Atomare E-Mail-Versandansprüche verhindern doppelte Versuche. Fehler aller Tick-Läufe werden bei konfiguriertem `ADMIN_EMAIL` gemeldet, auch vor der Laufpersistierung. Bestandspräferenzen bleiben erhalten; Migration nur für Versandansprüche. 325 Backend-Unit-, 14 PostgreSQL- und 11 Frontend-Tests sowie Lint, Typechecks und Builds grün – siehe [Ticket](issues/soc-AUD-06-mails-wie-stu.md).

- 2026-11-17 – **sh-AUD-01 resolved**: Alle sechs Betriebs-/Rechtsflags entfernt; bestehende 24-h-Verifikation aus dem Main-Merge verpflichtend, Reset und Löschbestätigung/Widerruf immer verfügbar. Inaktivitätswartung läuft aktiv, Trockenlauf nur über `POST /api/admin/idle-users/preview`. Mail ohne SMTP lokal im Log, fehlender Produktionstransport als Startfehler im Log; Rechts-/Hilfelinks überall sichtbar. Fehlende `AccountToken`-Registrierung in der Anwendungsdatenquelle ergänzt. 83 Backend-Unit-Tests, 18 PostgreSQL-Tests und 20 Frontend-Tests sowie Lint, Typechecks und Builds grün – siehe [Ticket](issues/sh-AUD-01-feature-flags-entfernen.md). Tracker-Stand: alte Runde 278 resolved / 8 wontfix / 0 offen; Auditrunde 1 resolved / 92 ready-for-agent / 5 needs-triage / 2 needs-info / 3 ready-for-human.

- 2026-11-17 – **STU-Paritätsaudit**: Tiefer Abgleich gegen STU mit 103 Folgetickets `*-AUD-*` (ursprünglich 93 ready-for-agent, 18 × P1); Bericht und alle PO-Entscheidungen in [audit-2026-11-17/README.md](audit-2026-11-17/README.md), Abschnitte G–N. Damit **aufgehoben bzw. ersetzt** (die umsetzenden Tickets passen die Einträge an): Leitplanke 4 (Flags, sh-AUD-01); soc-F1b (sh-AUD-04); sh-AP-04c Urlaub (sh-AUD-05); tmw-FA1b1 Option 1c (sh-AUD-06); col-A6 b1 (col-AUD-14); col-G1b Zählweise (col-AUD-15); col-G3a/b/c (col-AUD-16a/b); sc-WP-STAT-3a (sc-AUD-11); sc-WP-COMBAT-2 Mitverteidiger (sc-AUD-07b); NPC-Teil sc-WP-TRACT-1b (sc-AUD-09); tmw-K7a/K7b (tmw-AUD-12a/b); tmw-T13 (tmw-AUD-09); PO-Entscheid in tmw-T2 Lizenzsicht (tmw-AUD-10); tmw-K6 (tmw-AUD-11); tmw-D6a (tmw-AUD-13); soc-D1 Pin (soc-AUD-03); soc-A4 PM-Mail (soc-AUD-06); ADR-0001 Punkt „Ämter“ (soc-AUD-09a); `diplomatie-kern-spec.md:169` (soc-AUD-10); `game-data` als Datenquelle (sh-AUD-02, needs-info). Bestätigt STU-gleich, kein Ticket: ADR-0004, Haltungsunabhängigkeit Traktor/Entern, sc-WP-CREW-3a Baucrew, Teleskopkarte, tmw-T3, soc-C1b.

- 2026-11-17 – SPEC-6: **wontfix**, bisherige Umsetzung auf ausdrücklichen Nutzerwunsch vollständig zurückgenommen. STUs Singularitätsreaktor erhält kein frei erfundenes Star-Wars-Pendant. Reservekern-Code, Oberfläche und sechs Spieldatenklassen entfallen; eine Folgemigration entfernt die historischen Trigger/Funktionen. Keine Ersatzmechanik beauftragt – siehe [Ticket](issues/sc-WP-SPEC-6-hypermaterie-reservekern.md). Der frühere Umsetzungseintrag ist aufgehoben; keine offenen Tickets.

- 2026-11-17 – SPEC-1/1a/1b/1c: **wontfix** auf ausdrückliche Nutzerentscheidung. Das STU-Tholianische Netz wird mangels eines passenden Star-Wars-Pendants für diesen Spielumfang nicht als Interdiktornetz umgesetzt. Aufbau/Projektor, Fangzustand/Bewegungssperre und Implosion entfallen vollständig; bewusste Ausnahme von der STU-Parität. Frühere Umsetzungsvorschläge sind aufgehoben, historische Planung bleibt erhalten – siehe [Parent](issues/sc-WP-SPEC-1-interdiktornetz.md). Damit bleiben keine offenen Umsetzungstickets in diesem Tracker.

- 2026-11-17 – SPEC-6: STU-Singularitätsreaktor als **Hypermaterie-Reservekern** umgesetzt. Romulanische Fertigung wird wie Tarntechnik dem Galaktischen Imperium zugeordnet; eingebaute Kerne bleiben bei Besitzerwechsel nutzbar. Sechs Originalklassen/-kosten, 85 Ladung aus 2 Kyber-Kristallen + 3 Antimaterie + 2 Plasma, Kapazität ×20 und Rumpf-/Modulfaktoren statt vorgeschlagener Basisleistung. Dauerhaft aktiv, proportionale Schadensleistung, Kernzerstörung schaltet Hyperantrieb aus, Reparatur startet ihn nicht mit. Gemeinsame Lade-/Tick-/Transfer-/Recyclingpfade, echter Werft-/Retrofit-Abschluss und lokale Migration geprüft; Spieldaten `f185012`, Pflicht-Gates grün – siehe [Ticket](issues/sc-WP-SPEC-6-hypermaterie-reservekern.md). Offen bleibt **SPEC-1a → 1b → 1c** zum Interdiktornetz.

- 2026-11-17 – SPEC-3: Eingebauter Kooperationsuplink für Sensorphalanx-Stationen nach STU umgesetzt: drei Fremdspieler mit je einer eigenen Crew, aktuelle Dockingrechte für Aufnahme, Rückholung auch bei Entzug/Ausfall, 0 EPS Aktivierung und 5 EPS/Tick. Eigentümercrew bleibt getrennt, Standby/Brownout behalten Gäste, passive Reparatur endet OFF. PostgreSQL prüft Konkurrenz, Rollback, Zerstörung und Demontage; Pflicht-Gates und lokale Migration erfolgreich. Crew-Ticketumfang und zusätzliche STU-Fernzugriffs-Prüfgrenze dokumentiert – siehe [Ticket](issues/sc-WP-SPEC-3-kooperationsuplink.md). Vier Tickets bleiben offen: SPEC-6 und SPEC-1a sowie blockierte SPEC-1b/1c.

- 2026-11-17 – SPEC-4: Nutzerentscheidung zur STU-Parität umgesetzt: Beamblocker als eingebautes Stationssystem, 0 EPS, zunächst OFF und Start nach Crewbereitstellung, im Standby dauerhaft aktiv. Vorhandene Transfers bleiben gemäß STU ohne Beamblocker-Sperre möglich. Crew-/Schadens-/Reparaturzustände sind persistent; tatsächliche passive Reparatur und Crew-Erfahrung geprüft. Tests, Lint/Typecheck, Builds und lokale Migration erfolgreich – siehe [Ticket](issues/sc-WP-SPEC-4-transferstoersender.md). Offen bleiben SPEC-3/6/1a sowie die zwei davon abhängigen Interdiktornetz-Folgetickets.

- 2026-11-17 – SPEC-2: Administrativer RPG-Transponder mit eigener Szenenverwaltung, vollständigen Spieler-Sichtbarkeitsfiltern und berechtigter Entfernung/Wiederveröffentlichung nach Commit umgesetzt. 0 EPS, unabhängig von CLOAK; laufende Aktionen/Kämpfe durch PostgreSQL-Sperren geschützt. Tests, Lint/Typecheck, Builds und lokale Migration geprüft – siehe [Ticket](issues/sc-WP-SPEC-2-rpg-transponder.md). Kein weiteres unmittelbar ausführbares Ticket; vier Produktentscheidungen und zwei blockierte Interdiktornetz-Folgetickets bleiben offen.

- 2026-11-16 – SPEC-5: Signaturmaskierung ist umgesetzt. Kosten sind 25 × Standard-Hyperantriebslevel des imitierten persönlich entdeckten mobilen Rumpfs; fünf Minuten, kostenlose Deaktivierung, dauerhafte Beendigung nach Antriebsausfall/-ausbau und historische Signatur-Snapshots. API und Schiffsauswahl sind geprüft, einschließlich 183 PostgreSQL-Tests. Siehe [Ticket](issues/sc-WP-SPEC-5-signaturmaskierung.md). SPEC-2 ist als nächstes ausführbar; die vier Produktentscheidungen bleiben offen.

- 2026-11-16 – Triage der sieben Resttickets: tmw-K1a2 als Fixture-/Regressionsauftrag, SPEC-2 und SPEC-5 ausführbar vorbereitet; SPEC-3/4/6 warten auf konkrete Ausstattungs-/Spieldatenentscheidungen. SPEC-1 ist nur als Tracking-Split in SPEC-1a/b/c resolved; das Interdiktornetz bleibt unimplementiert. Vier Empfehlungen sind im [Triage-Audit](triage-2026-11-16.md) ausdrücklich als Vorschläge markiert, nicht freigegeben. Der breite PostgreSQL-Bewegungslauf ist wegen einer veralteten LastCombatReport-Testfixture rot; isolierte Tests bestehen.

- 2026-11-16 – tmw-K10c – Adventstüren heißen **Lebenstag-Geschenke**, Sammelware 60 **Lebenstag-Marke**; Ostereier heißen **Frühlings-Kapseln** (Ware 73). Beide Waren sind gebunden und nicht im NPC-Handel. Je Saison entstehen fünf Anomalien; Lebenstag läuft 1.–24. Dezember, Frühlings-Kapseln entstehen Ostersonntag und verfallen nach sieben Tagen. Saisonbeginn entfernt alte Sammelwaren. Verbindlich sind die Ticketregeln (erster Nikolaus-Klick 500 Prestige plus Ware, letzte global verbrauchte Kapsel 500 Prestige); abweichende persönliche Limits/Bonus-Klicks der STU-Quellen werden nicht übernommen – siehe [Ticket](issues/tmw-K10c-saisonale-anomalien.md).

- sc-WP-STAT-6b – Allianzdepots sind organisatorische Zuordnungen eigener betriebsbereiter Versorgungsdepots/Logistikzentren zur aktuellen Allianz. Präsident und Vize erhalten eine reine Bestands-/Standortansicht. Mitgliederaustritt, Rauswurf, Auflösung und Reset bereinigen transaktional über `AllianceContextCleanup`; Stationslöschung/Demontage über FK-Cascade. Eigentum und Lade-/Steuerungsrechte bleiben bestehen – siehe [Ticket](issues/sc-WP-STAT-6b-allianzdepot.md).

- sc-WP-STAT-6a – Demontage übernimmt STU-Codebestätigung, halbe Bauzeit, halben rollenbezogenen Workbee-Bedarf und zweistufiges Zufallsrecycling. Gemäß Ticket wird die Station endgültig entfernt; Module gehen lagerbegrenzt an das erste eigene betriebsbereite angedockte Schiff nach ID. Der STU-Rückbau zum Konstrukt entfällt, Stationslagerverlust und Abdocken werden vorab angezeigt. `sc-WP-STAT-6b` bindet Depotzuordnungen per kaskadierender Stationsreferenz an diesen Löschpfad – siehe [Ticket](issues/sc-WP-STAT-6a-station-demontieren.md).

- sc-WP-SHUT-1 – Shuttles und Workbees sind startbare kleine Schiffe aus ihren echten Hangarwaren. Die passive Shuttlerampe startet mit voller konfigurierter EPS-Ladung und freier eigener Crew; Aufnahme und Kolonielandung erhalten Rumpf, Fracht und Crew. Plätze zählen auch Shuttle-Rümpfe in übernommener Fracht und verwenden das Maximum aus Rumpfplätzen und intakter installierter Rampenkapazität. Stationen und Stationsbau-Workbees teilen die Startmechanik; kein Standard-Deflektor für kleine Schiffe – siehe [Ticket](issues/sc-WP-SHUT-1-shuttles-als-schiffe.md).

- sc-WP-RES-2 – Das STU-Aggregationssystem heißt in SWU **Molekular-Raffinerie** (Ware 19012, SPECIAL-Fertigung mit Antriebsmodule Stufe I). Originale zehn Chargen und Rohwarenreferenzen bleiben erhalten; Rohwaren 63–72 erhalten SW-Namen und ergänzen unveränderte Standard-Nebel-/Asteroidenressourcen. Produzierbarkeit bedeutet wie STU einen durch eigene Forschung freigeschalteten Gebäudetyp mit positiver Zielwarenausgabe; ein vorhandenes Gebäude ist nicht erforderlich. Schiffe und Stationen teilen Auswahl, Laufzeitsystem und atomare Tickumwandlung; 15 EPS Aktivierung, 10 EPS je aktivem Tick – siehe [Ticket](issues/sc-WP-RES-2-umwandlungssystem.md).

- sc-WP-RES-1 – Der Bussard-Kollektor heißt in SWU **Ressourcen-Kollektor** (Ware 19011, Fertigung mit Antriebsmodule Stufe I). Feldtyp-Raten sind im Karteneditor konfigurierbar: Nebel liefern standardmäßig Tibanna-Gas, Asteroidenfelder Phrik-/Cortosis-Erz mit je 100 Einheiten/Tick. Aktivierung 15 EPS, laufend 10 EPS; volles Lager, Bewegung und ungültige Systemvoraussetzungen beenden die Förderung – siehe [Ticket](issues/sc-WP-RES-1-ressourcen-sammeln-mining.md).

- sc-WP-NAV-5b – Der Navicomputer-Sprung ist die einzige Langstreckensprung-Fähigkeit: freie passierbare Koordinate auf jeder persönlich bekannten, nicht verborgenen Ebene, ohne Route/Distanzkosten. Die vollständig vorvalidierte nicht fixierte Flotte springt atomar für 55 EPS je Schiff mit 300 Sekunden Spulen-Cooldown; Ziel-Feldeffekte gelten, Deflektor-Fluggebühren entfallen. Umsetzung und Prüfungen: [Ticket](issues/sc-WP-NAV-5b-transwarp-pendant.md).

- 2026-11-16 – sc-WP-CREW-3c – Fremde gerettete Crew wird pro Eigner an den nächsten erreichbaren Posten derselben Ebene überstellt (Manhattan-Distanz, aktuelle Benutzer-/Allianz-/Fraktionsrechte bei Stationsposten; eigenständige NPC-Posten öffentlich). Keine Übernahme des STU-Bugs, der den Posten des ersten Eigners für weitere Eigner wiederverwendet. Vier exklusive Crew-Standorte mit verlustfreiem Rollback-Schutz; wartende Crew wird bei Postenzerstörung in Kapseln evakuiert – siehe [Ticket](issues/sc-WP-CREW-3c-fremde-crew-an-handelsposten.md).

- 2026-11-16 – sc-WP-CLOAK-2a – STU-Tachyon-Scanner heißt in SWU **Gravitationswellenscanner** (Gravitationsanomalien als kanonnaher Tarnungsindikator); Ware 19003, Forschung 60400 und Fertigung verwenden denselben Namen. 10 EPS pro Scan, 3 EPS pro aktivem Tick, 300 s standortgebundene Erkennung für LSS-Zählungen und getarnte Sektorspuren; keine Freigabe von LSS-Schiffsdetails/NBS/Angriffen. Grenzen und atomare Abbuchung mit PostgreSQL geprüft – siehe [sc-WP-CLOAK-2a](issues/sc-WP-CLOAK-2a-tachyon-scan.md).

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
- 2026-11-18 – sh-AP-04c ersetzt: Urlaub exakt wie STU, wirksam erst nach mehr als 48 Stunden; nur Koloniewirtschaft/Crewlimit pausieren, Werftaufträge und Reparaturen laufen weiter. Sperre bis mehr als sieben Tage nach Aktivierung. Umsetzung/Prüfstatus siehe [sh-AUD-05](issues/sh-AUD-05-urlaub-exakt-wie-stu.md).
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
- 2026-10-21 – col-G1b – Option a: Teleskop-Scan zeigt momentan Schiffe je Rumpfkategorie, ohne Speicherung; Nachtrag ADR-0002; Scan-Zählweise durch PO-Entscheidung 2026-11-17 aufgehoben: ungetarnte Schiffe und Stationen aller Zustände außer DESTROYED, siehe col-AUD-15 (umgesetzt, Prüfung ausstehend).
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
- 2026-11-13 – sc-WP-UI-3a3 – Aus dem Review von `sc-WP-UI-3a1` abgeleitet: Orbitauftrag hält die Flotte wie in STU im Orbit (Flugsperre für den Flottenführer); Auflösen, Zerstörung und Traktorstrahl heben ihn über einen zentralen Abbruch mit `isBlockaded`-Sync und Eigner-Nachricht auf; beim Führerwechsel bleibt der Auftrag bei der Flotte; Kolonieansicht prüft den Flottenauftrag kolonieübergreifend
- 2026-10-30 – sc-WP-UI-1b – Gegen aktuellen Repository-Stand mit unveränderten Lint-/Typecheck-/Test-/Build-Gates erneut freigegeben; historische Research- und TS6305-Fehler sind weder stehende Blocker noch dauerhafte Baseline-Ausnahmen
- 2026-10-30 – sc-WP-STAT-5 – Kolonie und Raumwerft teilen einen quellneutralen Schiffbau-Kern sowie generalisierte Queue/Fertigstellung mit genau einem Ursprung `COLONY` oder `STATION`; dünne Adapter bewahren col-A3b, fertige Stationsschiffe docken an, keine Injection des ColonyShipyardService oder neue Modulzyklus-Workarounds
- 2026-10-28 – soc-E3b – Plotbeiträge sind immer HoloNet-Kategorie `ROLEPLAY`; eine abweichende Kategorie wird bei Plotzuordnung serverseitig überschrieben
- 2026-10-28 – sc-WP-CLEAN-2 – Das Tholianische Netz wird zum **Interdiktornetz**: ein kooperativ aufgebautes Fang- und Schadensfeld, passend zu imperialer Interdiktortechnik.
- 2026-10-28 – sc-WP-CLEAN-2 – Das RPG-Modul wird zum **RPG-Transponder**: rein administrative Szenenkennzeichnung mit Admin-Unsichtbarkeit, ausdrücklich kein taktisches Tarnsystem.
- 2026-10-28 – sc-WP-CLEAN-2 – Der Uplink wird zum **Kooperationsuplink**: Er erlaubt berechtigte fremde Crew auf Stationen und bleibt damit eine organisatorische Stationsfunktion.
- 2026-10-28 – sc-WP-CLEAN-2 – Der Beam-Blocker wird zum **Transferstörsender**: ein passives Feld, das Waren- und Crewtransfer blockiert.
- 2026-10-28 – sc-WP-CLEAN-2 – Die falsche Warpsignatur wird zur **Signaturmaskierung**: Flugsignaturen geben zeitweise einen bekannten fremden Rumpf vor und passen so zum feldweisen Galaxieflug.
- 2026-10-28 – sc-WP-CLEAN-2 – Historische Zuordnung des Singularitätsreaktors als **Hypermaterie-Reservekern**; am 2026-11-17 aufgehoben, Feature vollständig entfernt (SPEC-6 `wontfix`).
- 2026-10-29 – soc-A8 – Fraktionswillkommen wird als idempotente Systemnachricht vom **Oberkommando der Rebellenallianz** beziehungsweise **Imperialen Oberkommando** versandt.
- 2026-11-13 – tmw-T12a – Spieler-IDs beginnen wie in STU bei 100; Spielerhandelsnetze tragen die Eigentümer-ID und kollidieren nie mit den NPC-Netzen 1–3
- 2026-11-13 – tmw-T12c – Statt STU `USER_NOONE` hat ein verlassener Handelsposten keinen Eigentümer (`trade_posts.ownerId` nullable); SWU legt keinen Platzhalter-Spieler an
- 2026-11-13 – sh-AP-05b – Inhalte, die andere sehen, verlieren beim Löschen nur den Autor (`NULL`, Anzeige „Gelöschter Siedler“) statt eines Fallback-Kontos; Löschhandler können einen `prepare`-Schritt vor der Transaktion nutzen (Allianzaustritt)
- 2026-11-15 – tmw-K8b2 – Maintainer: Regionsmesspunkte wie STU zufällig ceil(25 %) der geeigneten Regionsfelder statt höchstens fünf deterministischer Punkte
- 2026-11-15 – tmw-K1b3 – Maintainer: Wie STU keine Routenvorschau für Feldkosten und Schaden; Kosten und Schaden zeigt nur der Sektorscan des aktuellen Felds (Feldtypwerte)
- 2026-11-15 – tmw-K1b2 – Wie STU (`ShipMover`/`FlightRoute`) laufen die PostFlight-Folgen für jedes aktive Schiff der Flotte statt nur für den Leader, in STU-Reihenfolge Deflektor → Feldeffekte → Anomalien; ihre Änderungen werden direkt nach dem Feld per Compare-and-set gespeichert, auch auf dem letzten Feld. `DEFLECTOR` ist wie `LIFE_SUPPORT` Standardsystem jedes Schiffs (SWU kennt keine Shuttles)
- 2026-11-15 – tmw-FA1b2 – Maintainer: Wie STU keine Fraktionsfaktoren für Schiffswerte; `hullMultiplier`, `shieldMultiplier`, `cargoMultiplier` entfernt
- 2026-11-15 – tmw-D5a – Datenbank-Awards wie STU: Rümpfe 25 („Raumfahrt gemeistert“), Planetentypen 50, Systemtypen 75, Sternensysteme je Ebene ein eigener Award (25)
- 2026-11-14 – sc-WP-COMBAT-1c – Maintainer: „Wir halten uns an STU.“ Alarmreaktionen und Flottenflug folgen STU (`AlertReactionFacade`, `ShipMover`): alle berechtigten Parteien in zufälliger Reihenfolge, kein Flugstopp durch den Kampf, Überlebende fliegen weiter; Führungswechsel bei Leaderverlust folgt in sc-WP-FLEET-4

## Erledigt

<!-- Eine Zeile je resolved Issue: ID – Kurzbeschreibung – Commit -->
- tmw-K8b3 – Regionskartographie in Feldkontext und Galaxiekarte bedienbar, ADR-0009, CONTEXT-Begriffe, Spec-Nachtrag – ed1899fa
- tmw-D4 – Datenbankkategorie „Regionen“ aus persönlichen Regionsentdeckungen, `???`-Maskierung, Ebenenfilter und Katalogfortschritt – 5a671a69
- tmw-K8b2 – Regionskartographie wie STU: 25 % zufällige Messpunkte, Messpunkte im Galaxieflug, Finalisierung mit genau einer Regionsentdeckung, 5 Prestige und Nachricht in einer Transaktion – d10ac298
- tmw-K8b1 – Kartographiepläne mit typisiertem Ziel SYSTEM/REGION (Exactly-one-Constraint, partielle Eindeutigkeit), persistente `RegionDiscovery` mit idempotentem Service – f610cf46
- tmw-K5e – Erkundete Ebenen nach Nebellöschung vollständig dargestellt, Systementdeckung unverändert; ADR-0008 und CONTEXT-Begriffe – 15425192
- tmw-K1b3 – Statt Routenvorschau wie STU: Sektorscan meldet Energiekosten, Spezial- und Deflektorausfall-Schaden des Feldtyps – 7015b894
- tmw-K1b2 – Deflektor als Standardsystem, STU-Spezialschaden je Feldtyp, Deflektorkosten/Feldschaden mit Zerstörung; Flugfolgen für jedes Flottenschiff und sofort persistiert – 346aeb89
- tmw-FA1b2 – Statt dynamischer Schiffsmultiplikatoren wie STU keine fraktionsabhängigen Schiffswerte; ungenutzte Hüllen-/Schild-/Frachtfaktoren entfernt – c1f305ad
- tmw-D5d – Datenbank-Hub zeigt Entdeckungsfortschritt je Kategorie (Sternensysteme je bekannter Ebene), globale Meldungen für neue Einträge und Awards – 32f9a833
- tmw-D5c – Sternensystemkatalog (`inDatabaseCatalog`, Testsystem ausgeschlossen, Admin-Schalter) als Nenner je Ebene; abgeschlossene Kartographie meldet Datenbankeintrag und prüft den Ebenen-Award – 4f34d57f
- tmw-D5b – Neue Entdeckung von Rumpf, Planetentyp oder Systemtyp meldet „Neuer Datenbankeintrag“ an den Spieler und prüft den Kategorie-Award (Port `DATABASE_DISCOVERY`), NPC ohne Prestige – 0b5782a0
- tmw-D5a – STU-Datenbank-Awards (Rümpfe, Planetentypen, Systemtypen, Sternensysteme je Ebene) mit Zuordnungstabelle und kategorieneutralem Completion-Service, Fortschritt per `GET /database/category-progress` – ba2dfc6a
- sc-WP-UI-3a3 – Orbitauftrag hält die Flotte wie STU fest (Flugsperre unter Flottensperre), zentraler Abbruch mit Nachrichten bei Auflösen/letzter Zerstörung/Traktor, Auftrag folgt dem Führer, Migration verwaister Aufträge – 71011cdd
- sc-WP-UI-3a2 – Feldkontext zeigt flottenweiten Orbitauftrag mit serverseitiger Verfügbarkeit (gleiche Policy wie Mutation, Port `ORBIT_ORDER_VIEW`), Aktionen im `FieldContextPanel` – bf07459c
- sc-WP-NAV-3b – Zeitbasierter Hyperraumsprung samt `IN_FLIGHT`, Ankunfts-Cron und Flugspalten entfernt; laufende Flüge per Migration auf den Ausgangsort zurückgesetzt – e093e694
- sc-WP-FLEET-4 – Führungswechsel wie STU bei Zerstörung des Flottenleaders (Nachfolger niedrigste ID, sonst Flotte löschen, Orbitauftrag zieht mit), Migration verwaister Flotten, Flug fliegt mit neuem Leader weiter – 9a5ed1e2
- sc-WP-COMBAT-1c – Alarmreaktion über den Bewegungsport nach STU: alle berechtigten Parteien in zufälliger Reihenfolge, Flug läuft mit Überlebenden weiter, Nachrichten an beide Seiten; Kampfberichte im Navigationspanel – 98ad951f, 88b7fbdd
- sc-WP-COMBAT-1a – System- und Galaxieflug liefern gemeinsamen `MovementResult`; neutraler Port `MOVEMENT_REACTIONS` kann die Route nach jedem Feld stoppen – 2355ce7b
- sh-AP-22 – Flaky `research.spec.tsx`: nach Nachmessung (40/40 einzeln, 10/10 unter Volllast) ohne weitere Änderung geschlossen; Korrektur war 14b86081
- sh-AP-13b – Spielereignisse (Ereignisse, Nachrichten, HoloNet, Logbuch) mit In-Universe-Datum „n NSY“ (reales Jahr − 2023), sonst reale Daten – f2f18dab
- sh-AP-10 – Admin-Massennachricht an alle oder eine Fraktion (ohne NPCs), idempotent per Sendungs-ID, optional E-Mail hinter `PLAYER_MAIL_NOTIFICATIONS_ENABLED` – 0cbbdb00
- sh-AP-08b – Admin blockiert Spieler (gepfefferter E-Mail-Hash in `blocked_users`, Marke 2, Registrierung/E-Mail-Änderung gesperrt) und setzt/hebt Löschverbot (Marke 3) – 315ecbc6
- sh-AP-06 – Inaktivitätslöschung: täglicher Handler mit STU-Fristen (91,5/183/3 Tage), Warnmails 48/24 h, Abschlussmail, Ausnahmen für Admins/NPCs/Löschverbot, hinter `IDLE_DELETION_ENABLED` (sonst Trockenlauf) – 615f3274
- sh-AP-05d – Kontolöschung: alle Kolonien inkl. Startkolonie werden über den Abgabe-Kern zu besitzerlosen Ruinen mit Gebäuden und Lager, Queues ohne Rückerstattung beendet, Blockaden aufgehoben – 403b969c
- sh-AP-05c – Kontolöschung: Schiffe ohne Wrack, Crew, Kapseln, Flotten, Blockaden, Traktorstrahlen, geteilte Baupläne ohne Besitzer, Entdeckungen und Forschungsbelohnungen – 04779aa5
- sh-AP-05b – Kontolöschung: Allianzaustritt vor der Transaktion (`prepare`), Nachrichten/HoloNet/News bleiben als „Gelöschter Siedler“, persönliche Daten, Invite-Keys und Prestige-Historie gelöscht – 04779aa5
- tmw-T12c – Zerstörte Station: STU-Bergungsregel (50 % je Zeile verloren, sonst 0–50 % ins Wrack), Posten samt Konten/Angeboten/Lizenzen entfernt, Inhaber benachrichtigt; Kontolöschung des Eigentümers verlässt den Posten (ohne Eigentümer, STU-Name), Handel und Einzahlungen gesperrt, Auszahlen bleibt – 59197c48
- tmw-T12b – Postenverwaltung in der Stationsansicht: Box „Handelsposten“ mit Netz, Lager, Lizenzbedingung und Lizenznehmern, Umbenennen per `PATCH trade/posts/:id` nur durch den Eigentümer (Name 3–40, Beschreibung ≤ 1000, bereinigt), Link zum Handel – d0c91470
- tmw-T12a – Fertiggestellter Außenposten erzeugt in derselben Transaktion einen Spielerhandelsposten (eigenes Netz = Eigentümer-ID, STU-Werte, unbefristete Eigentümerlizenz); Spieler-IDs ab 100, ein Posten je Feld, Stationen nicht traktorierbar – e5e4a545
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
- sh-AP-04c – Frühere Urlaubssemantik durch „Urlaub exakt wie STU“ ersetzt; Schiffsreparaturen und Werftaufträge laufen weiter, Wirtschaft/Crewlimit pausieren erst nach dem Vorlauf – siehe [sh-AUD-05](issues/sh-AUD-05-urlaub-exakt-wie-stu.md) (umgesetzt, Prüfung ausstehend).
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

- col-A6 – Demontage recycelt Module nach Integrität, vollständige Reaktorladungen und geladene Torpedos innerhalb der Lagergrenze; Werftpflicht, Fracht und Crew bleiben erhalten, Vorschau zeigt Rückgaben – siehe `issues/col-A6-demontage-nach-stu-regel.md`

- col-F3 – Top-10-Rangliste der besten Arbeitgeber aus zufriedenen Arbeitern aller Kolonien mit eigener Position und Verlinkung im Datenbank-Hub umgesetzt – siehe `issues/col-F3-rangliste-zufriedene-arbeiter.md`

- col-G3a – Eigentümergeschützte Sandbox-Kopien aller Koloniefelder mit CRUD, konfigurierbarem Limit (Standard 3, transaktional abgesichert) und schreibgeschützter Karte umgesetzt. Kopien bleiben beim Ersteller und überleben die Quellkolonie; eigene JSONB-Snapshots ohne Tick-/Ranglistenwirkung. Bau/Vorschau folgen in col-G3b/c – siehe `issues/col-G3a-kolonie-sandbox-datenmodell.md`

- col-G3b – Sandbox-Bau/Ersetzen, Abreißen, Upgrade, Terraforming und Einzel-/Massenschaltung sofort und kostenlos umgesetzt. Gemeinsame Live-Platzierungs-/Aktivierungsregeln, transaktionale Snapshot-Änderungen ohne Ressourcen, Queues, Nachrichten oder Hooks; Spielerlimits ersetzen die Quelle durch den Plan, Arbeiter werden aus dem Plan abgeleitet. Produktionsvorschau folgt in col-G3c – siehe `issues/col-G3b-kolonie-sandbox-bauen-und-schalten.md`

- col-G3c – Sandbox-Bilanz für Energie, Waren/Effekte/Vorkommen, Wohnraum, Arbeiter und Lebensstandard mit gemeinsamer Statistik-/Soziallogik und Differenztabelle zur aktuellen eigenen Quellkolonie umgesetzt. Basiswohnraum verhindert Doppelzählung; Besitzerwechsel/Aufgabe/Löschung entfernen den Live-Vergleich. Damit ist die Sandbox-Trilogie col-G3a bis col-G3c vollständig – siehe `issues/col-G3c-kolonie-sandbox-produktionsvorschau.md`

- sc-WP-CLOAK-2a – Gravitationswellen-Scan mit Modul/Fertigung, atomarem EPS-Verbrauch, fünfminütiger LSS-Erkennung, 18-h-Fenster für getarnte Flugsignaturen und automatischer Kartenaktualisierung umgesetzt; alle Pflicht-Gates und PostgreSQL-Test grün – siehe [Ticket](issues/sc-WP-CLOAK-2a-tachyon-scan.md).

- sc-WP-CLOAK-2b – Frisch aufgedeckte fremde getarnte Kontakte am eigenen Feld sind über die gemeinsame Angriffsregel angreifbar; akzeptierter Angriff enttarnt den Zielteilnehmer vor Kampfbeginn. NBS-Kennzeichnung und Ablaufaktualisierung, übrige Aktionen und Urlaubsschutz bleiben gesperrt bzw. wirksam; vollständige Tests und Pflicht-Gates grün – siehe [Ticket](issues/sc-WP-CLOAK-2b-getarntes-ziel-angreifen.md).

- sc-WP-CREW-3c – Fremde Kapselcrew an erreichbare Handelsposten, atomare Systemnachrichten, erweiterte Verschollenenliste und autorisiertes Ablegen/Abziehen einzelner Crewmitglieder in Kapseln umgesetzt. Migration, Postenzerstörung und Nachrichten-Rollback mit PostgreSQL geprüft; alle Pflicht-Gates grün – siehe [Ticket](issues/sc-WP-CREW-3c-fremde-crew-an-handelsposten.md).

- sc-WP-ENG-4 – Warenentsorgung im Schiffslager mit Mengenfeldern und „alles“, Eigentümer-/Hyperraumsperre, bestandsbegrenzter transaktionaler Vernichtung und Meldung je Ware umgesetzt. PostgreSQL prüft Parallelität und Rollback; vollständige Tests und Pflicht-Gates grün – siehe [Ticket](issues/sc-WP-ENG-4-schiffsmuelleimer.md).

- sc-WP-FLEET-3 – Persistentes Ein-/Ausblenden von Flotten in der Schiffsliste und „Nach oben“ mit stabiler übriger Reihenfolge umgesetzt. Eigentümergeschützte transaktionale API, Migration und PostgreSQL-Prüfung für Parallelität, Flottenverlegung und Rollback; alle Pflicht-Gates grün – siehe [Ticket](issues/sc-WP-FLEET-3-flottenpflege.md).

- sc-WP-NAV-2c – Admin-Flugsignaturen im Vollkarteneditor mit Ausschnittsabfrage, Schiff-/Spieler-/Allianzfilter und Richtungs-Linienoverlay umgesetzt. Unterschiedliche Schiffe je Richtung statt mehrfacher Spuren zählen; HTTP-Adminschutz, PostgreSQL-Aggregation und asynchrone Canvas-/Filtertests geprüft, alle Pflicht-Gates grün – siehe [Ticket](issues/sc-WP-NAV-2c-admin-signaturansicht.md).

- sc-WP-NAV-5b – Hyperraum-Spule, Fertigung und Navicomputer-Zielwahl mit atomarem Flottensprung, richtungslosen Signaturen, Sperr-/Rollback-Tests und zeitbasiertem Cooldown umgesetzt; alle Pflicht-Gates grün – siehe [Ticket](issues/sc-WP-NAV-5b-transwarp-pendant.md).

- sc-WP-RES-1 – Ressourcen-Kollektor mit Fertigung, editierbaren Feldtyp-Ressourcen, Ressourcenwahl/Status in der Schiffskontrolle und atomarer lagerbegrenzter Tickförderung samt Flugabbruch umgesetzt. Migration auch in der lokalen Dev-DB eingespielt; vollständige Pflicht-Gates und 20 PostgreSQL-Tests grün – siehe [Ticket](issues/sc-WP-RES-1-ressourcen-sammeln-mining.md).

- sc-WP-RES-2 – Molekular-Raffinerie mit Fertigung, auswählbaren STU-Chargen, erneutem Produktionsfreigabecheck je Tick und gemeinsamer Schiff-/Stationsumwandlung umgesetzt. Rohwaren sammelbar, Datenmigration lokal angewendet; vollständige Pflicht-Gates und 48 gemeinsame PostgreSQL-Tests grün – siehe [Ticket](issues/sc-WP-RES-2-umwandlungssystem.md).

- sc-WP-SHUT-1 – Passive Shuttlerampe und Shuttle-Management für Schiffe/Stationen mit Start, verlustfreier Aufnahme und Kolonielandung umgesetzt. Gemeinsame Workbee-Erstellung, echte Hangarwaren und Varianten, atomare EPS-/Crew-/Kapazitätsprüfungen; alle Pflicht-Gates und 33 PostgreSQL-Tests grün, Migration lokal angewendet – siehe [Ticket](issues/sc-WP-SHUT-1-shuttles-als-schiffe.md).

- sc-WP-STAT-6a – Stationsdemontage mit MD5-Bestätigung, persistentem Fortschritt, Workbee-Pausierung und STU-Modulrecycling an ein eigenes angedocktes Schiff umgesetzt. Station und gebundene Daten werden entfernt, alle Schiffe abgedockt; Crewzuweisung gesperrt und Status nach Kampf erhalten. Vollständige Pflicht-Gates und 15 PostgreSQL-Tests grün, Migration lokal angewendet – siehe [Ticket](issues/sc-WP-STAT-6a-station-demontieren.md).

- sc-WP-STAT-6b – Eigene Depotstationen der aktuellen Allianz zuordnen/lösen und Bestands-/Standortansicht für Präsident/Vize umgesetzt. Austritt, Rauswurf, Auflösung, Reset und Demontage bereinigen atomar ohne neue Entnahme-/Steuerungsrechte. Pflicht-Gates und 18 PostgreSQL-Tests grün, Migration lokal angewendet – siehe [Ticket](issues/sc-WP-STAT-6b-allianzdepot.md).

- sc-WP-UI-4 – Letzter Kampfbericht an überlebenden Schiffen mit Eigentümerschutz, Icon/Dialog und PostgreSQL-Prüfung umgesetzt; alle Pflicht-Gates grün – siehe [Ticket](issues/sc-WP-UI-4-letzter-kampfbericht-am-schiff.md).

- soc-A4 – PM-Mail nach Zustellung hinter Betreiber-Flag und Empfänger-Opt-in, ohne Inhalt und ohne Blockieren der Nachricht umgesetzt; alle Pflicht-Gates grün – siehe [Ticket](issues/soc-A4-email-bei-neuer-pm.md).

- soc-A7 – Eigene persönliche Nachrichtenordner als zweite Ebene mit atomarem Verschieben, Sortieren und Rückverschiebung beim Löschen umgesetzt. Feste Zähler unverändert; alle Pflicht-Gates und 5 PostgreSQL-Tests grün – siehe [Ticket](issues/soc-A7-eigene-nachrichtenordner.md).

- soc-F3a – Öffentliche Online-Listen berücksichtigen das standardmäßig aktive `show_online_status`-Opt-out, Allianzstatus bleibt sichtbar. UI und alle Pflicht-Gates geprüft – siehe [Ticket](issues/soc-F3a-online-status-sichtbarkeit.md).

- soc-F3b – Standard, heller Kontrast und Fraktionsakzent über globale Design-Tokens, sofortige/persistierte Auswahl und Allowlist umgesetzt; alle Pflicht-Gates grün – siehe [Ticket](issues/soc-F3b-farbschema.md).

- soc-F3d – Flottenfixierung und Reaktor-Übertrag als validierte Erzeugungsstandards, zentral beim Insert über alle Erzeugungswege angewandt. Bestehende Objekte unverändert; alle Pflicht-Gates und PostgreSQL-Prüfungen grün – siehe [Ticket](issues/soc-F3d-flotten-und-reaktor-standards.md).

- soc-I1c – Eingeschränkt formatierte Spielernamen mit getrenntem Klartext/Markup, Eindeutigkeitsindex und zentralem PlayerName-Renderer in den Namensanzeigen umgesetzt. Suche, Titel und Mails bleiben Klartext; alle Pflicht-Gates und PostgreSQL-Prüfung grün – siehe [Ticket](issues/soc-I1c-bbcode-in-spielernamen.md).

- tmw-K10c – Kalendergesteuerte saisonale Anomalien, geschützte Öffnen-Aktion, Sammelwaren und Sonderprestige samt Historie umgesetzt. Alle Pflicht-Gates und acht PostgreSQL-Tests grün; Migration lokal angewendet – siehe [Ticket](issues/tmw-K10c-saisonale-anomalien.md).

- Triage-2026-11-16 – Sieben Resttickets gegen Baseline/STU/Tests geprüft, drei sofort ausführbare Aufträge sowie zwei abhängige Interdiktornetz-Kinder vorbereitet, vier konkrete Entscheidungsfälle dokumentiert. Kein Feature-Code geändert – siehe [Audit](triage-2026-11-16.md).

- tmw-K1a2 – Flotten-Flugfolgen durch sieben echte PostgreSQL-Fälle für vier Flugpfade, Mitglieder-/Leaderverlust und vollständige Zerstörung abgesichert. Veraltete Kampfbericht-Fixture und fehlende Wrack-/Notruf-Metadaten repariert; 49 Integrationstests, 34 Unit-Tests, Lint/Typecheck grün. Produktionsfluglogik bereits korrekt – siehe [Ticket](issues/tmw-K1a2-flugfolgen-fuer-alle-flottenschiffe.md).
