# STU-Paritätsabgleich – Gesamtbericht (2026-11-17)

Referenz: `st-universe/core` (Twig-Views, Module, Tick). Verglichen wurde Code und Template-Struktur, nicht das laufende Spiel. Ticketstatus wurde nicht vertraut, sondern im SWU-Code geprüft.

Teilberichte mit Seitentabellen, Pfaden und allen kleinen Abweichungen:

| Bereich | Bericht |
|---|---|
| Rahmen, Einstieg, Maindesk, Admin, Tick | [shell-admin-runtime.md](shell-admin-runtime.md) |
| Kolonie, Gebäude, Werft, Forschung, Waren | [colony.md](colony.md) |
| Schiffe, Flotten, Kampf, Stationen | [spacecraft.md](spacecraft.md) |
| Handel, Sternenkarte, Datenbank, NPC | [trade-map-world.md](trade-map-world.md) |
| PM, HoloNet, RPG, Profil, Allianz, History | [social.md](social.md) |

## Gesamteinschätzung

- **Spielregeln/Backend:** weitgehend auf STU-Stand. Fast alle Inventurlücken vom 2026-10-21 sind im Code geschlossen.
- **UI/Informationsdichte:** deutlich hinter STU. Viele SWU-Seiten zeigen eine knappe Liste mit Detailpanel, wo STU volle Tabellen/Boxen mit Kontextinformationen und Direktaktionen zeigt.
- **Hauptmuster:** Backend-Endpunkt gebaut, Ticket `resolved`, aber kein Frontend-Aufrufer → Funktion für Spieler unerreichbar. Das betrifft mindestens 10 Funktionen (Liste unten).

## A. Funktionen, die im Backend existieren, aber für Spieler unerreichbar sind

| Funktion | Beleg | Ticket (resolved) | Verifiziert |
|---|---|---|---|
| Gebäudereparatur (Vorschau + Reparieren) | `frontend/src/pages/colonies/api.ts:103-108` ohne Aufrufer | – (kein Ticket; Inventur führte es als vorhanden) | ja |
| Bojen auslegen/aufnehmen/anzeigen | `spacecraft` `:id/buoys`, kein Frontend-Aufruf | sc-WP-SENS-1 | ja |
| Subraumanalyse; Hyperraumfeld-/Gravitationswellenscanner schalten (laufen aktiv und kosten EPS) | `subspace-analysis/:signatureId` ohne Aufrufer | sc-WP-SENS-2a | ja |
| Traktorstrahl lösen (`DELETE :id/tractor`), gehaltenes Schiff andocken | nur Aktivieren/Entkommen im Frontend | sc-WP-TRACT-1a | ja |
| Station: LSS-Karte, Sensorphalanx-Scan | `system-field-scan` nur in `ship-action-registry.ts`, `NavigationPanel` für Stationen aus | sc-WP-STAT-2 | ja |
| Rumpf-/Stationsrumpf-Detail in der Datenbank | `database.controller.ts:178` ohne Aufrufer | tmw-D6b | ja |
| HoloNet: Autor löscht eigenen Beitrag; Admin bearbeitet fremden Beitrag | `holonet.controller.ts:140` ohne Aufrufer | soc-D1 | ja |
| Bauplan umbenennen | Endpunkt + Callback, State nie gerendert | col-A4 | Bericht |
| Notrufe im Maindesk | `dashboard.tsx:139` lädt, `distressSignals` wird nie gerendert | – | ja |
| Meldungsbox `ActionResult` | Komponente existiert, wird nirgends gerendert | sh-AP-12 | ja |

## B. Große Abweichungen in Spielregeln / Laufzeit

1. **Schiffsbau, Umrüstung, Werftreparatur nur im Haupttick** (`colony-tick-processor.service.ts:238`), STU minütlich. Bis zu ~12 h Verzug gegenüber angezeigter Fertigstellung. Kein Ticket. *(Gebäude-/Terraforming-Fertigstellung läuft dagegen minütlich, `tick.service.ts:311`.)*
2. **Urlaub wirkt im Haupttick sofort** statt nach 48 h: Tick nutzt `vacationMode` statt `isVacationEffective` (`tick.service.ts:155ff`). Crewlimit lässt sich so umgehen. sh-AP-04c resolved.
3. **Kampf-Engine:** fester Beschuss des ersten lebenden Ziels statt zufälligem Ziel im wechselnden Matchup; keine Kampfvorbereitung (Abdocken, Warp aus, Alarmreaktion); Schilde absorbieren auch abgeschaltet, 10 % Durchschlag, 80 % Wirkungsgrad. Widerspricht „wir halten uns an STU“. Details: [spacecraft.md](spacecraft.md).
4. **Schildregeneration:** SWU lädt jeden Tick auch aktive Schilde (2 EPS); STU nur abgeschaltete Schilde alle 15 min. Liste und Schiffskopf zeigen unterschiedliche Raten (5 % / 10 %).
5. **Flottenkontrolle fehlt:** keine flottenweite Systemschaltung, kein Flottenstatus am Schiff, Regel „100 Crew je Flotte“ fehlt.
6. **Registrierung umgeht `isSelectable` der Fraktion** (`auth.service.ts#register`). tmw-FA1b1 resolved.
7. **Maintenance:** 7 statt ~20 STU-Handler; täglicher Crew-XP-Tick (`crew-expertise.ts`) wird nie ausgelöst (sc-WP-CREW-2); leere RPG-Plots/fehlende Awards werden nicht bereinigt.
8. **Globale History:** STATION/COLONY werden nie geschrieben (Stationen als SHIP) → zwei Filter immer leer.
9. **NPC-Posten:** STU-Regel „Latinum verlangen, wenn kein Latinum angeboten“ fehlt.

## C. Große UI-Abweichungen (Seitenaufbau / Informationsdichte)

| Seite | STU | SWU | Bericht |
|---|---|---|---|
| Kolonieliste | Signaturen, Verteidigung, Wachstum, Verbrauch „x Runden“, Terraforming, Modulproduktion | `signatureCount: 0`, `defended: false` fest verdrahtet (`colony.service.ts:266/278`); Klammerwert = Arbeitslose statt Wachstum; Blöcke fehlen | colony |
| Felddialog Baustelle | Restzeit, Fortschritt, „nach Bau aktivieren“ umschaltbar | nur „IM BAU“ | colony |
| Modulfabrik / Werft | Rumpffilter, „Benötigt: n“, Accountbestand, Sammelbestellung; Rumpfbilder, Zähler | fehlt; Entwickler-Metadaten und englische Labels sichtbar | colony |
| Schiffsliste / NBS | Gruppen für Stationen/Flotten, Tarnhinweis, Crewsumme, Logbuch-/RPG-Icons | flache Liste | spacecraft |
| Handel – Warenkonto | Standort, Netz, Lizenzen/Gebühren, Waren in Angeboten, Ware → Angebot/Transfer | stark reduziert (tmw-T1d/T2d/T4a resolved) | trade-map-world |
| Sternenkarte – Feldinfo | Besitzer, Handelsposten + Lizenzkosten, Region, Effekte, unpassierbar, DB-Link | nur Koordinaten/Typ/System/Zone; DTO trägt die Daten nicht | trade-map-world |
| Hutten-Deals / Auktionen | Rumpfbild, Module, Crew; Höchstbietender; beendete Auktionen | nur Text | trade-map-world |
| Siedlerliste | Suche, Sortierung, Seiten, Allianz, PM-Link | fehlt | trade-map-world |
| PM-Ordner | 6 volle Nachrichten mit Aktionen je Nachricht | Betreffliste + Detailpanel | social |
| HoloNet-Liste | aufgeklappt, Avatar, NPC-Kennung, „bearbeitet“, Sortierung | zugeklappt, Angaben fehlen | social |
| Spielerprofil | Schiffslogbücher | fehlen (kein Ticket) | social |
| Maindesk | „Zufällige Spieler online“ bis 35 Avatare, Notrufe | 1 Spieler, Notrufe unsichtbar | shell |
| Seitenrahmen | Breadcrumb/Titel auf jeder Seite, Meldungsbox | `PageHeader` auf 6 Seiten, `ActionResult` ungenutzt | shell |
| Admin | Livekarte, Wetter, Schiff aufladen, Einzel-Tick, Spielerliste mit Avatar/Allianz/Links | fehlt | shell |

## D. Tickets, die `resolved` sind, deren Akzeptanz aber nicht erfüllt ist

sc-WP-SENS-1, sc-WP-SENS-2a, sc-WP-TRACT-1a, sc-WP-STAT-2, sc-WP-CREW-2, tmw-D6b, tmw-T1d, tmw-T2d, tmw-T4a, tmw-FA1b1, soc-D1, col-A4, sh-AP-04c, sh-AP-12, sh-AP-13a (Umlaut-/Emoji-Reste). Begründung je Ticket in den Teilberichten.

## E. Lücken ohne Ticket

Gebäudereparatur-UI · Bau-/Umrüstungs-Fertigstellung minütlich · Notrufbox · Profil-Logbücher · Crew-Ränge/-Rassen in Einstellungen · Spielrunde/Rundenstatistik/Changelog · Akzeptanz-Checkbox Regeln/Datenschutz bei Registrierung · History-Typen STATION/COLONY · Kampfziel-Auswahl und Kampfvorbereitung · Schildregeneration · Flottenkontrolle.

## F. Bewusste / entschiedene Abweichungen (keine Lücke)

- ADR 0001 Allianzen (Ämter, Pflichtfraktion, feste Feindschaft); kein globaler Diplomatie-Graph.
- ADR 0002/0003/0007-0009 Systementdeckung, Kartographie, Ebenenkenntnis, Regionen; ADR 0006 Galaxieflug.
- ADR 0004 Stationen als Spacecraft; ADR 0005 Forschungsqueue; ADR 0007 Kolonieabgabe als Ruine.
- Out of scope: Piraten, Quests, NPC-Konten über Handel hinaus (map.md Leitplanke 3) – betrifft NPC-Werkzeuge.
- wontfix: u. a. soc-C1b (Ignorieren nur für PMs).
- ~~tmw-D6a: Handelsposten ohne Entdeckung in der Datenbank (kein Prestige).~~ → jetzt wie STU, siehe N4.
- Star-Wars-Ersatz für Star-Trek-Inhalte (map.md → Entscheidungen).
- Offen/geplant, nicht Teil des Abgleichs: SPEC-1a/b/c (Interdiktornetz), SPEC-2 (RPG-Transponder, in Arbeit, uncommittet), SPEC-3/4/6.

## G. Entscheidungen des Product Owners zu den bewussten Abweichungen (2026-11-17)

Gilt für die Ticketerstellung. Bezug: Abschnitt „Bewusste/entschiedene Abweichungen“ in [shell-admin-runtime.md](shell-admin-runtime.md).

