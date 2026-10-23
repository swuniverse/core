# Offene Produktentscheidungen (needs-info)

> Übertragen am 2026-10-21 – Status siehe Issues.

Antwort je Zeile: Buchstabe der Option bzw. Text ins Feld **Antwort** schreiben. Danach überträgt ein Agent (oder du) die Antwort ins jeweilige Issue (`## Comments`), setzt `**Status:** ready-for-agent` und trägt die Entscheidung in `map.md` → Entscheidungen ein.

Abkürzung: **„alle Empfehlungen übernehmen“** ist eine gültige Gesamtantwort.

### P2 · [Modul- und Torpedofertigung nach STU-Regeln](issues/col-A2-modul-und-torpedofertigung-nach-stu-regeln.md)
- **Frage:** Sollen Modul- und Torpedofertigung exakt nach STU funktionieren?
- **Empfehlung:** (b). Die EPS-Kosten machen Energie als Ressource relevant und die Regeln sind klar umrissen; die SWU-Zeitqueue hat keinen dokumentierten Grund.
- **Antwort:** b

### P2 · [Werft: EPS-Kosten und ein Auftrag je Werft](issues/col-A3b-werft-eps-kosten-und-ein-auftrag-je-werft.md)
- **Frage:** Soll die Werft STU-Regeln für Energie und Belegung übernehmen?
- **Empfehlung:** (b). Ohne Belegungssperre skaliert die Flottenproduktion nicht mehr über die Zahl der Werften, und EPS bleibt sonst für den Schiffsbau bedeutungslos.
- **Antwort:** b

### P2 · [Schiffsreparatur in der Werft passiv in Schritten](issues/col-A5-schiffsreparatur-passiv-in-schritten.md)
- **Frage:** Ist die SWU-Vorabzahlung mit Einmal-Abschluss eine bewusste Vereinfachung?
- **Empfehlung:** (b), sobald Ersatzteile über sc-WP-ENG-3 im Spiel sind; sonst fehlt der Verbrauchsgegenstand.
- **Antwort:** b

### P2 · [Forschungsqueue und Abbruchregeln festlegen](issues/col-D5-forschungsqueue-und-abbruchregeln.md)
- **Frage:** Welche Forschungsqueue gilt in SWU?
- **Empfehlung:** (a). Die SWU-Queue ist ein deutlicher Komfortgewinn ohne Balance-Nachteil, da die Forschungsgeschwindigkeit unverändert ist; nur die ADR fehlt.
- **Antwort:** a

### P2 · [Kolonielimits aus Forschungsdaten](issues/col-E1b-kolonielimits-aus-forschungsdaten.md)
- **Frage:** Ist das heutige SWU-Limitmodell (Basis 1 + Fraktionstechs, Deckel 3/3/1) bewusst?
- **Empfehlung:** (b), weil die Limits dann datengetrieben im `game-data`-Repo pflegbar sind und keine hartkodierten Tech-IDs mehr nötig sind; ein Deckel ließe sich bei Bedarf über die Daten abbilden.
- **Antwort:** b

### P2 · [Freie Modulinstallation am Schiff entfernen oder auf Admin beschränken](issues/sc-WP-CLEAN-1-freie-modulinstallation.md)
- **Frage:** Werden Module ausschließlich über Werft und Umrüstung geändert?
- **Empfehlung:** (a), solange kein Admin-Bedarf bekannt ist; Admin-Spawn deckt Testfälle ab.
- **Antwort:** a

### P2 · [Crew-Expertise, Ränge und Beförderung](issues/sc-WP-CREW-2-raenge-expertise-befoerderung.md)
- **Frage:** Soll SWU das STU-Expertisemodell vollständig übernehmen?
- **Empfehlung:** (a), weil Paritätsziel und weil die Ereignisquellen bereits in vielen geplanten Issues anfallen; Ränge erhalten SW-Namen (z. B. Kadett, Fähnrich, Leutnant, Commander, Captain, Commodore, Admiral).
- **Antwort:** a

