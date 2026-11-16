# swuniverse

## Spieler & Gruppen

**Fraktion**:
Eine der beiden großen Seiten des Spiels, die **Rebellenallianz** oder das **Galaktische Imperium**. Ein Spieler wählt sie beim Einstieg einmalig.
_Avoid_: Volk, Seite

**Rebellenallianz**:
Die Fraktion der Rebellen. Sie wird immer mit vollem Namen genannt, nie verkürzt zu „Allianz“.
_Avoid_: Allianz (für die Fraktion), Rebellion

**Allianz**:
Ein von Spielern gegründeter Zusammenschluss. Alle Mitglieder gehören derselben **Fraktion** an. Ein Spieler ist in höchstens einer Allianz.
_Avoid_: Clan, Gilde, Verband

**Siedler**:
Ein **Spieler** ohne **Allianz**, der als eigene Partei Beziehungen zu anderen Siedlern und zu **Allianzen** derselben **Fraktion** führen kann. Gründet er eine Allianz oder tritt er einer bei, enden seine persönlichen Beziehungen und Vorschläge endgültig.
_Avoid_: Einzelspieler, Solo

**Amt**:
Eine feste Rolle innerhalb einer **Allianz**, nämlich **Präsident**, **Vize** oder **Diplomat**. Jedes Mitglied hat höchstens ein Amt. Die Allianz darf den angezeigten Titel eines Amts umbenennen. Ein Mitglied ohne Amt hat keine Verwaltungsrechte.
_Avoid_: Job, Posten, Rang

**Präsident**:
Das Amt mit allen Rechten. Jede Allianz hat genau einen Präsidenten. Nur er darf die Allianz auflösen und das Amt übergeben.
_Avoid_: Gründer, Leader

**Vize**:
Ein Amt, das die Allianz mitverwaltet (Bewerbungen, Rauswurf, Details, Ämter unterhalb des Präsidenten). Es kann mehrere Vizes geben.
_Avoid_: Vizepräsident, Stellvertreter

**Diplomat**:
Ein Amt, das die Beziehungen zu anderen Allianzen pflegt. Es kann mehrere Diplomaten geben.
_Avoid_: Außenminister

**Bewerbung**:
Die Anfrage eines allianzlosen Spielers, einer bestimmten Allianz beizutreten. Präsident oder Vize nehmen sie an oder lehnen sie ab.

**Auflösung**:
Das endgültige Ende einer Allianz, durch den Präsidenten, durch den Austritt des letzten Mitglieds oder durch die Kontolöschung des letzten Mitglieds ohne Nachfolgekandidaten. Alle Wege teilen sich dieselbe Bereinigung.

**Automatische Nachfolge**:
Der deterministische Übergang des Präsidentenamts, wenn der Präsident ohne manuelle Übergabe wegfällt, etwa durch Kontolöschung. Es rückt der zuletzt aktive Vize nach, sonst der zuletzt aktive Diplomat, sonst das zuletzt aktive übrige Mitglied; bei Gleichstand entscheiden die längste Mitgliedschaft und die niedrigste User-ID, eine leere letzte Aktivität gilt als älteste. Ohne Kandidaten wird die **Allianz** aufgelöst. Der freiwillige Austritt eines Präsidenten mit weiteren Mitgliedern löst sie nicht aus.
_Avoid_: Erbfolge, Präsidentenwahl

**Avatar**:
Das öffentliche persönliche Bild eines **Spielers**. Fehlt es oder kann es nicht geladen werden, erscheint stattdessen das Bild seiner **Fraktion**, danach seine Namensinitiale. Ein Avatar ist kein **Banner**.
_Avoid_: Profilbanner, Wappen

**Banner**:
Das PNG-Bild einer **Allianz**, das Präsident und Vize hochladen, ersetzen und entfernen. Es erscheint als fester Kopfbereich der Allianzseite und über den Platzhalter `$ALLIANCE_BANNER` in der Beschreibung. Die Allianz hält nur eine Referenz, das Bild liegt hinter einer austauschbaren Asset-Schnittstelle.
_Avoid_: Logo, Wappen

## Kartographie & Aufklärung

