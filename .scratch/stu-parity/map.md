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

- 2026-10-21 – col-A2 – Option b: Modul-/Torpedofertigung nach STU (EPS je Stück, Kürzung, Aufstocken, Teilabbruch 100 %, Fertigstellung im Tick, Torpedos sofort)
- 2026-10-21 – col-A3b – Option b: Werft mit Rumpf-EPS-Kosten und einem Auftrag je Werftfunktion
- 2026-10-21 – col-A5 – Option b: Werftreparatur passiv in Schritten mit Ersatzteilverbrauch und Slots; Vorabzahlung entfällt
- 2026-10-21 – col-D5 – Option a: SWU-Forschungsqueue (10 Slots, Auto-Pfad, Fortschritt bleibt) bleibt; ADR, kein Umbau
- 2026-10-21 – col-E1b – Option b: Kolonielimits aus Forschungsdaten wie STU; fester Deckel 3/3/1 entfällt
- 2026-10-21 – sc-WP-CLEAN-1 – Option a: freie Modul-Endpunkte ersatzlos entfernen
- 2026-10-21 – sc-WP-CREW-2 – Option a: STU-Expertisemodell vollständig (Skills, 10 Ränge mit SW-Namen, Beförderungslimits)
- 2026-10-21 – sc-WP-ENG-3b – Option a: passive 1-%-Modulreparatur entfällt; Reparatur nur Werft, Station, Eigenreparatur
- 2026-10-21 – sc-WP-NAV-3 – Option b: kein zeitbasierter Hyperraumsprung; feldweiser STU-Galaxieflug, Langstreckensprung nur über sc-WP-NAV-5b; ADR + Rückbau-Folgeissue
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
- 2026-10-21 – col-A8 – Option a: STU-Komponentensatz 1:1 mit Star-Wars-Namen
- 2026-10-21 – col-A9 – Option b: Jägerwerft baut Rümpfe ins Lager, Start über Hangar
- 2026-10-21 – col-E2 – Option a: Ruinenmodell der Kolonieabgabe bleibt; ADR, kein Umbau
- 2026-10-21 – col-G1b – Option a: Teleskop-Scan zeigt momentan Schiffe je Rumpfkategorie, ohne Speicherung; Nachtrag ADR-0002
- 2026-10-21 – col-G3a – Option a: Kolonie-Sandbox vollständig, Höchstzahl 3 je Spieler (Vorschlag übernommen, konfigurierbar)
- 2026-10-21 – col-G3b – folgt col-G3a (Option a): umsetzen
- 2026-10-21 – col-G3c – folgt col-G3a (Option a): umsetzen
- 2026-10-21 – sc-WP-CREW-4a – Option a: Entern wie STU gegen jedes fremde ungeschildete Schiff, auch in der eigenen Fraktion
- 2026-10-21 – sc-WP-CREW-4b – Option a: Übernahme unbemannter Schiffe wie STU gegen jeden Spieler
- 2026-10-21 – sc-WP-RES-1 – Option a: Ressourcensammeln (Tibanna-Gas aus Nebeln, Erze aus Asteroiden) per Spezialsystem
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

## Erledigt