### P2 · [Passive Modulreparatur an STU-Regel ausrichten?](issues/sc-WP-ENG-3b-passive-modulreparatur-klaeren.md)
- **Frage:** Soll die passive Modulreparatur von 1 % je Tick an jedem Ort bleiben?
- **Empfehlung:** (a), sobald sc-WP-ENG-3 umgesetzt ist, weil Ersatzteile und Werftreparatur sonst kaum Bedeutung haben.
- **Antwort:** a

### P2 · [Hyperraumflug-Modell klären (ADR)](issues/sc-WP-NAV-3-hyperraumflug-modell-adr.md)
- **Frage:** Bleibt der zeitbasierte Hyperraumsprung zwischen Systemen eine bewusste SWU-Abweichung?
- **Empfehlung:** (a), weil der Zeitsprung Star-Wars-kanonisch ist und bereits produktiv genutzt wird; das Transwarp-Pendant baut dann auf Hyperraumrouten auf.
- **Antwort:** b

### P2 · [Traktorstrahl auf fremde Schiffe und Entkommen](issues/sc-WP-TRACT-1b-traktor-auf-fremde-schiffe.md)
- **Frage:** Dürfen fremde Schiffe per Traktor gezogen werden, und welche Haltung ist nötig?
- **Empfehlung:** (a) mit Ausnahme Urlauber, weil STU-Taktik (Abschleppen geschlagener Gegner) davon lebt und Schilde bereits Schutz bieten.
- **Antwort:** a

### P2 · [Kolonieangriff vom Schiff aus (UI-Einstieg)](issues/sc-WP-UI-3b-kolonieangriff-einstieg.md)
- **Frage:** Soll der Kolonieangriff wie in STU (`AttackBuilding`) gezielt ein Gebäude bzw. Feld treffen, oder bleibt der heutige SWU-Angriff auf die ganze Kolonie (Abweichung ohne ADR)?
- **Empfehlung:** (a), weil STU-Parität das Ziel ist und die Kolonie-Oberflächenansicht bereits existiert.
- **Antwort:** a

### P2 · [System-News auf Startseite und Login](issues/sh-AP-02-system-news.md)
- **Frage:** Woher kommen die öffentlichen System-News?
- **Empfehlung:** (a). Die HoloNet-Kategorie `NEWS` ist heute Standardkategorie für alle Spieler; (b) bräuchte ein zusätzliches Offiziell-Flag und würde HoloNet-Regeln (soc-D1) mit öffentlicher Sichtbarkeit vermischen.
- **Antwort:** a

### P2 · [Urlaubsmodus: Tickwirkung und Sperrfrist](issues/sh-AP-04c-urlaubsmodus-tickwirkung-und-sperrfrist.md)
- **Frage:** 1. Welche Tickwirkung soll der Urlaub haben?
- **Empfehlung:** (a), funktionale Parität und schon in der Inventur so beschrieben.
- **Antwort:** 1a, 2a

### P2 · [Kontolöschung: Umgang mit Kolonien](issues/sh-AP-05d-kontoloeschung-kolonien.md)
- **Frage:** Was passiert mit den Kolonien eines gelöschten Kontos?
- **Empfehlung:** (a), konsistent mit der Empfehlung in col-E2; ein zweiter Pfad mit anderem Endzustand wäre schwer zu erklären.
- **Antwort:** a

### P2 · [Zeitzone der Ticks festlegen](issues/sh-AP-07c-zeitzone-der-ticks-festlegen.md)
- **Frage:** In welcher Zeitzone sollen die Tickstunden gelten?
- **Empfehlung:** (a). Die Spielerschaft ist deutschsprachig, und die STU-Stunden sind auf deutsche Abendzeiten ausgelegt.
- **Antwort:** a

### P2 · [Spielstatus „Tick läuft“](issues/sh-AP-20-spielstatus-tick-laeuft.md)
- **Frage:** Soll SWU Spieleraktionen während des Hauptticks sperren?
- **Empfehlung:** (a). Der Haupttick verarbeitet Kolonien und Schiffe in Batches über mehrere Transaktionen; eine kurze Sperre ist einfacher und robuster als lückenlose Zeilensperren in allen Diensten. Die Dauer des Ticks sollte dafür vorab im Tick-Admin (sh-AP-07b) gemessen werden.
- **Antwort:** a

