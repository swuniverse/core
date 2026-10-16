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
Der persistierte Fortschritt eines Spielers für ein konkretes Sternensystem. Er gehört weder einem bestimmten Schiff noch einer **Allianz** und durchläuft `PLANNABLE → PLANNED → MEASURED → FINISHING → DONE`.
_Avoid_: Schiffsauftrag, Kartographiejob

**Messpunkt**:
Eine beim Planen gespeicherte Feldreferenz eines **Kartographieplans**. Ein qualifiziertes eigenes Schiff arbeitet einen verbleibenden Messpunkt ausschließlich beim tatsächlichen Anflug ab. Die Messpunktphase sperrt Navigation nicht und belohnt jeden erreichten Messpunkt mit 1 Prestige. Die kanonische STU-Belohnung von Crew-Erfahrung fehlt in SWU, weil keine Crew-XP-Infrastruktur existiert; dies ist eine offene STU-Paritätslücke.
_Avoid_: Wegpunkt, Scanpunkt

**Finalisierung**:
Der kostenpflichtige, drei Hauptticks dauernde Abschluss eines **Kartographieplans** nach allen **Messpunkten**. Erst eine erfolgreiche Finalisierung erzeugt die persönliche **Systementdeckung** und 10 Prestige. Währenddessen ist nur das finalisierende Schiff für Navigation und Reparaturen gesperrt; ein Abbruch setzt den Plan auf `MEASURED` zurück.
_Avoid_: Sofortabschluss, Systemscan

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
Ein Spieler der jeweils anderen **Fraktion**. Diese Feindschaft ist grundsätzlich und hängt nicht von Diplomatie ab.

**Freund**:
Ein Spieler derselben **Fraktion**, der derselben **Allianz** angehört, dessen Allianz mit der eigenen eine aktive **Beziehung** mit der **Beziehungsfreigabe** „Als Freund behandeln“ hat oder den ein persönlicher Kontakt als Freund markiert. Ein Allianzkrieg hat Vorrang vor Freigabe und Kontakt, nicht aber vor derselben Allianz.

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
Eine zusätzlich vereinbarte Wirkung einer **Beziehung**, etwa die gegenseitige Behandlung als **Freund** oder das Teilen von Live-Kartenpositionen. Sie folgt nicht automatisch aus dem Beziehungstyp.
_Avoid_: Relationsrecht, Permission

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
Die Angabe, ob ein Mitglied zuletzt kürzlich aktiv war. Sie ist nur für Mitglieder derselben **Allianz** sichtbar.
_Avoid_: Präsenz

**Allianzdepot**:
Eine geeignete Depotstation, die ihr Eigentümer organisatorisch seiner **Allianz** zuordnet. Die Zuordnung überträgt weder Eigentum noch Entnahmerechte.
_Avoid_: Allianz-Lager