| Bisherige Abweichung | Entscheidung | Folge für Tickets |
|---|---|---|
| E-Mail-Verifikation, Kontolöschung, Inaktivitätslöschung, Massenmail, Rechtstexte hinter Flags, Default aus (`map.md` Leitplanke 4); Impressum mit Platzhaltern (`pages/imprint.tsx`) | **Nicht mehr hinter Flags.** Leitplanke 4 ist damit aufgehoben. | Ticket: Flags entfernen, Funktionen standardmäßig aktiv; Leitplanke 4 in `map.md` anpassen. Offen: echte Impressums-/Datenschutztexte (Inhalt muss vom Betreiber kommen). Hinweis: `origin/main` hat mit `da02e52f` bereits E-Mail-Verifikation bei offener Registrierung – beim Merge abgleichen. |
| Rumpf-Editor: Inhalte kommen aus `game-data` (`inventory/shell-admin-runtime.md:159`) | **Umstellen auf DB-basierte Spieldaten wie STU.** | Großes Architekturthema → zuerst ADR + Spec (needs-info), dann Tickets. Klarstellung STU-Stand: STU hat keinen Seed für Spielinhalte; Rümpfe/Module liegen nur in der DB, gepflegt über Admin-`CreateRump`, Neuaufsetzen per `pg_restore` eines Dumps; Testdaten über `testdata/Migrations`. Zu klären: Wer ist künftig Quelle der Wahrheit (DB + Admin-Editoren), wie kommt der heutige `game-data`-Bestand initial in die DB (einmaliger Seed/Import), was passiert mit dem `game-data`-Repo, und wie werden Datenänderungen versioniert (Migrationen vs. Dump). |
| Farbschemata: drei SWU-Schemata statt STU-CSS (`map.md` soc-F3b) | **Ein dunkles Schema soll entworfen werden.** | Design-Ticket: dunkles Farbschema entwerfen und als Schema auswählbar machen. |
| Profilbesucher auf dem Maindesk, in STU auskommentiert (`map.md` soc-F1b) | **Wie STU.** | Ticket: Profilbesucher-Box vom Maindesk entfernen (`pages/dashboard/DashboardProfileVisitors*`); Entscheidung soc-F1b in `map.md` revidieren. |
| Urlaub pausiert Kolonie-Tick, Sperrfrist ab Aktivierung (`map.md` sh-AP-04c), Umsetzung weicht ab | **An STU angleichen.** | Ticket: Urlaubsregeln exakt nach STU (Wirksamkeit nach 48 h im Tick über `isVacationEffective`, Sperrfrist wie STU, Tick-Verhalten wie STU); UI-Text `settings.tsx:907` korrigieren; sh-AP-04c-Entscheidung in `map.md` ersetzen. Deckt Befund B2 ab. |
| Invite-Keys und Closed Alpha (`auth.service.ts:370-399`) | **Entfällt ersatzlos.** | Kein Ticket. Bereits auf `origin/main` umgesetzt (`da02e52f`); kommt mit dem Merge von `origin/main` in `stu-parity`. |
| Fraktionen ohne `playerLimit` (tmw-FA1b1, Option 1c) | **`playerLimit` wie STU einführen** (Entscheidung 2026-11-17, ersetzt Option 1c). | Ticket: Feld `playerLimit` je Fraktion (`0` = unbegrenzt), im Admin pflegbar; Fraktionswahl zeigt „voll“ wie STU `FactionItem#hasFreePlayerSlots`; Registrierung und Onboarding lehnen bei erreichtem Limit oder `isSelectable = false` ab (wie `Register.php:47-54`, schließt Befund B6). tmw-FA1b1-Entscheidung in `map.md` ersetzen. |

### Erläuterung: Fraktionen ohne `playerLimit`

STU hat je Fraktion zwei Steuerwerte (`src/Orm/Entity/Faction.php`): `chooseable` (Fraktion wählbar ja/nein) und `player_limit` (maximale Spielerzahl, `0` = unbegrenzt). Bei der Registrierung zählt STU die Spieler je Fraktion; ist das Limit erreicht, wird die Fraktion als voll angezeigt (`Module/Index/Lib/FactionItem.php#hasFreePlayerSlots`) und die Registrierung abgelehnt (`Module/Index/Action/Register/Register.php:47-54`). So kann der Betreiber z. B. eine Fraktion auf 50 Spieler deckeln, um die Fraktionen ausgeglichen zu halten.

SWU hat in tmw-FA1b1 (Option 1c) nur das Gegenstück zu `chooseable` übernommen (`isSelectable`, vom Admin gepflegt), aber **kein Spielerlimit**. Ein Admin kann eine Fraktion also nur komplett sperren, nicht ab einer Spielerzahl automatisch schließen. Zusätzlich prüft die Registrierung `isSelectable` derzeit nicht (Befund B6).

Entschieden: `playerLimit` wie STU ergänzen (Admin-Feld, Anzeige „voll“ bei der Fraktionswahl, Prüfung bei Registrierung/Onboarding).

## H. Nachprüfung der Unsicherheiten (2026-11-17, codegraph über beide Repos)

Details und Belege je Punkt stehen jeweils im Abschnitt „Unsicherheiten – nachgeprüft“ der Teilberichte. Hier nur, was sich an den Befunden ändert.

### Bestätigt und verschärft

- **B1 Bau/Umrüstung/Reparatur:** Es gibt keinen Lazy-Abschluss und keinen weiteren Cron. Zusätzlich gilt: Während Urlaub schließt SWU diese Aufträge gar nicht ab, STU schon.
- **B2 Urlaub:** Auch Ionensturm und Subraumellipse verschonen Schiffe sofort statt erst nach 48 h (`ion-storm-effects.ts:57-66`, `subspace-ellipse.handler.ts:75-82`).
- **B3 Kampf:**
  - STU: jedes Schiff feuert einmal in Zufallsreihenfolge, Münzwurf je Matchup, zufälliges Ziel, feuern nur mit aktivem NBS.
  - Flotten greifen über ihren Führer an. Mitverteidiger ist nur die Station, an der das Ziel angedockt ist. Die SWU-Mitverteidiger-Regel aus sc-WP-COMBAT-2 hat keine STU-Grundlage.
  - Bei einem Schildkollaps schaltet STU das Schildsystem ab. SWU setzt nach dem Kampf alle Überlebenden auf Gelb.
- **Neu – fehlende ThreatReaction:** Alarmierte Ziele schießen bei Traktor oder Entern nicht zurück, beides ist damit risikolos (spacecraft.md, Abw. 10).
- **B4 Schildregeneration:** STU lädt alle 15 min nur ausgeschaltete Schilde, ohne EPS. Crew und intaktes System sind nötig, Treffer, Feldstörung und Anomalien setzen den Timer zurück bzw. blockieren. SWU lädt nur im Haupttick und kostet 2 EPS.
- **Scanner:** Sie laufen ab Bau aktiv, weil `shipbuilding-core.service.ts:627` alle Module mit `isActive: true` anlegt. STU legt Systeme ausgeschaltet an. Die Signatur-ID für die Subraumanalyse liefert das Backend bereits, nur das Frontend fehlt.
- **Sternenkarte:** Handelsposten fehlen auf der Galaxiekarte ganz, auch als Symbol. STU zeichnet für sie das Icon `tradepost`.
- **Warenkonto:** Die Anzeige `x / Limit` zählt nur den Bestand, die Platzprüfung dagegen Bestand plus Angebotsreserve. Die Box kann so freien Platz zeigen, obwohl der Transfer scheitert.

### Neue große Abweichungen

- **Transfer über einseitige Freundschaft** (social.md Nr. 5): SWU prüft die Beziehung aus Sicht des Absenders (`transfer.service.ts:789`), STU aus Sicht des Zielbesitzers (`TransferInformationFactory.php:31`). Wer jemanden einseitig als Freund einträgt, kann an dessen geschützte Schiffe transferieren.
- **PM-Mail** (social.md Nr. 6): SWU verschickt sie im Opt-out und ohne Nachrichtentext, STU im Opt-in und mit vollem Text. Das wird relevant, sobald die Flags laut Abschnitt G entfallen.

### Neue kleine Abweichungen (Auswahl)

- **Sammeln:** Felder erschöpfen nicht, Sammeln ist unbegrenzt; STU zieht vom Feldvorrat ab. PO-Frage: gewollt?
- **Schiffe und Stationen:**
  - Fremde Logbücher sind nirgends lesbar (STU: Zielscan und Profil).
  - An Stationen gibt es kein Shuttle-Management.
  - Beamen zwischen Station und angedocktem Schiff kostet in SWU EPS. STU macht das kostenlos und erlaubt es auch im Ionensturm.
- **Kommunikation und Mail:**
  - Schnell-PM fehlt in Siedlerliste, Ranglisten, Handelsposten, Lizenzliste, bei Plotschreibern und auf der Allianzseite, ebenso Schiff → Kolonie.
  - Eine PM vom Schiff gibt keine Crew-XP (`FOREIGN_CONTACT_MESSAGE` wird nie ausgelöst).
  - Admin-Fehlermails des Ticks fehlen. Die Massenmail ist anders gefiltert.
- **Prestige:** Der Abzug bei Selbstzerstörung fehlt; sc-WP-COMBAT-3 liest STU dort falsch. Ebenso fehlen Datenbankeinträge außerhalb von Scans (Handelsposten, Kolonisierung, Forschung, Flugfeld) und die NPC-Prestigekorrektur.
- **Einstellungen und Meldungen:**
  - `default_view` greift nur direkt beim Login, nicht bei Reload oder vorhandenem Token. SWU bietet 7 statt ~15 Startseiten.
  - Die Meldung „Lager voll“ kann zweimal je Tick entstehen, weil ein `break` fehlt.
- **Handel und Datenbank:**
  - Der Knopf „Transferieren“ erscheint auch an Spielerposten, der Fehler kommt erst nach dem Absenden.
  - In der Vielflieger-Rangliste fehlt der eigene Punktestand.
  - Eine spielerweite Crew-Übersicht fehlt.
- **Kontakte:** Getarnte Schiffe mit geteilter Live-Position blendet SWU aus, STU zeigt sie.
- **Allianz-Diplomatieverwaltung:** Die Spalten Zeitpunkt und Rechte fehlen, die Gegenpartei bei Vorschlägen fehlt und die Allianznamen sind nicht verlinkt.

### Widerlegt / korrigiert

- STU zeichnet keine Anomalien auf dem Kartenbild und zeigt keine Lizenzbedingungen im LSS. Beides ist also keine Lücke.
- Netztransfer: Die Regel ist gleich, nur die UI weicht ab (siehe oben).
- Rumpfdetails: Die Kolonie-Werft zeigt einen Teil der Basiswerte, aber nur für eigene baubare Rümpfe. Die Datenbank-Detailansicht fehlt weiterhin.
- „Als Freund behandeln“ am Kontakt ist eine SWU-Erweiterung, keine STU-Funktion.
- `storage_notification` ist in beiden Spielen Opt-in, also gleich.

### Kolonie

Neue große Abweichungen (colony.md Nr. 5 und 6):
- **Keine Reaktivierung nach Upgrade:** STU schaltet beim Upgrade einer Orbitalwartungs-Quelle die abhängigen Orbitalgebäude ab und nach Fertigstellung wieder ein. SWU schreibt `reactivateAfterUpgrade` zwar (`colony-construction.service.ts:1114`), liest es aber nirgends. Die Gebäude müssen von Hand wieder eingeschaltet werden. (selbst verifiziert)
- **Tick-Abschaltreihenfolge:**
  - STU prüft Waren → Wohnraum (Arbeiter gegen Wohnraum) → Energie.
  - SWU prüft Energie → Arbeiter gegen Bevölkerung → Vorkommen → Waren.
  - Fällt Wohnraum weg, schaltet SWU keine Arbeitgeber ab.

Neue kleine Abweichungen:
- **Folgekolonie beim Kolonisieren:**
  - Startwaren, Energie und Arbeitslose weichen ab.
  - Es fehlt die STU-Sonderregel für die erste Kolonie.
  - Erlaubt ist jedes Oberflächenfeld statt nur `colonizeableFields`.
  - Vorkommen werden immer auf `maxAmount` gesetzt statt zwischen min und max gewürfelt.
  - Es gibt keinen Datenbankeintrag für die Kolonieklasse.