### P2 · [Rangliste „Die Top 10 der Vielflieger“ (anonym)](issues/tmw-D3-vielflieger-rangliste.md)
- **Frage:** Woraus wird die Rangliste gezählt, und wird die STU-Belohnung übernommen?
- **Empfehlung:** (a) mit (i), also STU-Parität ohne zweite Datenquelle. Die Prestigekonstanten `TOP_TEN_*` sind bereits angelegt.
- **Antwort:** a

### P2 · [Datenbankkategorie „Regionen“](issues/tmw-D4-datenbankkategorie-regionen.md)
- **Frage:** Was erzeugt den Regions-Datenbankeintrag?
- **Empfehlung:** (a) jetzt umsetzen, mit `STU_PRESTIGE.CARTOGRAPHY_REGION` als Entdeckungsprestige. Falls tmw-K8b später beschlossen wird, wechselt die Quelle auf die Kartographie, und das wird in einer ADR dokumentiert.
- **Antwort:** b

### P2 · [Fraktionsattribute, Teil 2: Wählbarkeit, Spielerlimit, wirksame Boni](issues/tmw-FA1b-fraktionswahl-limits-und-boni.md)
- **Frage:** 1. **Fraktionswahl:**
- **Empfehlung:** 1(c) für die Closed Alpha, (b) später. 2(a) nur mit Balancing-Werten des Product Owners, sonst (c).
- **Antwort:** 1c, 2a

### P2 · [Feldtyp-Flugkosten, Feldschaden und Deflektor](issues/tmw-K1b-feldtyp-flugkosten-feldschaden-deflektor.md)
- **Frage:** 1. **Energiemodell:** SWU berechnet Flugenergie heute als `shipClass.flightEnergyCost × Distanz`, ohne den Feldtyp. STU rechnet `flight_ecost` des Rumpfs je Feld **plus** `ecost` des Feldtyps für den Deflektor.
- **Empfehlung:** 1(a), 2(b) (weniger neue Systeme, Schilde tragen in Star Wars ohnehin die Deflektorrolle), 3 bis zur Entscheidung zu sc-WP-NAV-3 nur das Ankunftsfeld.
- **Antwort:** 1a, 2a

### P2 · [Ebenenkenntnis je Spieler und Kartenzyklus](issues/tmw-K5-ebenenkenntnis-und-kartenzyklus.md)
- **Frage:** 1. **Wie wird eine Ebene bekannt?**
- **Empfehlung:** 1(a), 2(b). Das Zurücksetzen des Nebels würde in SWU auch Kartographie- und Systemwissen (ADR-0002/0003) berühren und bräuchte eine eigene ADR.
- **Antwort:** 1a, 2a

### P2 · [Wurmloch-Zugangsbeschränkungen](issues/tmw-K7b-wurmloch-zugangsbeschraenkungen.md)
- **Frage:** Wer verwaltet Wurmloch-Zugangsregeln in SWU? In STU ist das der Betreiber der Station am Wurmlocheingang. SWU hat noch keine Stationen.
- **Empfehlung:** (c). Die Admin-Pflege kommt jetzt, die Stationsbetreiber-Rolle folgt als eigenes Issue, sobald es Stationen gibt.
- **Antwort:** b

### P2 · [Regionskartographie](issues/tmw-K8b-regionskartographie.md)
- **Frage:** Soll die Regionskartographie aufgenommen werden? Die Spec `stu-messpunkt-systemkartographie` und ADR-0003 schließen sie bisher aus („STU-Kartenregionen bleiben außerhalb dieses Vorhabens“).
- **Empfehlung:** (a), aber erst nach tmw-D4 mit Quelle „Betreten“, damit Regionen schon vorher in der Datenbank erscheinen.
- **Antwort:** a

### P2 · [Wirkung des Handelsabkommens und des Fraktions-Handelsmodifikators](issues/tmw-T13-wirkung-handelsabkommen-und-handelsmodifikator.md)
- **Frage:** Welche konkrete Wirkung haben Handelsabkommen und `tradeModifier`?
- **Empfehlung:** 1(a) mit kostenloser Lizenz am Spielerposten des Partners (einfach, spürbar, ohne Folgen für die Kursbalance). 2(b), solange beide Fraktionen 1 haben, um toten Code zu vermeiden.
- **Antwort:** 1a,2b