**Bekannte Ebene**:
Eine Spielebene, die ein Spieler kennt und deshalb grundsätzlich öffnen darf. `KNOWN` gewährt Ebenenzugriff, bedeutet aber nicht, dass jedes Galaxiefeld oder Sternensystem persönlich entdeckt ist; die sichtbaren Felder folgen weiter den persönlichen Felderkundungsdaten.
_Avoid_: erkundete Ebene, vollständig entdeckte Ebene

**Erkundete Ebene**:
Eine dem Spieler bekannte Ebene, deren Felderkundung der tägliche Kartenzyklus nach vollständiger Abdeckung abschließt. `EXPLORED` zeigt danach alle Ebenenfelder vollständig auf der Karte, auch wenn der Zyklus die persönlichen Felderkundungsdaten entfernt hat. Es erzeugt keine persönliche **Systementdeckung** und öffnet keinen geschützten **Systemeintrag**.
_Avoid_: bekannte Ebene (wenn vollständig erkundet gemeint ist), entdeckte Systeme

**Systementdeckung**:
Die persönliche, dauerhafte Kenntnis eines konkreten Sternensystems. Sie entsteht ausschließlich durch erfolgreich abgeschlossene **Astrometrie** eines eigenen Schiffs und berechtigt zum geschützten **Systemeintrag**. Sie wird nicht innerhalb einer **Allianz** geteilt.
_Avoid_: Systemexploration, Systemfreischaltung

**Astrometrie**:
Die persönliche, systemgebundene Kartographie eines noch nicht entdeckten Sternensystems. Ein Spieler legt mit einem qualifizierten eigenen Schiff einen **Kartographieplan** an, arbeitet dessen **Messpunkte** beim Anflug ab und schließt ihn über die **Finalisierung** ab. Erst deren erfolgreicher Abschluss erzeugt für den Spieler eine **Systementdeckung**; Abbruch oder Fehlschlag erzeugen keine.
_Avoid_: Systemscan, Fernkartographie

**Astrometrie-Labor**:
Das konkrete aktivierbare Schiffssystem `Astrometrie-Labor`. Ein eigenes Schiff ist für die Kartographie nur qualifiziert, wenn sein Labor sowie Kurz- und Langstreckensensoren aktiv und intakt sind. Die Aktivierung kostet 1 EPS; solange das Labor aktiv ist, kostet es je Haupttick 1 EPS.
_Avoid_: generischer Spezialslot, Astrometrie-Fähigkeit

**Kartographieplan**:
Der persistierte Fortschritt eines Spielers für genau ein Ziel: ein Sternensystem oder eine Kartenregion (**Regionskartographie**). Er gehört weder einem bestimmten Schiff noch einer **Allianz** und durchläuft `PLANNABLE → PLANNED → MEASURED → FINISHING → DONE`.
_Avoid_: Schiffsauftrag, Kartographiejob

**Messpunkt**:
Eine beim Planen gespeicherte Feldreferenz eines **Kartographieplans**. Ein qualifiziertes eigenes Schiff arbeitet einen verbleibenden Messpunkt ausschließlich beim tatsächlichen Anflug ab. Die Messpunktphase sperrt Navigation nicht und belohnt jeden erreichten Messpunkt mit 1 Prestige. Die kanonische STU-Belohnung von Crew-Erfahrung fehlt in SWU, weil keine Crew-XP-Infrastruktur existiert; dies ist eine offene STU-Paritätslücke.
_Avoid_: Wegpunkt, Scanpunkt

**Finalisierung**:
Der kostenpflichtige, drei Hauptticks dauernde Abschluss eines **Kartographieplans** nach allen **Messpunkten**. Erst eine erfolgreiche Finalisierung erzeugt die persönliche **Systementdeckung** und 10 Prestige. Währenddessen ist nur das finalisierende Schiff für Navigation und Reparaturen gesperrt; ein Abbruch setzt den Plan auf `MEASURED` zurück.
_Avoid_: Sofortabschluss, Systemscan