- **Hangar:** Es gibt kein Limit „ein Kolonieschiff“, und der Rumpf wird alles oder nichts statt stückweise gebaut.
- **Tick:**
  - Das Lager wird nicht nach `commodity.sort` aufgefüllt; bei vollem Lager verfallen dadurch andere Waren.
  - Beim Wachstum gibt es zusätzlich einen Fraktionsfaktor.
  - Weil Wohnraum als `max(Wohnraum, Bevölkerung)` gilt, greift die Auswanderung später.
- **Koloniebotschaft:** SWU zeigt sie ohne BBCode. Die Schiffsaktion steht trotz Umsetzung noch auf `planned`.
- **Orbit/Orbitalmanagement** (vorher „gleich“, korrigiert):
  - Es erscheinen nur eigene Schiffe.
  - Rumpfbild, Torpedoreserven, Typauswahl und Shuttle-Transfer fehlen.
  - Die Callbacks von `PanelOrbit` sind nicht verdrahtet.

Bestätigt gleich: Prüfungen beim Kolonisieren, Vorkommensabbau, Auswanderung, Teleskopkosten, Torpedo-Beamen, Abrissrückerstattung, Sichtbarkeit der Koloniebotschaft.

### Weiterhin offen (nur mit laufendem Spiel bzw. Prod-Daten prüfbar)

- Tutorial-Inhalte: STU hat sie nur im Prod-Dump.
- STU-Spieldaten, die nur in deren Datenbank liegen (Vorkommensmengen, Hangarwerte, konkrete Abschaltziele): Dafür braucht es einen STU-DB-Dump.
- Mobile Darstellung, Farben und Tooltips.
- Tatsächliche Mailzustellung.
- Tick-Stunden in der Prod-Konfiguration.
- Ob LSS-Spuren und Transferfehler im Spiel so erscheinen, wie der Code nahelegt.

Hinweis: Andere Agenten ändern parallel `spacecraft.service.ts` und `transfer.service.ts`. Zeilenangaben dazu können sich verschieben.

## I. Entscheidungen zu den offenen Punkten (2026-11-17)

| Punkt | Entscheidung | Folge für Tickets |
|---|---|---|
| Sammelfelder erschöpfen nicht | **Wie STU.** | Ticket: Feldvorrat je Sammelfeld wie STU `stu_location_mining` (`actual_amount`, `max_amount`, `depleted_at`). Sammeln je Tick zieht vom Vorrat ab (STU `BussardCollectorHandler`: 95–105 je Tick, Fraktionsmodul 190–220, begrenzt durch Vorrat und freien Lagerraum). Bei 0 gibt es die Meldung „keine … vorhanden“ und `depleted_at` wird gesetzt. Regeneration als Maintenance wie `CreateInterstellarMedia`: nach 20 Tagen Erschöpfung, aus 0 auf 5 % von max, sonst +15 %, bis max. |
| Prod-Dump | Nicht verfügbar. | – |
| Tutorial-Inhalte | **Schreiben wir selbst.** | Kein Abgleich mit STU; Inhaltsticket ohne STU-Vorlage. |
| Vorkommensmengen, Hangarwerte | PO fragt bei STU nach (siehe Datenanfrage unten). | Tickets dazu erst nach Antwort; bis dahin `needs-info`. |
| Mobile Darstellung | **Machen wir selbst**, STU ist kein Maßstab. | Eigenes Ticket ohne Paritätsbezug. |
| Mailzustellung | **Machen wir selbst.** | Eigenes Betriebsticket (Versand, Zustellbarkeit), unabhängig von STU. |

### Datenanfrage an STU

Diese Werte stehen bei STU nur in der Datenbank, nicht im Repo. Gebraucht werden sie je Tabelle als CSV-Export oder SQL-Auszug.

1. **`stu_colony_class_deposit`**: Vorkommen je Planeten-/Mondklasse.
   - Spalten: `colony_class_id`, `commodity_id`, `min_amount`, `max_amount`.
   - Dazu für die Zuordnung `stu_colony_classes` (`id`, `name`) und `stu_commodity` (`id`, `name`).
   - Verwendung: Beim Kolonisieren würfelt STU je Vorkommen `random_int(min, max)` (`Module/Ship/Action/Colonize/Colonize.php:195`).
2. **`stu_buildplans_hangar`**: Startwerte je Hangar-Rumpf (Flugfeld/Hangar der Kolonie).
   - Spalten: `rump_id`, `buildplan_id`, `start_energy_costs`, `default_torpedo_type_id`.
   - Dazu die Namen aus `stu_rump` und `stu_torpedo_types`.
   - Für die Bestückung: `stu_buildplan` (`id`, `crew`) und `stu_buildplans_modules` (`buildplan_id`, `module_id`, `module_type`). Ohne diese Tabellen fehlen Crewbedarf und Module.
   - Verwendung: `Module/Colony/Action/StartAirfieldShip/StartAirfieldShip.php:89-142`.
3. **`stu_location_mining`**, nur aggregiert: Welche Waren auf welchen Feldtypen liegen und wie groß `max_amount` typischerweise ist.
   - Abfrage: `commodity_id`, Feldtyp, min/avg/max von `max_amount`, Anzahl.
   - Wird für das Sammelfeld-Ticket oben gebraucht, um Vorräte zu kalibrieren.

Ohne Antwort bleibt der Fallback: Werte selbst festlegen und im Ticket als „SWU-eigene Balance“ kennzeichnen.

## J. STU-Abgleich zu vier bisherigen SWU-Regeln (2026-11-17, PO: „wie STU“)

Geprüft per codegraph in STU. Ergebnis je Punkt, mit Folge für Tickets.

### 1. Demontage – Werftpflicht (bisher col-A6 Option b1)

**STU** (`Module/Colony/Action/DisassembleShip/DisassembleShip.php`, `Lib/Gui/Component/ShipDisassemblyProvider.php`, `Component/Colony/ColonyMenuEnum.php:73-105`):
- Der Menüpunkt „Demontage“ verlangt ein Werftgebäude (`isBuildingFunctionMandatory`). Es zählt auch ein **deaktiviertes**: `ColonySurface::hasShipyard` prüft die Zustände 0 und 1.
- Gelistet werden nur eigene Schiffe im Orbit, deren Rumpf zu einer Werftfunktion des gewählten Gebäudes passt.
- Die Aktion kostet **20 EPS** und verlangt freie Crew-Plätze auf der Kolonie. Die Crew geht auf die Kolonie.
- Rückgabe: Module mit Chance `ceil(50 × Zustand / 100)`, vollständige Reaktorladungen, Torpedos – jeweils bis zur Lagergrenze.
- **Fracht wird vernichtet.** `SpacecraftRemover::remove` löscht den Laderaum (`Module/Spacecraft/Lib/SpacecraftRemover.php:66-68`), er wird nicht ins Kolonielager übertragen.

**Abweichungen in SWU:**
- SWU verlangt eine **aktive** Werft, STU nur ein vorhandenes, rumpfpassendes Werftgebäude.
- SWU überträgt die Fracht ins Kolonielager (col-A6: „Fracht wie bisher“), STU vernichtet sie.

**Ticket:** Werftbedingung wie STU (vorhandenes, auch deaktiviertes Werftgebäude mit passender Rumpffunktion). Fracht wird vernichtet statt übertragen. Vor der Demontage braucht es einen deutlichen Hinweis „Fracht geht verloren“. Die `map.md`-Entscheidung col-A6 b1 wird ersetzt.

### 2. Subraumteleskop (bisher col-G1a/G1b, Nachtrag ADR-0002)

**STU:**
- **Kartenansicht** (`Module/Colony/View/ShowSubspaceTelescope/ShowSubspaceTelescope.php`): Sie nutzt `MapSectionHelper` → `createUserYRow` mit `LayerExplorationTrait` und zeigt also die **persönlich erkundete** Karte. SWU macht das im Kern gleich (`colony-telescope.service.ts:74`, `getExploredSectorFields`).
- **Scan** (`ShowSubspaceTelescopeScan.php`, `LocationRepository::getRumpCategoryInfo` Z.130-164): Kosten `20 + Distanz/Maximaldistanz × 180`, gleich wie in SWU. Ergebnis: Anzahl je Rumpfkategorie, nur momentan, ohne Speicherung – ebenfalls gleich.

**Abweichungen beim Scan:**

| | STU | SWU (`colony-telescope.service.ts:139-151`) |
|---|---|---|
| Gezählt | alle Spacecraft am Feld, **auch Stationen** | nur `kind = SHIP` |
| Zustand | jeder Zustand | nur `status = IDLE`; fliegende, reparierende, im Bau befindliche Schiffe fehlen |
| Tarnung | **getarnte Schiffe ausgeschlossen** (Cloak-System `mode > 1`) | Tarnung wird nicht geprüft, getarnte Schiffe werden mitgezählt (Informationsleck) |
| Energiecheck | Scan bricht ab, wenn EPS nicht reicht | prüfen, ob `deductColonyEnergy` bei zu wenig EPS ablehnt |

**Ticket:** Scan-Zählung wie STU: alle Spacecraft inklusive Stationen, jeder Zustand außer zerstört, getarnte ausgeschlossen. Die Kartenansicht bleibt. Den Nachtrag zu ADR-0002 auf „entspricht STU“ korrigieren.

### 3. Kolonie-Sandbox (bisher col-G3a: Limit 3 je Spieler)

**STU** (`Module/Colony/Action/Sandbox/CreateSandbox.php`, `View/Sandbox/*`, `Orm/Entity/ColonySandbox.php`, `Module/Control/AccessCheck.php:80-98`):
- **Kein Mengenlimit.**
- Die Sandbox ist **kein allgemeines Spielerfeature**: Alle Sandbox-Aktionen und -Views sind `AccessCheckControllerInterface` mit `AccessGrantedFeatureEnum::COLONY_SANDBOX`. Freigeschaltet ist sie nur für Admins und für Spieler-IDs, die in der Spielkonfiguration (`game.granted_features`) stehen.
- Die Sandbox hängt fest an der Quellkolonie (`colony_id NOT NULL`) und kopiert Gebäude, Integrität, Feldtyp, Aktivstatus, max. Bevölkerung/EPS/Lager, Arbeiter und Maske.
- Erlaubte Menüs: Hauptansicht, Bauen, Gebäude, Info, Soziales.

**Abweichungen in SWU:**
- Jeder Spieler hat Zugriff, dafür gilt ein Limit von 3.
- Die Sandbox überlebt die Quellkolonie (Snapshot).

**Entscheidung PO (2026-11-17): nur per Freigabe, wie STU.**

**Ticket:**
- Sandbox-Endpunkte und -UI nur für Admins und für freigeschaltete Spieler. Das entspricht STU `granted_features` / `COLONY_SANDBOX`. Die Freigabe ist im Admin pflegbar, statt wie in STU in einer Config-Datei.
- Das Limit `COLONY_SANDBOX_LIMIT` entfällt.
- Die Sandbox hängt an der Quellkolonie wie STU und wird mit ihr gelöscht.
- Der Umschalter auf der Kolonieseite wird ohne Freigabe ausgeblendet.
- Bestehende Sandboxen nicht freigeschalteter Spieler bleiben unsichtbar oder werden migriert/gelöscht – im Ticket festlegen.
- Die `map.md`-Entscheidungen col-G3a/b/c werden ersetzt.

### 4. Schiffbau reserviert keine Crew (bisher sc-WP-CREW-3a)

**STU** (`Module/Colony/Action/BuildShip/BuildShip.php:172-180`, `Module/Tick/Process/FinishShipBuildJobs.php`):
- Beim Bauauftrag wird nur der Crewbedarf berechnet und gegen das Rumpfmaximum geprüft. Es wird **keine Crew reserviert oder abgezogen**.
- Bei Fertigstellung erzeugt `createBy(...)->finishConfiguration()` das Schiff ohne `transferCrew`, also **unbemannt**. Bemannt wird danach regulär.