### P2 · [Warenkonto ↔ Schiff (Handelsmenü am Posten)](issues/tmw-T3-warenkonto-und-schiff.md)
- **Frage:** Welche Anwesenheit verlangt der Kontotransfer?
- **Empfehlung:** (a). Das ist STU-Parität, SWU-Transfers zwischen Schiffen arbeiten ebenfalls mit Kopräsenz, und es entsteht keine Abhängigkeit vom Stationsblock.
- **Antwort:** a

### P2 · [Basishandel: endgültige Warenliste und Startkurse](issues/tmw-T7b-basishandel-warenliste-und-startkurse.md)
- **Frage:** Welche Waren handelt der Basishandel, zu welchen Startkursen, und unterscheiden sich die Netze von Imperium und Rebellenallianz?
- **Empfehlung:** (a) als Start und spätere Erweiterung nach Spielerfeedback. Das ist STU-nah, die Spielbalance bleibt überschaubar.
- **Antwort:** a

### P3 · [Demontage nach STU-Regel](issues/col-A6-demontage-nach-stu-regel.md)
- **Frage:** Welche Demontage-Regel gilt?
- **Empfehlung:** (b) mit (b1) – STU-Rückgabe, Werftpflicht als SWU-Regel behalten und in `map.md` unter „Entscheidungen“ notieren.
- **Antwort:** b1

### P3 · [Komponentenfertigung in Fabrikationshalle und Technologiezentrum](issues/col-A8-komponentenfertigung.md)
- **Frage:** Welche Komponenten gibt es in SWU?
- **Empfehlung:** (b) – minimaler Satz, der Reparatur und Eigenreparatur trägt; Erweiterung später.
- **Antwort:** a

### P3 · [Jägerwerft: Rumpf ins Lager](issues/col-A9-jaegerwerft-rumpf-ins-lager.md)
- **Frage:** Jäger als Lager-Rümpfe (STU) oder als normale Bauqueue (heutiges SWU)?
- **Empfehlung:** (a), solange Hangar-/Trägerlogik für Jäger in SWU nicht weiter ausgebaut wird; sonst (b).
- **Antwort:** b

### P3 · [Kolonieabgabe: Ruinenmodell bestätigen und dokumentieren](issues/col-E2-kolonieabgabe-ruinenmodell.md)
- **Frage:** Soll das SWU-Ruinenmodell der Kolonieabgabe bleiben?
- **Empfehlung:** (a). Die Ruine ist mit der Wiederbesiedlung von Ruinen verzahnt (`BE/colonization`) und bewusst SWU-spezifisch gebaut worden.
- **Antwort:** a

### P3 · [Subraumteleskop: Scan eines Kartenfelds](issues/col-G1b-subraumteleskop-scan.md)
- **Frage:** Welches Wissen gibt der Teleskop-Scan preis?
- **Empfehlung:** (a), mit einem Vermerk in ADR-0002 bzw. unter „Entscheidungen“, dass momentane Aufklärung ohne Speicherung zulässig ist.
- **Antwort:** a

### P3 · [Kolonie-Sandbox: Datenmodell und Kopie der Oberfläche](issues/col-G3a-kolonie-sandbox-datenmodell.md)
- **Frage:** Ist die Kolonie-Sandbox gewünscht? Sie ist in Leitplanke 3 weder als in noch als out of scope genannt.
- **Empfehlung:** (a) mit niedriger Priorität: Sie ist für die STU-typische Planungstiefe nützlich und baut auf bestehender Bau- und Bilanzlogik auf. Falls (a): Höchstzahl Sandboxen je Spieler festlegen (Vorschlag 3).
- **Antwort:** a

### P3 · [Kolonie-Sandbox: Bauen, Abreißen und Schalten](issues/col-G3b-kolonie-sandbox-bauen-und-schalten.md)
- **Frage:** 
- **Empfehlung:** –
- **Antwort:** 