**Regionskartographie**:
Ein **Kartographieplan**, dessen Ziel die Kartenregion des aktuellen Galaxiefelds ist (wie STU `AstronomicalEntry` mit `region_id`). Er nutzt denselben Lebenszyklus wie die Systemkartographie. Seine **Messpunkte** sind zufällig 25 % (aufgerundet) der passierbaren Felder der Region ohne `NO_MEASUREPOINT`, ohne das aktuelle Feld. Die erfolgreiche **Finalisierung** erzeugt die **Regionsentdeckung** und 5 Prestige.
_Avoid_: Sektorscan, Regionsscan

**Regionsentdeckung**:
Das persönliche, dauerhafte Wissen eines Spielers über eine Kartenregion. Es entsteht ausschließlich durch eine erfolgreich abgeschlossene **Regionskartographie**, höchstens einmal je Spieler und Region, nie durch bloßes Betreten. Es schaltet den Regionseintrag in der Datenbankkategorie „Regionen“ frei.
_Avoid_: Regionsbesuch, Regionskenntnis

**Systemeintrag**:
Die nicht-taktische, geschützte Datenbankansicht eines persönlich entdeckten Sternensystems. Sie zeigt aktuelle Systemdaten und die jeweils neuesten zugänglichen **Kolonie-Scans**, erlaubt aber keine Fernaktionen.
_Avoid_: Systemdatenbank, Systemprofil

**Kolonie-Scan**:
Das gespeicherte Aufklärungswissen, das einem Scanner gehört. Der Scanner liest und löscht seinen Scan; aktuelle Mitglieder derselben **Allianz** lesen ihn dynamisch, ohne Eigentum oder Löschrecht zu erhalten. Nach Ende der gemeinsamen Allianzmitgliedschaft entfällt der Zugriff auf fremde Scans sofort.
_Avoid_: Allianzscan, geteilter Systemscan

**Scan-Snapshot**:
Der historische Zustand, den ein **Kolonie-Scan** bei seiner Erstellung festhält, insbesondere Scanzeit, damaliger Koloniename, damaliger Besitzer, Oberfläche und Vorkommen. Davon getrennt bleiben aktuelle Systemdaten wie Raster, Feldkoordinaten, Himmelskörperbild, heutige Koloniebelegung und aktuelle Allianzmitgliedschaft.
_Avoid_: Live-Scan, aktuelle Scandaten

## Beziehungen

**Feind**:
Ein Spieler der jeweils anderen **Fraktion** oder ein Spieler derselben **Fraktion**, den ein persönlicher Kontakt als Feind markiert. Mitglieder derselben **Allianz** sind nie Feinde. Die fraktionsübergreifende Feindschaft ist grundsätzlich und hängt nicht von Diplomatie ab.

**Freund**:
Ein Spieler derselben **Fraktion**, der derselben **Allianz** angehört, mit dessen Partei die eigene eine aktive **Beziehung** mit der **Beziehungsfreigabe** „Als Freund behandeln“ hat oder den ein persönlicher Kontakt als Freund markiert bzw. über eine **Kontaktfreigabe** „Als Freund behandeln“ einseitig als Freund behandelt. Der Freigebende behandelt den Kontakt als Freund, nicht umgekehrt. Andere Fraktion und Allianzkrieg haben Vorrang vor Freigabe und Kontakt; innerhalb derselben Fraktion geht die gemeinsame Allianz vor. Eine Freund-Freigabe hat Vorrang vor dem persönlichen Feind-Kontaktmodus.

**Haltung**:
Ob ein Spieler für einen anderen **Freund**, **Feind** oder **Neutral** ist. Sie wird bei jeder Anfrage zentral aus Fraktion, Allianz, aktiven **Beziehungen** und persönlichem Kontakt abgeleitet und nie gespeichert. Anders als eine **Beziehung** besteht sie zwischen zwei Spielern, nicht zwischen Parteien.
_Avoid_: Beziehungsstatus, Relationship

**Neutral**:
Ein Spieler derselben **Fraktion**, der weder **Freund** noch **Feind** ist.

**Beziehung**:
Der diplomatische Zustand zwischen zwei verschiedenen Parteien. Parteien sind **Allianzen** oder allianzlose Spieler; zwischen Allianzen verschiedener **Fraktionen** gibt es keine Beziehung, da sie grundsätzlich **Feinde** sind.
_Avoid_: Relation, Verhältnis