**Ergebnis:** SWU entspricht bereits STU. **Kein Ticket nötig.** Die `map.md`-Entscheidung kann als „entspricht STU“ umformuliert werden.

## K. STU-Abgleich zu vier weiteren SWU-Regeln (2026-11-17)

### 1. Stationen als `Spacecraft` mit Rollen (ADR-0004)

**STU macht es genauso.**
- `Orm/Entity/Station.php` erbt von `Spacecraft` (Doctrine-Diskriminator `SpacecraftTypeEnum::STATION`). Schiffe, Stationen und Energienetze teilen sich Systeme, Lager, Crew und Kampf.
- Die Rollen stehen als Rumpfrolle in `Component/Spacecraft/SpacecraftRumpRoleEnum.php`: `CONSTRUCTION`, `DEPOT_SMALL`, `DEPOT_LARGE`, `SHIPYARD`, `SENSOR`, `OUTPOST`, `BASE`.
- Baulimits: Konstrukt 2, Werft 2, großes Depot 1, sonst unbegrenzt.
- Bauorte: Depots/Werft im System, Basis über dem System, Außenposten außerhalb, Rest überall.
- Dockplätze: 50 während Bau oder Abwracken (`Station::getDockingSlotCount`).

ADR-0004 bildet das 1:1 ab. Abweichend sind nur die Star-Wars-Namen der Rollen (Versorgungsdepot, Logistikzentrum, Raumwerft, Sensorphalanx, Außenposten, Raumstation) und die Workbee-Bezeichnung.

**Bewertung:** Keine Abweichung von STU, also kein Paritätsticket. Wenn das Modell für SWU inhaltlich nicht passt, ist das eine bewusste Neuentscheidung gegen STU. → PO-Frage unten.

### 2. Flotten andocken/abdocken (sc-WP-STAT-3a)

**STU** (`Module/Ship/Action/DockShip/DockShip.php:155-229`, `Module/Station/Action/DockFleet/DockFleet.php:78-134`, `Module/Ship/Action/UndockShip/UndockShip.php`):
- **Kosten:** 1 EPS je Schiff (`Spacecraft::SYSTEM_ECOST_DOCK = 1`), wie SWU. Beim Andocken durch die Station (`DockFleet`) zahlt die Station 1 EPS je Schiff.
- **Nicht atomar, schiffsweise.** Die Schleife dockt Schiff für Schiff an:
  - Bereits angedockte werden übersprungen.
  - Mit zu wenig Crew oder getarnt: nur dieses Schiff wird übersprungen.
  - Bei EPS-Mangel oder vollen Dockplätzen bricht die Schleife ab; die bis dahin angedockten bleiben angedockt.
  - Läuft eine Reparatur oder Umrüstung, wird sie abgebrochen, und das Schiff wird übersprungen.
- Beim Andocken werden Schilde und Warpantrieb abgeschaltet.
- Die Rückmeldung listet je Schiff den Grund.
- Abdocken der Flotte erfolgt ebenso schiffsweise mit 1 EPS.

**Abweichung:** SWU macht alles oder nichts (Entscheidung „Atomare Flottenaktionen statt STU-Teilergebnissen“).

**Ticket (wenn wie STU):** Flottenandocken und -abdocken schiffsweise mit Teilergebnis und Gründen je Schiff, Abbruchregeln wie oben. Den `map.md`-Eintrag sc-WP-STAT-3a ersetzen.

### 3. Traktor, Entern, Übernahme unabhängig von der Haltung (PO: wie STU)

**STU** (`Module/Spacecraft/Action/ActivateTractorBeam/ActivateTractorBeam.php`, `Module/Spacecraft/Action/BoardShip/BoardShip.php`, `Module/Spacecraft/Lib/Battle/FightLib.php:105-153`):
- **Keine Haltungs- oder Freund-Prüfung.** `canAttackTarget` prüft nur: nicht das Schiff selbst, nicht getarnt (optional), bei eigener Traktorhaltung nur der Halter, nicht im Warp, nicht eigene getarnte Schiffe, nicht dieselbe Flotte. Freunde, Allianz und Verbündete können also erfasst und geentert werden.
- **Traktor:**
  - Ziel nicht im wirksamen Urlaub.
  - Ziel erfassbar, nicht schon gehalten, nicht im Energienetz, nicht in derselben Flotte.
  - **Vorher feuert `ThreatReaction`** – das Ziel kann zurückschießen.
  - Erst danach wird auf aktive Schilde geprüft.
- **Entern:**
  - Ziel enterbar und fremd, mit Crew.
  - Eigenes Schiff aktiv, ungetarnt, ungeschildet, nicht im Warp, Tachyon falls nötig.
  - Ziel nicht im Urlaub.
  - `canAttackTarget`.
  - Cooldown, EPS > 0, Prestigekosten.
  - Dann `ThreatReaction`.

**Bewertung:** Die Haltungsunabhängigkeit in SWU **entspricht STU** – kein Ticket dafür. Es bleibt die bekannte Lücke **ThreatReaction** (H, „fehlende ThreatReaction“): Ein alarmiertes Ziel feuert vor Traktor und Entern. Außerdem schließt SWU NPCs vom Traktor aus („außer Urlauber/NPC“), STU prüft beim Traktor kein NPC. → Prüfen und angleichen. Das gehört zum ThreatReaction-Ticket.

### 4. Wurmlöcher – Passage atomar, Rechte beim Stationsbetreiber (tmw-K7a/K7b)

**STU** (`Module/Spacecraft/Action/EnterWormhole/EnterWormhole.php`, `LeaveWormhole/LeaveWormhole.php`, `Component/Ship/Wormhole/WormholeEntryPrivilegeUtility.php`, `html/spacecraft/control/control_mid.twig:286-362`):
- **Rechte:**
  - Je Wurmloch-Eingang gibt es Regeln (`WormholeRestriction`) für Spieler, Allianz, Fraktion oder Schiff, jeweils als Erlauben oder Verbieten. Verbot gewinnt, sonst reicht eine Erlaubnis.
  - **Ohne passende Erlaubnis ist der Durchflug verboten.**
  - Geprüft wird beim Eintritt **und** beim Austritt.
- **Verwalten** kann diese Regeln **nur ein Admin**: Die Schaltfläche „Wurmlochkontrolle“ erscheint nur bei `isAdmin`. Es gibt keinen Stationsbetreiber als Verwalter.
- **Passage:**
  - Normale gerichtete Bewegung (`AbstractDirectedMovement` → `ShipMover`) zu einem zufälligen nutzbaren Eintrag, nicht im Warp, keine Station.
  - Flotten fliegen über den normalen Mover. Schiffe, die ausfallen, verlassen die Flotte (`ShipMover::leaveFleet`). **Nicht atomar.**

**Abweichungen in SWU:**
- Rechte verwaltet der Stationsbetreiber am Eingang (tmw-K7b), in STU ein Admin.
- Die Flottenpassage ist atomar, in STU schiffsweise mit Ausscheiden.

**Ticket (wie STU):**
- Wurmlochrechte nur durch Admins pflegbar (Admin-UI je Eingang).
- Prüfung bei Eintritt und Austritt, ohne Erlaubnis kein Durchflug.
- Die Rolle „Stationsbetreiber verwaltet Wurmloch“ entfällt.
- Flottenpassage wie normaler Flug mit Ausscheiden einzelner Schiffe.
- `map.md` tmw-K7a/K7b ersetzen.

### Entscheidungen PO zu K (2026-11-17): „Alles wie STU“

- **K1 Stationen:** ADR-0004 bleibt, weil das Modell STU entspricht. Kein Ticket.
- **K2 Flottenandocken/-abdocken:** wie STU, also schiffsweise mit Teilergebnis und Grund je Schiff. EPS-Mangel oder volle Dockplätze brechen ab, Tarnung, fehlende Crew und Reparatur überspringen das einzelne Schiff. Ticket anlegen und sc-WP-STAT-3a in `map.md` ersetzen.
- **K3 Traktor/Entern/Übernahme:** Die Haltungsunabhängigkeit bleibt (= STU). Ticket für die fehlende ThreatReaction vor Traktor und Entern, zusammen mit der Angleichung des NPC-Ausschlusses beim Traktor an STU.
- **K4 Wurmlöcher:** wie STU. Ticket anlegen und tmw-K7a/K7b in `map.md` ersetzen:
  - Rechte nur durch Admins pflegbar.
  - Prüfung bei Eintritt und Austritt, ohne Erlaubnis kein Durchflug.
  - Flottenpassage als normaler Flug mit Ausscheiden einzelner Schiffe.

## L. Handel und SWU-Zusätze (2026-11-17)

### 1. Handelsabkommen (tmw-T13) – PO: wie STU

**STU:** Ein Handelsabkommen (`AllianceRelationTypeEnum::TRADE`) hat **keine Handelswirkung**. Es gibt weder Lizenzrabatt noch kostenlose Lizenz, und auch keinen `tradeModifier`; der Begriff kommt im STU-Code gar nicht vor.

Das Abkommen wirkt nur über die Beziehungsrechte (`RelationPermissionEnum`):
- „Als Freund behandeln“ ist bei Handel, Freundschaft, Vasall und Bündnis wählbar.
- Daneben erscheint es in der Beziehungsliste der Allianz und in der Kontaktliste.

**Ticket:**
- Die kostenlose Lizenz für Partner (`mayTradeFavorably`) entfernen; Lizenzen kosten für alle den Postenpreis.
- `tradeModifier` bleibt entfernt.
- Das Handelsabkommen wirkt nur über die Freund-Berechtigung wie STU.
- `map.md` tmw-T13 ersetzen.

### 2. Kontotransfer (tmw-T3) – PO: wie STU

**STU** (`Module/Spacecraft/Action/TransferToAccount/TransferToAccount.php`, `TransferFromAccount`):
- `checkPosition`, also **gleicher Ort genügt**, kein Andocken.
- Außerdem: nicht getarnt, nicht im Warp, Lizenz nötig, Konto nicht voll, nur beambare Waren, Menge = min(Wunsch, Bestand, freier Platz).

**Bewertung:** Die SWU-Regel „Feld-Kopräsenz statt Docking“ **entspricht bereits STU** (das Ticket tmw-T3 sagt das selbst). Die Einordnung als „bewusste Abweichung“ im Teilbericht war falsch. **Kein Ticket.** Es bleibt der bekannte UI-Befund, dass der Transferknopf auch an Spielerposten erscheint (H).

### 3. Ausgestellte Lizenzen – Sichtbarkeit (tmw-T2, PO-Entscheid „nur Eigentümer“)

**STU** (`Module/Trade/View/ShowLicenseList/ShowLicenseList.php`, „Liste ausgestellter Handelslizenzen“):
- Die Liste aller gültigen Lizenzen eines Postens sieht **jeder, der selbst eine gültige Lizenz an diesem Posten hat**. Sonst gibt es eine `AccessViolationException`.
- Der Eigentümer sieht sie auch, weil er beim Bau automatisch eine unbefristete Lizenz erhält (`StationUtility::createTradepostAndLicense`, Ablauf 2038).

**Abweichung:** In SWU sieht nur der Eigentümer die Liste.

**Ticket (wenn wie STU):** Lizenznehmerliste für alle Spieler mit gültiger Lizenz am Posten, inklusive Eigentümer. Verlinkt aus Postenansicht und Lizenzliste. Die PO-Entscheidung in tmw-T2 ersetzen. → PO-Bestätigung nötig, siehe unten.