### P3 · [Kolonie-Sandbox: Produktions- und Energievorschau](issues/col-G3c-kolonie-sandbox-produktionsvorschau.md)
- **Frage:** 
- **Empfehlung:** –
- **Antwort:** 

### P3 · [Enterkommando (Truppenkampf gegen Crew)](issues/sc-WP-CREW-4a-enterkommando.md)
- **Frage:** Soll Entern in SWU spielbar sein?
- **Empfehlung:** (b), weil Entern unter Verbündeten derselben Fraktion dem SWU-Haltungsmodell (`CONTEXT.md`) widerspräche.
- **Antwort:** a

### P3 · [Übernahme unbemannter Schiffe](issues/sc-WP-CREW-4b-uebernahme-unbemannter-schiffe.md)
- **Frage:** Soll die Übernahme unbemannter Schiffe in SWU spielbar sein?
- **Empfehlung:** (b), konsistent zu sc-WP-CREW-4a.
- **Antwort:** a

### P3 · [Ressourcen am Feld sammeln (Mining mit Sammelsystem)](issues/sc-WP-RES-1-ressourcen-sammeln-mining.md)
- **Frage:** Soll SWU Ressourcensammeln an Kartenfeldern haben, und mit welchem Umfang?
- **Empfehlung:** (a) mit Tibanna-Gas aus Nebeln und Erz aus Asteroidenfeldern, weil das Star-Wars-kanonisch ist und STU-Wirtschaft spiegelt.
- **Antwort:** a

### P3 · [Shuttles als eigenständige Schiffe starten und aufnehmen](issues/sc-WP-SHUT-1-shuttles-als-schiffe.md)
- **Frage:** Bleiben Shuttles reine Lagerware (heutiges SWU) oder werden sie startbare Schiffe wie in STU?
- **Empfehlung:** (a), weil der Stationsbau (Workbees starten und andocken) dieselbe Mechanik nutzt und sie so nur einmal entsteht.
- **Antwort:** a

### P3 · [In-Universe-Datum](issues/sh-AP-13b-in-universe-datum.md)
- **Frage:** Soll SWU Spieldaten in einer In-Universe-Zeitrechnung anzeigen?
- **Empfehlung:** (b). Es vermeidet Verwechslungen bei Tickzeiten, Urlaub und Löschfristen; ein In-Universe-Datum bringt keine Spielfunktion.
- **Antwort:** a

### P3 · [Eigene Nachrichtenordner und Verschieben](issues/soc-A7-eigene-nachrichtenordner.md)
- **Frage:** Die Spec `events-and-message-folders` legt eine geschlossene, zentral definierte Ordnermenge fest. Eigene Ordner wären eine zweite, spielerdefinierte Ebene.
- **Empfehlung:** (a), weil die Erweiterung die geschlossene Systemordnermenge unangetastet lässt und nur persönliche Nachrichten betrifft.
- **Antwort:** a

### P3 · [Kontaktmodus „Feind“: Spielwirkung](issues/soc-B1b-kontaktmodus-feind-wirkung.md)
- **Frage:** Welche Wirkung hat ein persönlicher Kontakt im Modus Feind?
- **Empfehlung:** (a), weil `CONTEXT.md` Feindschaft bewusst an die Fraktion bindet und persönliche Feindschaft sonst Kampfregeln innerhalb einer Fraktion verändert.
- **Antwort:** b

### P3 · [Kontaktfreigaben „Als Freund behandeln“ und „Live-Position teilen“](issues/soc-B3-kontaktfreigaben-einseitig.md)
- **Frage:** Sollen einseitige Kontaktfreigaben neben den beidseitig ausgehandelten Beziehungsfreigaben existieren?
- **Empfehlung:** (a) nur für „Live-Position teilen“ (der Spieler gibt ausschließlich eigene Daten preis) und (b) für „Als Freund behandeln“, weil die Freund-Haltung beidseitige Spielwirkungen (Transfers, Versorgung) hat und über den Freund-Kontakt aus soc-B1a bereits abgedeckt ist.
- **Antwort:** a