**Beziehungstyp**:
Die Art einer **Beziehung**: Krieg, Frieden, Freundschaft, Bündnis, Handelsabkommen oder Vasallenschaft.
_Avoid_: Relationstyp, Vertragstyp

**Beziehungsvorschlag**:
Eine noch nicht angenommene Einladung einer Partei an eine andere, eine bestimmte **Beziehung** einzugehen. Zwischen zwei Parteien kann höchstens ein Beziehungsvorschlag bestehen.
_Avoid_: Angebot, Antrag

**Vertragswerk**:
Der gemeinsam sichtbare Beschreibungstext einer **Beziehung**. Das Vertragswerk einer aktiven Beziehung ist öffentlich; vor der Annahme sehen es nur die beteiligten Allianzen.
_Avoid_: Vertragstext

**Beziehungsfreigabe**:
Eine zusätzlich beidseitig vereinbarte Wirkung einer **Beziehung**, etwa die gegenseitige Behandlung als **Freund** oder das Teilen von Live-Kartenpositionen. Sie folgt nicht automatisch aus dem Beziehungstyp. Die unabhängige, einseitige **Kontaktfreigabe** ergänzt sie und ersetzt sie nicht; ihr Widerruf hebt eine weiter bestehende Beziehungsfreigabe nicht auf.
_Avoid_: Relationsrecht, Permission

**Kontaktfreigabe**:
Ein vom Eigentümer eines persönlichen Kontakts allein gespeichertes, jederzeit widerrufbares Recht. „Als Freund behandeln“ wirkt nur auf die **Haltung** des Freigebenden gegenüber dem Kontakt. „Live-Position teilen“ gibt ausschließlich die eigenen aktuellen Schiffspositionen des Freigebenden für diesen Kontakt preis, nicht die Positionen des Kontakts für den Freigebenden und nicht die seiner Allianz. Beide Freigaben sind unabhängig vom Kontaktmodus und standardmäßig aus. Andere Fraktion und Allianzkrieg sperren die Freigabewirkung; die gemeinsame Allianz bleibt vorrangig. Live-Freigaben gewähren keine Schiffsverwaltungsdetails, Systementdeckungen oder historischen Scans. Eingehende Positionsfreigaben und ausgehende Freund-Freigaben werden je Anfrage gebündelt aufgelöst.

**Diplomatie-Chronik**:
Die öffentliche, unveränderliche Folge abgeschlossener diplomatischer Ereignisse einer **Allianz**, beispielsweise Kriegserklärungen, Vertragsabschlüsse und Auflösungen.
_Avoid_: Allianz-Historie, Log

**Allianzchronik**:
Die nur für Mitglieder sichtbare, unveränderliche Folge interner Ereignisse einer **Allianz**, beispielsweise Beitritte, Austritte, Amtswechsel und automatische Nachfolge.
_Avoid_: Diplomatie-Chronik, Allianz-Historie, Log

**Allianzforum**:
Das nur für Mitglieder einer **Allianz** sichtbare Diskussionsforum. Es gliedert sich in **Boards**, **Themen** und **Beiträge**.
_Avoid_: Allianz-Chat, Forum (ohne Allianzbezug)

**Board**:
Ein Bereich des **Allianzforums**, der zusammengehörige **Themen** bündelt. Die Verwaltung der Boards liegt bei den Ämtern mit Verwaltungsrechten.
_Avoid_: Unterforum, Kategorie

**Thema**:
Eine Diskussion in einem **Board**, eröffnet mit dem ersten **Beitrag** und fortgeführt durch weitere Beiträge.
_Avoid_: Thread, Topic

**Beitrag**:
Ein einzelner Text innerhalb eines **Themas**. Sein Autor darf ihn bearbeiten.
_Avoid_: Post, Kommentar

**Mitgliederübersicht**:
Die nur für Mitglieder sichtbare Übersicht einer **Allianz** über Kolonien, Schiffe, Crew und **Online-Status** ihrer Mitglieder.
_Avoid_: Mitgliederliste, Memberlist

**Online-Status**:
Die Angabe, ob ein Spieler zuletzt kürzlich aktiv war. Sie ist öffentlich sichtbar, sofern der Spieler sie nicht mit `show_online_status = '0'` abschaltet (Standard: sichtbar); in der **Mitgliederübersicht** der eigenen **Allianz** bleibt sie unabhängig davon sichtbar.
_Avoid_: Präsenz