### 4. SWU-Zusätze – PO: alle entfernen außer der Fortschrittsbox in der Datenbank

Entfernen, damit SWU STU gleicht:
- **Tab „Handelsposten“** mit allen Posten (Handelsseite). STU kennt Posten nur über Karte, Datenbank und Lizenzen.
- **Kartenexport als Bild und JSON** (tmw-K6).
- **Hyperraumrouten-Overlay** auf der Sternenkarte.
- **Rangliste „Höchstes Prestige“** in der Datenbank.

Bleibt: **Fortschrittsbox in der Datenbank.**

**Ticket:** Die vier Zusätze aus Frontend und, soweit nur dafür vorhanden, aus Backend-Endpunkten entfernen. Dazugehörige Tests und Tutorialziele bereinigen; `map.md`-Einträge (u. a. tmw-K6) als zurückgenommen markieren. Vor dem Entfernen prüfen, ob andere Seiten die Endpunkte nutzen.

Hinweis: Weitere SWU-Zusätze aus den anderen Teilberichten sind davon nicht erfasst. Die Anweisung bezog sich auf die Liste in trade-map-world.md.

### Entscheidung PO zu L3 (2026-11-17)

- **L3:** wie STU. Die Lizenznehmerliste sehen alle Spieler mit gültiger Lizenz am Posten; der Eigentümer erhält wie STU automatisch eine unbefristete Lizenz für seinen Posten. Ticket anlegen und die PO-Entscheidung in tmw-T2 ersetzen.

## M. Soziales – STU-Abgleich zu vier bisherigen Abweichungen (2026-11-17)

### 1. Allianzen (ADR-0001) – Details STU vs. SWU

**a) Jobs statt Ämter**

**STU** (`Orm/Entity/AllianceJob.php`, `Component/Alliance/Enum/AllianceJobPermissionEnum.php`, `Module/Alliance/Lib/AllianceJobManager.php`, `Public/static/js/ally.js` „Rollen“-Editor, Aktion `SaveJobs`):
- Eine Allianz legt beliebig viele **Jobs/Rollen** an, mit eigenem Titel und Sortierung.
- Jedem Job werden Einzelrechte zugewiesen; ein Mitglied kann **mehrere Jobs** haben.
- Die 14 Rechte:

| Gruppe | Rechte |
|---|---|
| Präsident | `FOUNDER` – Präsident |
| Verwaltung | `SUCCESSOR` (Vize) als Oberrecht mit den Unterrechten `ALLIANCE_LEADERSHIP` (gehört zur Leitung), `EDIT_ALLIANCE`, `MANAGE_APPLICATIONS`, `MANAGE_JOBS`, `VIEW_COLONIES`, `VIEW_MEMBER_DATA`, `VIEW_SHIPS`, `VIEW_ALLIANCE_STORAGE`, `VIEW_ALLIANCE_HISTORY` |
| Diplomatie | `DIPLOMATIC` (Diplomat) als Oberrecht mit den Unterrechten `CREATE_AGREEMENTS`, `EDIT_DIPLOMATIC_DOCUMENTS` |

- Wer `MANAGE_JOBS` hat, kann Jobs verwalten. Laut ADR kann sich ein Vize damit selbst erweitern (STU-Bug).
- Weitere Allianzaktionen in STU: Bewerbung/Annahme/Ablehnung, Befördern/Degradieren, Rauswurf, Austritt, Details/Avatar, Forum mit Brettern/Themen/Sticky, Beziehungen (anbieten, annehmen, ablehnen, kündigen, Frieden vorschlagen, Vertragstext), Auflösen.

**SWU (ADR-0001):**
- Drei feste Ämter: Präsident (genau einer), Vize, Diplomat. Höchstens ein Amt je Mitglied, Titel umbenennbar.
- Nur der Präsident löst auf, übergibt und ernennt Vizes; vor dem Austritt muss er übergeben.
- **Was SWU damit nicht kann:**
  - Einzelrechte feiner verteilen, z. B. ein Mitglied, das nur Bewerbungen bearbeitet oder nur Schiffe einsieht.
  - Mehrere Rollen je Mitglied.
  - Eigene Rollen mit eigenem Titel neben den drei Ämtern.

**b) Fraktionsbindung**
- **STU:** Beim Gründen wählt der Gründer, ob die Allianz an seine Fraktion gebunden ist (`CreateAlliance.php:40-54`, `faction_mode`). Ohne Bindung (`faction_id = NULL`) sind Mitglieder beliebiger Fraktionen erlaubt.
- **SWU:** Bindung ist Pflicht.

**c) Feindschaft**
- **STU** (`Component/Player/Relation/EnemyDeterminator.php`): Feind ist nur, wer mit der eigenen Partei (Allianz oder Spieler) einen aktiven **Kriegsvertrag** hat, oder wer persönlich als Feind-Kontakt eingetragen ist. Die Fraktion spielt keine Rolle.
- **SWU:** Die andere Fraktion ist immer Feind, und Diplomatie gibt es nur innerhalb der eigenen Fraktion.
- **Auswirkung:** Feindschaft steuert in STU Alarmreaktion, NBS-Darstellung und Erlaubnisse. In SWU greift das automatisch fraktionsübergreifend; in STU muss es erst einen Krieg geben.

**Bewertung:** Alle drei sind bewusste, per ADR dokumentierte Abweichungen. Für „wie STU“ müssten frei konfigurierbare Jobs mit 14 Rechten, optionale Fraktionsbindung und Feindschaft nur über Krieg oder Kontakt gebaut werden; dazu fällt die Fraktionsgrenze bei der Diplomatie weg. → **PO-Frage M1.**

### 2. HoloNet-Kategorien und Admin-Pin (soc-D1)

**STU** (`Orm/Entity/KnPost.php`): Ein Beitrag hat Titel, Text, Datum, Autor, Bearbeitungszeit, optional Plot, gelöscht, Bewertungen, Kommentare und verknüpfte Charaktere.
- **Keine Kategorien.** Thematisch ordnet nur die Zugehörigkeit zu einem RPG-Plot.
- **Kein Pin bzw. kein Anheften.** Sticky gibt es in STU nur im Allianzforum (`SetTopicSticky`).
- Dafür gibt es ein **KN-Archiv** früherer Spielversionen (`ShowKnArchive`, `ShowKnArchivePlot*`).

**SWU:**
- Kategorien NEWS, ROLEPLAY, TRADE, RECRUITMENT.
- `isPinned` existiert nur im Backend, das Frontend zeigt es nicht an.

**Ticket (wie STU):** Kategorien und Pin entfernen (Entity-Spalten, Filter, Erstellen-Dialog); die Ordnung nur über Plot-Zuordnung. Das KN-Archiv ist ohne frühere Spielrunden gegenstandslos (vgl. „keine Spielrunde“ in shell-admin-runtime.md). → **PO-Frage M2** (entfernen?).

### 3. Ignorieren wirkt nur auf PMs (soc-C1b)

**STU:** Die Ignorierliste wirkt **ausschließlich** in `Module/Message/Action/WritePm/WritePm.php`. KN-Kommentar-Benachrichtigungen prüfen sie nicht.

**Bewertung:** SWU **entspricht bereits STU** (soc-C1a/C1b, wontfix mit genau dieser Begründung). **Kein Ticket.** Die Einordnung als „bewusste Abweichung“ war irreführend.

### 4. Schnell-PM: Seitenwechsel, Empfängersuche, Betreff

**STU:**
- **Schnell-PM ist ein Popup** (`Public/static/js/default.js:146` `openPmWindow` → `SHOW_WRITE_QUICKPM`, `html/communication/writeQuickPm.twig`).
  - Der Empfänger ist fest vorgegeben und wird nur angezeigt. Es gibt **nur ein Textfeld**, keinen Betreff.
  - Quelle und Ziel (Schiff/Kolonie/Station) werden als Kontext mitgegeben, das löst z. B. Crew-XP aus.
  - Versand per Ajax, man bleibt auf der Seite.
- **Normale PM** (`html/message/writePm.twig`):
  - Empfänger über **Siedler-ID** oder Auswahl aus der **Kontaktliste**, keine Namenssuche.
  - Ebenfalls **ohne Betreff** (`PrivateMessage` hat kein Betrefffeld).
  - Bei Antwort mit Korrespondenzverlauf.

**SWU:**
- Die Schnell-PM wechselt auf die Nachrichtenseite.
- Empfänger per Namenssuche.
- Nachrichten haben einen **Betreff** (`message.entity.ts:42`).

**Abweichungen:**
- Popup gegen Seitenwechsel: Der Spieler verliert den Kontext (Schiff/Kolonie).
- Ohne Quell-/Zielkontext entsteht keine Crew-XP für die PM vom Schiff (bekannter Befund, `FOREIGN_CONTACT_MESSAGE`).
- Betreff und Namenssuche sind SWU-Zusätze.

**Ticket (wie STU):**
- Schnell-PM als Popup bzw. Overlay auf der aktuellen Seite: Empfänger fest, nur Text, Quelle/Ziel als Kontext, Versand ohne Seitenwechsel.
- Normale PM: Empfänger per Siedler-ID oder Kontaktliste.
- Betreff entfernen. → **PO-Frage M4** (Betreff und Namenssuche wirklich entfernen?).

### Entscheidungen PO zu M (2026-11-17)

**M1 Allianzen: Rollen wie STU umbauen, Rest von ADR-0001 behalten.**
- Ticket: Die festen Ämter Präsident/Vize/Diplomat werden durch frei konfigurierbare **Jobs/Rollen** ersetzt.
  - Titel und Sortierung frei; mehrere Rollen je Mitglied.
  - Die 14 Einzelrechte gelten wie STU: `FOUNDER`, `SUCCESSOR` und `DIPLOMATIC` als Oberrechte mit ihren Unterrechten.
  - Ein Rollen-Editor in der Allianzverwaltung.
  - Alle Rechteprüfungen (Bewerbungen, Details, Diplomatie, Forum, Depots, History, Mitglieder-/Schiffs-/Kolonieeinsicht) laufen über die Rollenrechte.
- **Ausdrücklich nicht übernehmen (STU-Bug, ADR):** Ein Mitglied mit `MANAGE_JOBS` darf sich nicht selbst oder anderen `FOUNDER` geben und keine Rechte vergeben, die es selbst nicht hat.
- Es bleibt genau ein Präsident; Auflösen, Übergeben und Austrittsregel wie ADR-0001.
- Migration: Die bestehenden Ämter werden in drei Standardrollen mit entsprechenden Rechten überführt.
- Bleibt wie ADR-0001: **Pflichtfraktion** und **feste Fraktionsfeindschaft** (Diplomatie nur innerhalb der Fraktion).
- ADR-0001 wird angepasst: Der erste Punkt „Ämter statt Jobs“ entfällt; die Begründung zur Rechteausweitung wird zur Schutzregel.

**M2 HoloNet: nur den Pin entfernen.**
- Ticket: `isPinned` (Spalte, Endpunkte, Admin-Aktion) entfernen.
- Die Kategorien bleiben als bewusste SWU-Erweiterung.

**M4 Schnell-PM: wie STU.**
- Schnell-PM als Popup/Overlay auf der aktuellen Seite:
  - Empfänger fest und nur angezeigt, nur ein Textfeld, kein Betreff.
  - Quelle und Ziel (Schiff/Kolonie/Station) als Kontext, damit `FOREIGN_CONTACT_MESSAGE`/Crew-XP ausgelöst wird.
  - Versand ohne Seitenwechsel, mit Erfolgs- oder Fehleranzeige im Popup.