<!-- Eine Zeile je resolved Issue: ID – Kurzbeschreibung – Commit -->
- col-A1a – Werftqueues reagieren zentral auf Gebäudestatus und Abriss – siehe Feature-Commit
- col-A1b – Fabrikation, Akademie und Schilde reagieren auf Gebäudestatus – siehe Feature-Commit
- col-A10 – Phalanx-Torpedotypen sind an abgeschlossene Forschung gebunden – siehe Feature-Commit
- col-A3a – Werftbau und Umrüstung prüfen Blockade, Crew-Maximum und Spezialslots – siehe Feature-Commit
- col-A4 – Baupläne mit Löschsperren, Duplikatsignaturen und Namensvalidierung gehärtet – siehe Feature-Commit
- col-A7 – Akademie-Tick berücksichtigt Aktivität, Crewlimits und Ausbildungslimit – siehe Feature-Commit
- col-B1 – Arbeitslose wandern bei Überbelegung und überschrittenem Bevölkerungslimit aus – siehe Feature-Commit
- col-C1 – Gebäudeschaltung bietet Gruppenaktionen und warenbezogene Massensteuerung – siehe Feature-Commit
- col-C2 – Baumenü lässt sich nach Feld und produzierter Ware filtern – siehe Feature-Commit
- col-D1 – Forschungsabschluss meldet sich im Kolonie-Ordner und aktualisiert die UI live – siehe Feature-Commit
- col-D3a – Forschungsliste und -detail zeigen Bilder, Abschlussdatum, Folgeforschungen sowie Rumpf-/Modulfreischaltungen – siehe Feature-Commit
- col-D4 – Forschungsdaten tragen validierte explizite Fraktionen; EXCLUDE-Import und -Richtung entsprechen STU – siehe Feature-Commit
- col-D5 – SWU-Forschungsqueue mit zehn Plätzen, Auto-Pfad und Fortschrittserhalt als bewusste STU-Abweichung dokumentiert – siehe Feature-Commit
- col-F2 – Warenmetadaten, Beam- und Kontobindungsregeln sowie sortierte sichtbare Lageranzeigen umgesetzt – siehe Feature-Commit
- sc-WP-FLEET-1a – Flottenverwaltung und Schiffsaktionen vollständig – siehe Feature-Commit
- sc-WP-COMBAT-2 – Mehrparteienkampf für Flotten und alarmierte Mitverteidiger – siehe Feature-Commit
- sc-WP-COMBAT-3 – Kampfprestige, intakte Module im Wrack und globale Zerstörungshistory – siehe Feature-Commit
- sc-WP-CLEAN-1 – Freie Modulinstallation, -aufrüstung und -entfernung aus der Spieler-API entfernt – siehe Feature-Commit
- sc-WP-CREW-1 – Crewposten, Crewdetails und Umbenennen am Schiff umgesetzt – siehe Feature-Commit
- sc-WP-NAV-2a – Flugsignaturen, Sichtbarkeitsfenster, Verfall und Schiff-Sektor-Scan – siehe Feature-Commit
- sc-WP-STAT-0 – ADR für Stationsmodell, Stationsrollen, Docking und Allianzverträge – siehe Feature-Commit
- sc-WP-FLEET-2 – Flottenflug, Fixierung und flottenweites Abfangen – siehe Feature-Commit
- sc-WP-FLEET-1b – Schiffsliste nach Flotten und Einzelschiffen gruppiert – siehe Feature-Commit
- sc-WP-UI-1a – Schiffsliste mit STU-Informationsdichte und Laufzeitstatus – siehe Feature-Commit
- sh-AP-01 – Sicherer, konfigurierbarer Passwort-Reset mit wiederverwendbaren Account-Tokens – siehe Feature-Commit
- sh-AP-07a – Tägliches Maintenance-Gerüst und explizite Spielzeitzone – siehe Feature-Commit
- sh-AP-09 – Login und Session mit sicherem JWT-Secret, serverseitigem Logout und Account-Prüfungen gehärtet – siehe Feature-Commit
- sh-AP-11 – Gemeinsame cursorfolgende, touch- und tastaturfähige Tooltip-Komponente – siehe Feature-Commit
- sh-AP-12 – Seitenkopf mit Breadcrumb, Seitentitel und persistenter Meldungsbox – siehe Feature-Commit
- sh-AP-13a – Design-Tokens, Spieltabellen, Zahlenformatierung und deutsche UI-Texte vereinheitlicht – siehe Feature-Commit
- soc-A1 – PM-Serverregeln, Ignorier-Haken und Antwortverlauf umgesetzt – siehe Feature-Commit
- soc-D1 – HoloNet-Längenregeln, Soft-Delete, Beteiligten-Benachrichtigungen, Bewertungsbalken und Compose-Lesezeichen umgesetzt – siehe Feature-Commit
- tmw-D0 – Elf Systemdatenbank- und Astrometrie-Spec-Issues gegen Code, Tests und Historie abgeglichen; Restlücken als tmw-D0a/b erfasst – siehe Feature-Commit
- tmw-D1 – Warenübersicht mit eigenen Lagerorten und erweiterbarem Quellen-Port umgesetzt – siehe Feature-Commit
- tmw-W1 – Handels-NPC-Konten mit zentralen Ausschlüssen, Handelsnachrichten und Adminpflege umgesetzt – siehe Feature-Commit