**Allianzdepot**:
Ein betriebsbereites **Versorgungsdepot** oder **Logistikzentrum**, das sein Eigentümer organisatorisch seiner aktuellen **Allianz** zuordnet. **Präsident** und **Vize** sehen Besitzer, Standort und Bestand. Austritt, Rauswurf, Auflösung und Stationslöschung lösen die Zuordnung; sie überträgt weder Eigentum noch Lade-, Steuerungs- oder Entnahmerechte.
_Avoid_: Allianz-Lager

## Stationen

**Shuttle**:
Ein kleines Schiff der Rolle SHUTTLE oder WORKBEE, dessen Rumpf als Lagerware mitgeführt werden kann. Eine **Shuttlerampe** startet es mit voller EPS-Ladung und eigener freier Crew. Aufnahme am gleichen Feld und Landung auf einer eigenen Kolonie mit aktivem Landeplatz führen Rumpf, Fracht und Crew innerhalb der jeweiligen Kapazitätsgrenzen zurück.
_Avoid_: Rettungskapsel, reine Transportware

**Shuttlerampe**:
Ein passives Laufzeitsystem zum Starten und Aufnehmen von **Shuttles** auf Schiffen und Stationen. Es verbraucht keine laufenden EPS. Shuttleplätze ergeben sich aus dem größeren Wert von Rumpfkapazität und intakter installierter Rampenkapazität; Startkosten entsprechen der vollen EPS-Ladung des gestarteten Schiffs.
_Avoid_: Hangar (für die Shuttlerampe), aktives Transportsystem

**Station**:
Ein unbeweglicher Typ von **Spacecraft** mit gemeinsamen Laufzeitsystemen, Lager, Sensorik und Kampffähigkeit. Stationsspezifische Zustände wie Bau, Dockplätze, Zugangsregeln und Reparaturen sind an dieses Spacecraft gebunden.
_Avoid_: Gebäude, Raumkörper

**Konstrukt**:
Der temporäre Bauzustand einer Station. Es entsteht aus fünf einsatzfähigen Workbees sowie Baumaterial und Duranium und wird anschließend in eine fertige **Stationsrolle** ausgebaut.
_Avoid_: Baustelle, Rohbau

**Stationsdemontage**:
Der durch einen Bestätigungscode ausgelöste, nicht abbrechbare Rückbau einer unbemannten **Station**. Die halbe Bauzeit wird nur mit ausreichend angedockten Workbees abgearbeitet. Zufällig recycelte Module gehen innerhalb der Lagergrenze an ein eigenes angedocktes Schiff; am Ende wird die Station entfernt und alle Schiffe werden abgedockt. Ein unbemanntes **Konstrukt** wird sofort entfernt.
_Avoid_: Selbstzerstörung, Werftdemontage

**Stationsrolle**:
Die Funktion einer fertigen Station: **Versorgungsdepot**, **Logistikzentrum**, **Raumwerft**, **Sensorphalanx**, **Außenposten** oder **Raumstation**. Die Rolle bestimmt insbesondere Ort, Spielerlimit, Workbee-Bedarf und Dockplätze.
_Avoid_: Stationsklasse, Rumpfrolle

**Ruine**:
Eine aufgegebene, besitzerlose und wiederbesiedelbare **Kolonie**. Ihre fertiggestellten Gebäude und ihr Lager bleiben erhalten, produzieren aber nicht weiter; laufende Vorgänge und Orbitzuweisungen werden bei der Aufgabe beendet.
_Avoid_: zurückgesetzte Kolonie, leere Kolonie

**Versorgungsdepot**:
Eine kleine Depotstation innerhalb eines Sternsystems mit großem Lager und begrenzten Dockplätzen.
_Avoid_: kleines Depot

**Logistikzentrum**:
Eine große Depotstation innerhalb eines Sternsystems. Ein Spieler darf höchstens eines besitzen.
_Avoid_: großes Depot

**Raumwerft**:
Eine Station innerhalb eines Sternsystems für Stations- und Schiffsarbeiten. Ein Spieler darf höchstens zwei besitzen.
_Avoid_: Stationswerft