- Normale PM: Empfänger über Siedler-ID oder Auswahl aus der Kontaktliste; die Namenssuche entfällt.
- Der Betreff entfällt für alle PMs (Entity, DTO, UI, Systemnachrichten).
- Die Postfachliste zeigt dann Anfang des Texts bzw. Absender statt Betreff (siehe auch Befund „PM-Ordner zeigen volle Nachrichten“ in social.md).
- Alle Schnell-PM-Einstiege aus H (Siedlerliste, Ranglisten, Handelsposten, Lizenzliste, Plotschreiber, Allianzseite, Schiff → Kolonie) nutzen dieses Popup.

## N. Zusammenfassung: bewusste/entschiedene Abweichungen (Stand nach PO-Entscheidungen, 2026-11-17)

### N1. Bleiben als bewusste SWU-Abweichung

**Scope und Setting**
- Piraten, Quests (inkl. Piraten-History/-Awards, Kazon-NAP) und der Orion-Sklavenhandel entfallen (map.md Leitplanken 2/3).
- NPC-Konten nur für den Handel; NPC-Werkzeuge als Admin-Seiten.
- Star-Wars-Ersatz für alle Star-Trek-Inhalte:
  - Fraktionen, Gebäude- und Warennamen; Latinum heißt Aurodium.
  - Ferengi/Nagus werden zum Hutten-Kartell; der Award-Katalog ist Star Wars.
  - KommNet heißt HoloNet, Urlaub heißt Kryoschlaf.
  - Lebenstag-Geschenke und Frühlings-Kapseln.
  - Instandhaltungsset/Schiffssystem-Baugruppe, Molekular-Raffinerie, Gravitationswellenscanner, Navicomputer-Sprung, Hyperantriebs-Notladegerät, Signaturmaskierung, RPG-Transponder, Kooperationsuplink.
  - Stationsrollennamen.
- Genau zwei spielbare Fraktionen; keine fraktionsabhängigen Schiffswerte (tmw-FA1b2); Tarnung nur für das Imperium.

**Karte und Navigation (ADRs)**
- Galaxieflug statt zeitbasiertem Hyperraumsprung (ADR-0006).
- Persönliche Systementdeckung (ADR-0002), messpunktbasierte Kartographie (ADR-0003).
- Ebenenkenntnis und Kartenzyklus (ADR-0007/0008), Regionskartographie (ADR-0009).
- Keine Routenvorschau für Feldkosten (= STU).

**Kolonie**
- Forschungsqueue mit 10 Plätzen, Auto-Pfad und Fortschrittserhalt (ADR-0005).
- Kolonieabgabe als Ruine (ADR-0007).
- Basishandel: Kauf-Modifier −10 statt STU-Bug; SWU-Warenliste.
- SWU-Erweiterungen: Ökosystem-Box, Bonusfelder.

**Schiffe**
- Die passive 1-%-Modulreparatur entfällt (sc-WP-ENG-3b).

**Allianz und Soziales**
- Pflichtfraktion und feste Fraktionsfeindschaft; Diplomatie nur innerhalb der Fraktion (ADR-0001, Rest).
- HoloNet-Kategorien bleiben.
- Kein KN-Archiv (keine früheren Runden).

**Datenbank und Statistik**
- Fortschrittsbox in der Datenbank bleibt.
- Statistik-Reihen mit Fraktion statt NPC; Prestigewerte fest.
- Verlassene Posten ohne Eigentümer.

**Rahmen und Betrieb**
- In-Universe-Datum „n NSY“.
- Spieler-IDs ab 100.
- Tick-Zeitzone Europe/Berlin.
- Status TICK sperrt Schreibaktionen.
- Startplanetenwahl über Sektor → System → Planet.
- SMS-Verifikation, Referer-Tracking, Partnerseiten, Spiegelwelt, Benchmark werden nicht übernommen.
- Tutorial-Inhalte, mobile Darstellung und Mailzustellung macht SWU selbst (kein STU-Maßstab).
- Ein dunkles Farbschema wird neu entworfen.

### N2. Bisher bewusst – jetzt „wie STU“ (werden Tickets)

| Thema | Neu |
|---|---|
| Feature-Flags Mail/Löschung/Rechtstexte (Leitplanke 4) | Flags entfallen, standardmäßig aktiv |
| Spieldaten aus `game-data` | DB als Quelle wie STU (erst ADR + Spec) |
| Profilbesucher auf dem Maindesk | entfernen wie STU |
| Urlaub | exakt STU (48 h bis wirksam, Tick, Sperrfrist) |
| Invite-Keys | entfallen (auf origin/main erledigt) |
| Fraktionen ohne `playerLimit` | `playerLimit` wie STU |
| Sammelfelder unerschöpflich | Vorrat, Erschöpfung, Regeneration wie STU |
| Demontage nur an aktiver Werft, Fracht ins Lager | Werftgebäude auch deaktiviert, Fracht wird vernichtet |
| Teleskop-Scan | zählt Stationen und alle Zustände, getarnte nicht |
| Sandbox für alle, Limit 3 | nur per Admin-Freigabe, ohne Limit, an Quellkolonie gebunden |
| Flottenandocken atomar | schiffsweise mit Teilergebnis |
| Wurmlochrechte beim Stationsbetreiber, Passage atomar | Rechte nur durch Admin, Passage wie normaler Flug |
| Traktor ohne NPC | NPC-Ausschluss an STU angleichen (mit ThreatReaction-Ticket) |
| Handelsabkommen = kostenlose Lizenz | keine Handelswirkung, nur Freund-Recht |
| Lizenznehmerliste nur Eigentümer | für alle Lizenzinhaber; Eigentümer erhält Dauerlizenz |
| SWU-Zusätze (Tab Handelsposten, Kartenexport, Hyperraumrouten-Overlay, Rangliste Prestige) | entfernen |
| Allianz-Ämter | Rollen/Jobs mit 14 Rechten (ohne Rechteausweitungs-Bug) |
| HoloNet-Pin | entfernen |
| Schnell-PM (Seitenwechsel, Namenssuche, Betreff) | Popup, Siedler-ID/Kontaktliste, kein Betreff |
| Kein globaler Diplomatie-Graph | Diplomatie-Graph wie STU (`DiplomaticRelations`, GraphViz) |
| Handelsposten in der Datenbank ohne Entdeckung | Eintrag erst nach Entdeckung (Handelsmenü öffnen) wie STU, mit Prestige |

### N3. Als Abweichung geführt, entspricht aber schon STU (kein Ticket)

- Stationen als `Spacecraft` mit Rollen (ADR-0004).
- Traktor, Entern und Übernahme unabhängig von der Haltung.
- Schiffbau reserviert keine Crew.
- Teleskop-Karte zeigt nur die persönliche Erkundung.
- Kontotransfer über Feld-Kopräsenz statt Docking.
- Ignorieren wirkt nur auf PMs.

### N4. Nachtrag PO (2026-11-17): zwei weitere Punkte „wie STU“

**Diplomatie-Graph**
- **STU** (`Module/Alliance/View/Diplomatic/DiplomaticRelations.php`, `Component/Alliance/Relations/Renderer/AllianceRelationRenderer.php`, `RelationItemVertexBuilder.php`, `Component/GrapViz/*`):
  - Eine globale Seite „Diplomatische Beziehungen“ zeichnet alle aktiven Allianzbeziehungen als GraphViz-SVG.
  - Knoten sind Allianzen, Kanten Beziehungen; Farbe je Beziehungstyp (`AllianceRelationTypeEnum::getColor`), Tooltip mit dem Typnamen.
  - Hintergrund `#121220`.
- **Ticket:** Globale Diplomatie-Graph-Seite wie STU. Darstellung serverseitig (GraphViz) oder clientseitig mit gleicher Information.
  - Knoten verlinken auf die Allianz, Kantenfarben je Typ.
  - Beziehungslisten und Chronik bleiben zusätzlich.
  - Die Spec-Entscheidung in `diplomatie-kern-spec.md:169` ersetzen.

**Handelsposten-Entdeckung**
- **STU** (`Module/Spacecraft/View/ShowTradeMenu/ShowTradeMenu.php:61-63`, `DatabaseCategoryTypeEnum::TRADEPOST`):
  - Der Datenbankeintrag eines Handelspostens wird beim **Öffnen des Handelsmenüs am Posten** entdeckt (`checkDatabaseItem`), also nur bei Anwesenheit am selben Ort.
  - Erst danach erscheint er in der Datenbankkategorie Handelsposten, mit Prestige.
- **Ticket:**
  - Handelsposten-Einträge wie STU erst nach Entdeckung sichtbar; Entdeckung beim Öffnen des Handelsmenüs mit Prestige.
  - Bestehende Spieler bekommen keine automatische Gutschrift; Migration im Ticket festlegen.
  - tmw-D6a ersetzen.

## O. Angelegte Tickets (2026-11-17)

103 Tickets unter `../issues/`: 92 ready-for-agent, 5 needs-triage, 3 needs-info, 3 ready-for-human; 18 × P1, 55 × P2, 30 × P3.