### P3 · [Ignorieren: Reichweite über PMs hinaus](issues/soc-C1b-ignorieren-reichweite.md)
- **Frage:** Wie weit reicht Ignorieren?
- **Empfehlung:** (b), weil Benachrichtigungen vom Ignorierten faktisch ein PM-Kanal sind, während das Ausblenden öffentlicher Inhalte (c) Diskussionen unlesbar macht.
- **Antwort:** a

### P3 · [Profilbesucher erfassen und anzeigen](issues/soc-F1b-profilbesucher.md)
- **Frage:** Sollen Profilbesuche erfasst und dem Profilinhaber angezeigt werden?
- **Empfehlung:** (a) mit 7 Tagen Aufbewahrung und Opt-out, weil es STU-Parität bietet und die Datenmenge begrenzt bleibt.
- **Antwort:** a

### P3 · [Online-Status: öffentliche Online-Liste und Opt-out](issues/soc-F3a-online-status-sichtbarkeit.md)
- **Frage:** Wie wird der Widerspruch zwischen öffentlicher Online-Liste und `CONTEXT.md` aufgelöst?
- **Empfehlung:** (a), weil das Dashboard-Widget gerade erst bewusst eingeführt wurde und STU-Parität mit Opt-out den Datenschutz wahrt.
- **Antwort:** a

### P3 · [Wählbares Interface-Farbschema](issues/soc-F3b-farbschema.md)
- **Frage:** Soll SWU wählbare Farbschemata bekommen?
- **Empfehlung:** (b), weil SWU das Design gerade über Tokens vereinheitlicht (sh-AP-13) und Schemata jede UI-Arbeit vervielfachen.
- **Antwort:** a

### P1 · Tracker-/Architekturentscheidungen vom 2026-10-23
- **sc-WP-ENG-2:** aufgeteilt in 2a–2e; hybride reine Policy plus dünner NestJS-Loader; strukturiert `{ allowed, reason }`; Meldungen bleiben erhalten.
- **tmw-T1:** aufgeteilt in T1a–T1d; Netze 1/2/3, Level 1, Lager 10000, Transfer 200; deterministische kanonische Standorte und festgelegte Namen; unbekannte Posten mit `location: null`; Lizenz-Alpha-Default in T2: 10 Aurodium/30 Tage.
- **tmw-D0a/b:** Map und Datenbank-Kontext getrennt; Crew-XP gehört CREW-2; anderes eigenes geeignetes Schiff darf MEASURED gegen erneut 15 EPS fortsetzen.
- **sh-AP-14a/b:** Assets bleiben separate menschliche Arbeit; 14a wird noch nicht aufgelöst, 14b berührt keine Assets.

### P3 · [Notizen als Notizsammlung](issues/soc-F5-notizsammlung.md)
- **Frage:** Soll der Einzelzettel durch eine Notizsammlung ersetzt werden?
- **Empfehlung:** (a), weil die Migration verlustfrei ist und mehrere Notizen für Koordinaten, Handelslisten und RPG den STU-Gebrauch abbilden.
- **Antwort:** a

### P3 · [Globale History: Erzeuger ALLIANCE](issues/soc-H1-history-erzeuger-alliance.md)
- **Frage:** Soll die globale History öffentliche Diplomatie-Ereignisse spiegeln?
- **Empfehlung:** (a), weil die Ereignisse in STU öffentlich sind, die Chronik je Partei bereits öffentliche Daten führt und der leere Filter sonst irreführt.
- **Antwort:** a

### P3 · [BBCode: `[img]` in Profil und HoloNet](issues/soc-I1b-bbcode-img-profil-und-holonet.md)
- **Frage:** Welche Bilder sind in Profilbeschreibung und HoloNet erlaubt?
- **Empfehlung:** (b), weil die Asset-Infrastruktur des Allianzbanners existiert und externe Bilder IP-Adressen der Leser an Dritte preisgeben.
- **Antwort:** a

### P3 · [BBCode-Farben in Spielernamen](issues/soc-I1c-bbcode-in-spielernamen.md)
- **Frage:** Sollen Spielernamen BBCode-Formatierung tragen dürfen?
- **Empfehlung:** (b), weil Allianznamen bereits bewusst ohne BBCode sind und Namen an sehr vielen Stellen (Karte, Listen, Suche) angezeigt werden.
- **Antwort:** a