**Sensorphalanx**:
Eine spezialisierte Sensorstation, die an allen zulässigen Stationsorten errichtet werden kann.
_Avoid_: Sensorstation, Phalanx

**Außenposten**:
Eine bewaffnete Station auf einer Galaxieposition außerhalb eines Sternsystems.
_Avoid_: Vorposten

**Raumstation**:
Die größte bewaffnete Stationsrolle auf der Galaxieposition eines Sternsystems.
_Avoid_: Basis

**Andocken**:
Das Belegen eines freien Dockplatzes einer Station durch ein Schiff. Eine ausdrücklich passende Zugangsverweigerung hat Vorrang vor jeder Erlaubnis; ohne passende Erlaubnis ist Andocken verboten.
_Avoid_: Anlegen, Parken

## Navigation

**Galaxieflug**:
Die feldweise Reise eines Schiffs auf der Galaxiekarte. Ein Schiff verlässt ein Sternensystem, durchfliegt konkrete Galaxiefelder und tritt am Ziel wieder in ein System ein. Feldkosten, Feldfolgen, Flugsignaturen und Aufklärung werden dabei je tatsächlich durchflogenem Feld ausgewertet.
_Avoid_: zeitbasierter Hyperraumsprung, Zeitflug

**Hyperraumroute**:
Eine sichtbare Route auf der Galaxiekarte. Sie verkürzt den Galaxieflug nicht; eine spätere Nutzung als Voraussetzung oder Zielnetz bleibt dem **Langstreckensprung** vorbehalten.
_Avoid_: Schnellreiseroute

**Langstreckensprung**:
Eine gesonderte Schiffsfähigkeit für einen unmittelbaren Sprung über große Entfernung. Sie wird ausschließlich durch das Star-Wars-Pendant zur STU-Transwarpspule eingeführt und ist nicht der normale Reiseweg zwischen Sternensystemen.
_Avoid_: Hyperraumsprung (für normalen Galaxieflug), zeitbasierter Hyperraumsprung

## Statistiken

**Haupttick**:
Der stündliche Spieltakt, in dem das Universum fortgeschrieben wird. Er ist der Messzeitpunkt jedes **Snapshots**.

**Crew-Expertise**:
Die dauerhafte Erfahrung eines individuellen Crewmitglieds je Schiffsposition. Messpunkte, Kartographieabschluss, erfolgreiche Zerstörung und abgeschlossene Reparatur erhöhen die passende Expertise; Zuweisungen zwischen Kolonie, Schiff und später Rettungskapsel verändern sie nicht.

**Crewrang**:
Die persönliche Rangstufe eines Crewmitglieds. Kadett, Crewmitglied, Fähnrich, Unterleutnant, Leutnant und Oberleutnant folgen automatisch der höchsten Expertise; Commander, Captain, Commodore und Admiral erfordern eine ausdrückliche Beförderung und unterliegen Spielerlimits.

**Statistik**:
Der Zeitverlauf einer Kennzahl des gesamten Universums, etwa Spielerzahl oder Schiffsanzahl, in der Datenbank für alle angemeldeten Spieler sichtbar. Sie enthält nur Aggregate, keine Einzeldaten, und beginnt ab ihrer Einführung ohne zurückgerechnete Historie.
_Avoid_: Highscore (das ist eine Rangliste einzelner Spieler)

**Snapshot**:
Der je **Haupttick** festgehaltene Wert einer **Statistik**, gegebenenfalls aufgeteilt in Serien wie Fraktionen. Snapshots werden unbegrenzt aufbewahrt.
_Avoid_: Messwert, Datenpunkt

**Zeiteinheit**:
Die Auflösung, in der eine **Statistik** betrachtet wird: Tick, Täglich, Wöchentlich oder Monatlich. Größere Einheiten fassen mehrere **Snapshots** zusammen.

**Aktiver Spieler**:
Ein **Spieler** mit Aktivität in den letzten 24 Stunden. Ein nicht aktiver Spieler gilt als **inaktiv**, es sei denn, er befindet sich im Urlaub; Urlauber werden getrennt gezählt.
_Avoid_: Online-Spieler