| ID | Titel | Status | Prio | Blocked by |
|---|---|---|---|---|
| [col-AUD-01](../issues/col-AUD-01-gebaeudereparatur-im-ui.md) | Gebäudereparatur im UI (Vorschau und Reparieren) | ready-for-agent | P1 | — |
| [col-AUD-02a](../issues/col-AUD-02a-kolonieliste-echte-werte.md) | Kolonieliste mit echten Werten (Signaturen, Verteidigung, Wachstum) | ready-for-agent | P2 | — |
| [col-AUD-02b](../issues/col-AUD-02b-kolonieliste-stu-bloecke.md) | Kolonieliste: Warenverbrauch, Terraforming, Modulproduktion, Aktivierungshinweis | ready-for-agent | P2 | — |
| [col-AUD-03](../issues/col-AUD-03-felddialog-baustelle.md) | Felddialog Baustelle: Restzeit, Fortschritt, „Nach Bau aktivieren“ umschaltbar | ready-for-agent | P2 | — |
| [col-AUD-04](../issues/col-AUD-04-modulfabrik-informationsdichte.md) | Modulfabrik mit STU-Informationsdichte (Bedarfsfilter, Accountbestand, Sammelbestellung) | ready-for-agent | P2 | — |
| [col-AUD-05a](../issues/col-AUD-05a-werft-rumpfauswahl.md) | Werft: Rumpfauswahl mit Bild, Zählern und deutschen Labels | ready-for-agent | P2 | — |
| [col-AUD-05b](../issues/col-AUD-05b-bauplanliste-und-umbenennen.md) | Baupläne: eigene Liste mit Schiffsanzahl, Bauzeit, Modulen und Umbenennen | ready-for-agent | P2 | — |
| [col-AUD-06a](../issues/col-AUD-06a-gebaeudevorschau-und-upgrade.md) | Gebäudevorschau mit Limits und Bilanzvorschau, Upgrade mit Dauer und Produktion | ready-for-agent | P3 | — |
| [col-AUD-06b](../issues/col-AUD-06b-informationen-und-schreibfehler.md) | „Informationen“ mit Station im Orbit, Uhrzeit, Rotation, Systemkartenlink; Umlaut-Schreibfehler | ready-for-agent | P3 | — |
| [col-AUD-07](../issues/col-AUD-07-reaktivierung-nach-upgrade.md) | Reaktivierung nach Upgrade wie STU | ready-for-agent | P1 | — |
| [col-AUD-08a](../issues/col-AUD-08a-tick-abschaltreihenfolge-und-wohnraum.md) | Kolonie-Tick: Abschaltreihenfolge Waren → Wohnraum → Energie wie STU | ready-for-agent | P1 | — |
| [col-AUD-08b](../issues/col-AUD-08b-tick-lagerbuchung-und-wachstum.md) | Kolonie-Tick: Lagerbuchung nach `commodity.sort`, Wachstum und Wohnraum wie STU | ready-for-agent | P1 | col-AUD-08a |
| [col-AUD-09a](../issues/col-AUD-09a-kolonisierung-regeln.md) | Kolonisierung wie STU: Startwerte, erste Kolonie, Startfeld, Datenbankeintrag | ready-for-agent | P2 | — |
| [col-AUD-09b](../issues/col-AUD-09b-kolonisierung-vorkommen.md) | Kolonisierung: Vorkommen zwischen min und max würfeln, STU-Mengen | ready-for-agent | P2 | col-AUD-12 |
| [col-AUD-10a](../issues/col-AUD-10a-hangar-regeln.md) | Hangar wie STU: ein Kolonieschiff, Rumpfbau stückweise | ready-for-agent | P2 | — |
| [col-AUD-10b](../issues/col-AUD-10b-hangar-startwerte.md) | Hangar: Start-Energie, Crew, Module und Torpedos je Hangar-Rumpf wie STU | ready-for-agent | P3 | col-AUD-12 |
| [col-AUD-11a](../issues/col-AUD-11a-orbit-alle-ungetarnten-schiffe.md) | Orbit und Orbitalmanagement listen alle ungetarnten Schiffe wie STU | ready-for-agent | P2 | — |
| [col-AUD-11b](../issues/col-AUD-11b-orbitalmanagement-ui.md) | Orbitalmanagement: Rumpfbild, Torpedoreserven, Typauswahl, Shuttle-Transfer, PanelOrbit-Callbacks | ready-for-agent | P2 | col-AUD-11a |
| [col-AUD-12](../issues/col-AUD-12-datenanfrage-stu-vorkommen-hangar-sammelfelder.md) | Datenanfrage an STU: Vorkommen, Hangar-Baupläne, Sammelfeldvorräte | needs-info | P2 | — |
| [col-AUD-13](../issues/col-AUD-13-koloniebotschaft-bbcode.md) | Koloniebotschaft mit BBCode, Schiffsaktion als umgesetzt führen | ready-for-agent | P3 | — |
| [col-AUD-14](../issues/col-AUD-14-demontage-wie-stu.md) | Demontage wie STU: Werftgebäude auch deaktiviert, Fracht wird vernichtet | ready-for-agent | P2 | — |
| [col-AUD-15](../issues/col-AUD-15-teleskop-scan-wie-stu.md) | Teleskop-Scan zählt wie STU (Stationen, alle Zustände, ohne Getarnte) | ready-for-agent | P1 | — |
| [col-AUD-16a](../issues/col-AUD-16a-sandbox-freigabe.md) | Kolonie-Sandbox nur per Freigabe wie STU (Feature-Freigabe `COLONY_SANDBOX`) | ready-for-agent | P2 | — |
| [col-AUD-16b](../issues/col-AUD-16b-sandbox-an-quellkolonie.md) | Kolonie-Sandbox an Quellkolonie gebunden und mit ihr gelöscht | ready-for-agent | P2 | col-AUD-16a |
| [sc-AUD-01](../issues/sc-AUD-01-bojen-im-ui.md) | Bojen im UI: auslegen, aufnehmen, anzeigen | ready-for-agent | P2 | — |
| [sc-AUD-02](../issues/sc-AUD-02-systeme-aus-beim-bau-und-scanner-ui.md) | Systeme beim Bau ausgeschaltet, Scanner schaltbar, Subraumanalyse im UI | ready-for-agent | P1 | — |
| [sc-AUD-03](../issues/sc-AUD-03-traktorstrahl-loesen-und-andocken.md) | Traktorstrahl: lösen, Ziel beim Ziehenden, gehaltenes Schiff andocken | ready-for-agent | P2 | — |
| [sc-AUD-04](../issues/sc-AUD-04-station-lss-und-sensorphalanx-scan.md) | Station: LSS-Karte und Sensorphalanx-Scan | ready-for-agent | P2 | — |
| [sc-AUD-05a](../issues/sc-AUD-05a-flottenweit-systeme-schalten-und-crewlimit.md) | Flottenkontrolle Backend: Systeme flottenweit schalten, 100 Crew je Flotte | ready-for-agent | P2 | — |
| [sc-AUD-05b](../issues/sc-AUD-05b-flottenkontrolle-und-flottenstatus-im-schiffsdetail.md) | Flottenkontrolle UI: Flottenschalter, Flottenstatus und Alarmstufe im Schiffsdetail | ready-for-agent | P2 | sc-AUD-05a |
| [sc-AUD-06](../issues/sc-AUD-06-nbs-liste-gruppiert-wie-stu.md) | NBS-Liste gruppiert wie STU | ready-for-agent | P2 | — |
| [sc-AUD-07a](../issues/sc-AUD-07a-kampf-matchup-und-zielwahl.md) | Kampf-Engine wie STU: Matchup, Zufallsziel, Feuerbedingung, Schadensmodell | ready-for-agent | P1 | — |
| [sc-AUD-07b](../issues/sc-AUD-07b-kampf-parteibildung-wie-stu.md) | Kampf-Parteibildung wie STU (Flotte über Führer, angedockte Station verteidigt mit) | ready-for-agent | P1 | sc-AUD-07a |
| [sc-AUD-08](../issues/sc-AUD-08-kampfvorbereitung-und-nachbereitung.md) | Kampfvorbereitung und -nachbereitung wie STU | ready-for-agent | P1 | — |
| [sc-AUD-09](../issues/sc-AUD-09-threatreaction-vor-traktor-und-entern.md) | ThreatReaction vor Traktor und Entern, NPC-Ausschluss beim Traktor wie STU | ready-for-agent | P1 | sc-AUD-07a, sc-AUD-07b |
| [sc-AUD-10](../issues/sc-AUD-10-schildregeneration-wie-stu.md) | Schildregeneration wie STU | ready-for-agent | P1 | — |
| [sc-AUD-11](../issues/sc-AUD-11-flottenandocken-schiffsweise.md) | Flottenandocken und -abdocken schiffsweise wie STU | ready-for-agent | P2 | — |
| [sc-AUD-12a](../issues/sc-AUD-12a-sammelfelder-mit-vorrat-mechanik.md) | Sammelfelder mit Vorrat wie STU – Mechanik | ready-for-agent | P2 | — |
| [sc-AUD-12b](../issues/sc-AUD-12b-sammelfelder-vorraete-kalibrieren.md) | Sammelfelder: Vorratsmengen kalibrieren | ready-for-agent | P3 | sc-AUD-12a, col-AUD-12 |
| [sc-AUD-13](../issues/sc-AUD-13-fremde-logbuecher-lesbar.md) | Fremde Logbücher lesbar: Zielscan und Spielerprofil | ready-for-agent | P2 | — |
| [sc-AUD-14](../issues/sc-AUD-14-shuttle-management-an-stationen.md) | Shuttle-Management an Stationen | ready-for-agent | P3 | — |
| [sc-AUD-15](../issues/sc-AUD-15-dock-beamen-ohne-eps-und-im-ionensturm.md) | Beamen zwischen Station und angedocktem Schiff ohne EPS und im Ionensturm | ready-for-agent | P2 | — |
| [sc-AUD-16a](../issues/sc-AUD-16a-flottenkopf-und-systemleiste.md) | Kleine Schiffs-UI-Lücken: Flottenkopf in der Schiffsliste, Systemleiste im Schiffskopf | ready-for-agent | P3 | sc-AUD-05a |
| [sc-AUD-16b](../issues/sc-AUD-16b-feldkontext-hinweise-und-stationsausbau.md) | Kleine Schiffs-UI-Lücken: Feldkontext-Hinweise und Stationsausbau | ready-for-agent | P3 | — |
| [sh-AUD-01](../issues/sh-AUD-01-feature-flags-entfernen.md) | Feature-Flags für Mail, Verifikation, Löschung und Rechtstexte entfernen | ready-for-agent | P2 | — |
| [sh-AUD-02](../issues/sh-AUD-02-spieldaten-in-der-datenbank.md) | Spieldaten in die Datenbank statt `game-data` (ADR + Spec) | needs-info | P2 | — |
| [sh-AUD-03](../issues/sh-AUD-03-dunkles-farbschema.md) | Dunkles Farbschema entwerfen und auswählbar machen | ready-for-human | P3 | — |
| [sh-AUD-04](../issues/sh-AUD-04-profilbesucher-box-entfernen.md) | Profilbesucher-Box vom Maindesk entfernen | ready-for-agent | P3 | — |
| [sh-AUD-05](../issues/sh-AUD-05-urlaub-exakt-wie-stu.md) | Urlaub exakt wie STU: Wirksamkeit nach 48 h im Tick, Werft läuft weiter | ready-for-agent | P1 | — |
| [sh-AUD-06](../issues/sh-AUD-06-fraktions-spielerlimit.md) | Spielerlimit je Fraktion wie STU, Registrierung prüft Wählbarkeit | ready-for-agent | P2 | — |
| [sh-AUD-07a](../issues/sh-AUD-07a-schiffsbau-und-umruestung-minuetlich.md) | Schiffsbau und Umrüstung minütlich abschließen wie STU-Process-Tick | ready-for-agent | P1 | — |
| [sh-AUD-07b](../issues/sh-AUD-07b-reparaturen-minuetlich.md) | Werft-, Stations- und Eigenreparatur minütlich abschließen wie STU-Process-Tick | ready-for-agent | P1 | sh-AUD-07a |
| [sh-AUD-08](../issues/sh-AUD-08-notrufbox-im-maindesk.md) | Notrufbox im Maindesk anzeigen | ready-for-agent | P2 | — |
| [sh-AUD-09](../issues/sh-AUD-09-seitenkopf-und-meldungsbox-ausrollen.md) | Seitenkopf und Meldungsbox auf allen Spielseiten | needs-triage | P2 | — |
| [sh-AUD-10](../issues/sh-AUD-10-zufaellige-spieler-online.md) | „Zufällige Spieler (online)“ mit bis zu 35 Avataren | ready-for-agent | P3 | — |
| [sh-AUD-11a](../issues/sh-AUD-11a-maintenance-crew-xp-plots-awards.md) | Maintenance: täglicher Crew-XP-Tick, leere RPG-Plots löschen, fehlende Awards nachtragen | ready-for-agent | P2 | — |
| [sh-AUD-11b](../issues/sh-AUD-11b-maintenance-korrektur-und-hinweise.md) | Maintenance: Kolonie-/Spacecraft-Korrektur, defekte Flotten, Noobzone-Hinweis | ready-for-agent | P3 | sh-AUD-11a, sc-AUD-05a |
| [sh-AUD-12](../issues/sh-AUD-12-admin-werkzeuge.md) | Admin-Werkzeuge: Livekarte, Wetterbericht, Schiff aufladen, Einzel-Ticks, Korrekturskripte, Spielerliste | needs-triage | P3 | — |
| [sh-AUD-13](../issues/sh-AUD-13-spielrunde-statistik-version.md) | Spielrunde: Rundennummer, Rundenstatistik, Version und Changelog im Spiel | needs-triage | P3 | — |
| [sh-AUD-14](../issues/sh-AUD-14-kleinere-rahmenluecken.md) | Kleinere Rahmenlücken: Umlaute/Emoji, Forum-Link, Navigation „Stationen“, Akzeptanz-Checkbox | ready-for-agent | P3 | — |
| [sh-AUD-15](../issues/sh-AUD-15-tutorial-inhalte-schreiben.md) | Tutorial-Inhalte selbst schreiben und Lücken schließen | ready-for-human | P3 | — |
| [sh-AUD-16](../issues/sh-AUD-16-mobile-darstellung.md) | Mobile Darstellung prüfen und verbessern (SWU-eigen) | needs-triage | P3 | — |
| [sh-AUD-17](../issues/sh-AUD-17-mailzustellung-im-betrieb.md) | Mailzustellung im Betrieb: Versand, Zustellbarkeit, Absender, SPF/DKIM | ready-for-human | P2 | — |
| [soc-AUD-01](../issues/soc-AUD-01-pm-ordner-volle-nachrichten.md) | PM-Ordner mit vollen Nachrichten wie STU | ready-for-agent | P2 | soc-AUD-07b |
| [soc-AUD-02](../issues/soc-AUD-02-holonet-liste-wie-stu.md) | HoloNet-Liste aufgeklappt und mit Autor-/Admin-Aktionen wie STU | ready-for-agent | P2 | — |
| [soc-AUD-03](../issues/soc-AUD-03-holonet-pin-entfernen.md) | HoloNet-Pin entfernen | ready-for-agent | P3 | — |
| [soc-AUD-04](../issues/soc-AUD-04-history-station-und-kolonie.md) | Globale History: STATION- und COLONY-Ereignisse schreiben | ready-for-agent | P2 | — |
| [soc-AUD-05](../issues/soc-AUD-05-transferrecht-aus-sicht-des-ziels.md) | Transferberechtigung aus Sicht des Zielbesitzers wie STU | ready-for-agent | P1 | — |
| [soc-AUD-06](../issues/soc-AUD-06-mails-wie-stu.md) | Mails wie STU: PM-Benachrichtigung, Massenmail, Tick-Fehlermail | ready-for-agent | P2 | sh-AUD-01 |
| [soc-AUD-07a](../issues/soc-AUD-07a-schnell-pm-popup-mit-kontext.md) | Schnell-PM als Popup mit Quell-/Zielkontext und Crew-XP | ready-for-agent | P1 | — |
| [soc-AUD-07b](../issues/soc-AUD-07b-pm-ohne-betreff-empfaengerwahl.md) | PMs ohne Betreff, Empfänger per Siedler-ID oder Kontaktliste | ready-for-agent | P2 | soc-AUD-07a |
| [soc-AUD-07c](../issues/soc-AUD-07c-schnell-pm-fehlende-einstiege.md) | Schnell-PM: fehlende Einstiege wie STU | ready-for-agent | P2 | soc-AUD-07a |
| [soc-AUD-08](../issues/soc-AUD-08-prestigequellen-wie-stu.md) | Fehlende Prestigequellen wie STU | ready-for-agent | P2 | — |
| [soc-AUD-09a](../issues/soc-AUD-09a-allianz-rollen-datenmodell-und-rechte.md) | Allianz-Rollen wie STU: Datenmodell, Rechteprüfung, Migration, ADR | ready-for-agent | P2 | — |
| [soc-AUD-09b](../issues/soc-AUD-09b-allianz-rollen-editor.md) | Allianz-Rollen-Editor in der Allianzverwaltung | ready-for-agent | P2 | soc-AUD-09a |
| [soc-AUD-10](../issues/soc-AUD-10-globaler-diplomatie-graph.md) | Globaler Diplomatie-Graph wie STU | ready-for-agent | P3 | — |
| [soc-AUD-11](../issues/soc-AUD-11-allianzseiten-luecken.md) | Allianzseiten: fehlende Angaben in Diplomatie, Detail und Forum | ready-for-agent | P3 | — |
| [soc-AUD-12a](../issues/soc-AUD-12a-nachrichten-links-und-kontakte.md) | Kleinere Nachrichtenlücken: Kontakt-Dropdown, Forenroute, „ansehen“-Ziele | ready-for-agent | P3 | — |
| [soc-AUD-12b](../issues/soc-AUD-12b-plots-und-award-bilder.md) | Plotliste/-detail und Award-Bilder wie STU | ready-for-agent | P3 | — |
| [soc-AUD-12c](../issues/soc-AUD-12c-startseite-lagermeldung-tarnung.md) | Startseite bei Reload, doppelte Lagermeldung, getarnte geteilte Schiffe | ready-for-agent | P3 | — |
| [soc-AUD-12d](../issues/soc-AUD-12d-crew-raenge-benennen.md) | Eigene Crew-Rangnamen in den Einstellungen | ready-for-agent | P3 | — |
| [soc-AUD-12e](../issues/soc-AUD-12e-crew-rassen-verwalten.md) | Crew-Rassen verwalten wie STU | needs-info | P3 | — |
| [tmw-AUD-01a](../issues/tmw-AUD-01a-warenkonto-vertrag-erweitern.md) | Warenkonto-Vertrag für die STU-Kontobox erweitern | ready-for-agent | P1 | — |
| [tmw-AUD-01b](../issues/tmw-AUD-01b-warenkontobox-wie-stu.md) | Warenkontobox wie STU tradeAccounts.twig | ready-for-agent | P1 | tmw-AUD-01a |
| [tmw-AUD-02a](../issues/tmw-AUD-02a-galaxiekarte-feldvertrag-erweitern.md) | Galaxiekarte: Feldvertrag um Besitzer, Handelsposten und Region erweitern | ready-for-agent | P2 | — |
| [tmw-AUD-02b](../issues/tmw-AUD-02b-galaxiekarte-tooltip-feldpanel-handelsposten.md) | Galaxiekarte: Tooltip, Feldpanel und Handelsposten-Icon wie STU | ready-for-agent | P2 | tmw-AUD-02a |
| [tmw-AUD-02c](../issues/tmw-AUD-02c-galaxiekarte-schiffsdetails.md) | Galaxiekarte: Schiffsdetails mit Schilden, Energie und Antrieb | ready-for-agent | P3 | — |
| [tmw-AUD-03a](../issues/tmw-AUD-03a-datenbank-rumpfdetail.md) | Datenbank: Rumpf- und Stationsrumpfdetail wie STU shiprump.twig | ready-for-agent | P2 | — |
| [tmw-AUD-03b](../issues/tmw-AUD-03b-datenbank-planetentyp-systemtyp-regionskarte.md) | Datenbank: Planetentyp, Systemtyp und Regionskarte als Detailansicht | ready-for-agent | P2 | — |
| [tmw-AUD-04](../issues/tmw-AUD-04-hutten-deals-und-auktionen-wie-stu.md) | Hutten-Deals und Auktionen wie STU deals.twig | ready-for-agent | P2 | — |
| [tmw-AUD-05](../issues/tmw-AUD-05-siedlerliste-wie-stu.md) | Siedlerliste wie STU userList.twig | ready-for-agent | P2 | soc-AUD-07a |
| [tmw-AUD-06a](../issues/tmw-AUD-06a-kleinere-handelsluecken.md) | Kleinere Handelslücken: Lotterie, Lizenzinfo, Basishandel, Transferknopf | ready-for-agent | P3 | — |
| [tmw-AUD-06b](../issues/tmw-AUD-06b-ranglisten-wie-stu.md) | Ranglisten wie STU: Avatar, Erklärtext, eigener Punktestand | ready-for-agent | P3 | — |
| [tmw-AUD-06c](../issues/tmw-AUD-06c-datenbankkategorie-rpg-schiffe.md) | Datenbankkategorie RPG-Schiffe | ready-for-agent | P3 | — |
| [tmw-AUD-07](../issues/tmw-AUD-07-crew-uebersicht-in-der-datenbank.md) | Crew-Übersicht in der Datenbank wie STU crewManagement.twig | ready-for-agent | P2 | — |
| [tmw-AUD-08](../issues/tmw-AUD-08-npc-posten-aurodium-pflicht.md) | NPC-Posten: Angebot verlangt Aurodium, wenn kein Aurodium angeboten wird | ready-for-agent | P2 | — |
| [tmw-AUD-09](../issues/tmw-AUD-09-handelsabkommen-ohne-handelswirkung.md) | Handelsabkommen ohne Handelswirkung wie STU | ready-for-agent | P2 | — |
| [tmw-AUD-10](../issues/tmw-AUD-10-lizenznehmerliste-fuer-lizenzinhaber.md) | Lizenznehmerliste für alle Lizenzinhaber, Dauerlizenz des Eigentümers | ready-for-agent | P2 | — |
| [tmw-AUD-11](../issues/tmw-AUD-11-swu-zusaetze-entfernen.md) | SWU-Zusätze im Handel, auf der Karte und in der Datenbank entfernen | ready-for-agent | P2 | — |
| [tmw-AUD-12a](../issues/tmw-AUD-12a-wurmlochrechte-nur-admin.md) | Wurmlochrechte wie STU: nur Admin, ohne Erlaubnis kein Durchflug | ready-for-agent | P2 | — |
| [tmw-AUD-12b](../issues/tmw-AUD-12b-wurmloch-flottenpassage-wie-stu.md) | Wurmloch-Flottenpassage als normaler Flug mit Ausscheiden einzelner Schiffe | ready-for-agent | P2 | tmw-AUD-12a |
| [tmw-AUD-13](../issues/tmw-AUD-13-handelsposten-entdeckung-wie-stu.md) | Handelsposten-Entdeckung in der Datenbank wie STU | ready-for-agent | P2 | — |
| [tmw-AUD-14](../issues/tmw-AUD-14-restliche-npc-werkzeuge.md) | Restliche NPC-Werkzeuge als Admin-Seiten (Leitplanke 3 prüfen) | needs-triage | P3 | — |

**Für PO zu bestätigen (von Ticket-Agenten festgelegt):**
- col-AUD-16a: Bestehende Sandboxen ohne Freigabe bleiben gespeichert, sind aber unsichtbar.
- col-AUD-08a: Koloniezentrale verliert wie STU den Abschaltschutz.
- tmw-AUD-12a: Migration gibt bestehenden Wurmlöchern ohne Regeln je spielbarer Fraktion eine ALLOW-Regel, damit sie nicht schlagartig gesperrt sind.
- tmw-AUD-01a/b: Kontobox zählt Bestand + Angebotsreserve wie die SWU-Prüfung (STU zählt nur Bestand).
- tmw-AUD-13: 5 Prestige je entdecktem Handelsposten.
- sh-AUD-05: STU prüft Urlaub bei passiver Reparatur faktisch nicht (Komponente nicht registriert) – soll passive Reparatur im Urlaub laufen?
- soc-AUD-12e (needs-info): Crew-Rassen voll wie STU, fester Star-Wars-Katalog oder wontfix?
- sh-AUD-01 setzt den Merge von origin/main (da02e52f) voraus.

**PO-Antworten (2026-11-17), in die Tickets übernommen:**
1. Sandbox: kein Bestand vorhanden, Altdaten dürfen verworfen werden (col-AUD-16a).
2. Koloniezentrale ohne Abschaltschutz wie STU: bestätigt (col-AUD-08a).
3. Wurmlöcher: nicht live, keine Bestandsmigration, exakt STU (tmw-AUD-12a).
4. Warenkonto: nur Bestand zählt, in Anzeige und Platzprüfung; ersetzt tmw-T4a-Reserveregel (tmw-AUD-01a/b).
5. 5 Prestige je Handelsposten: bestätigt (tmw-AUD-13).
6. Passive Reparatur läuft im Urlaub weiter wie STU (sh-AUD-05).
7. Crew-Spezies: fester Star-Wars-Katalog statt STU-Rassen, ohne Einreichung/Moderation; soc-AUD-12e jetzt ready-for-agent.
8. Merge origin/main: Probelauf ergab 31 Konflikte (u. a. auth, colony, spacecraft.service, app-shell, Submodule `assets`/`game-data`); Umsetzung in eigener Session vorgeschlagen.
